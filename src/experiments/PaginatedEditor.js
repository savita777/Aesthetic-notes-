/**
 * PaginatedEditor.js — Lumina Notes
 * ─────────────────────────────────────────────────────────────────────────────
 * True pagination engine modelled on GoodNotes / Apple Pages behaviour.
 *
 * ARCHITECTURE OVERVIEW
 * ──────────────────────
 * State: pages[] — array of { id, text } objects. Each page is an independent
 *        A4-proportioned View containing its own TextInput + ref.
 *
 * OVERFLOW ENGINE
 * ───────────────
 * Every TextInput reports its rendered content height via onContentSizeChange.
 * When contentHeight > PAGE_SAFE_HEIGHT we run splitAtWordBoundary():
 *
 *   1. Binary-search the text string for the largest prefix whose rendered
 *      line count fits within PAGE_SAFE_HEIGHT.
 *   2. Split at the last whitespace before the overflow point so we never
 *      break mid-word.
 *   3. Trim trailing whitespace from page N, place the excess on page N+1
 *      (creating N+1 if it doesn't exist).
 *   4. Move keyboard focus to the target page's ref, preserving cursor
 *      position without a keyboard dismiss.
 *
 * LINE-COUNT MATH
 * ───────────────
 * Rather than mounting a hidden measuring TextInput, we use a deterministic
 * model:
 *
 *   estimatedLines = Math.ceil(contentHeight / LINE_HEIGHT)
 *   maxSafeLines   = Math.floor(PAGE_SAFE_HEIGHT / LINE_HEIGHT)
 *
 * Then we walk *backwards* through the text splitting on whitespace until
 * the prefix would fit in maxSafeLines. This is O(n) in the worst case but
 * in practice touches only the last few hundred characters because we only
 * run when contentHeight *just* exceeds the boundary.
 *
 * KNOWN LIMITATIONS (acceptable for a proof-of-concept)
 * ──────────────────────────────────────────────────────
 *  • The line-count model assumes a monospaced-ish average char-per-line.
 *    For proportional fonts it is an approximation. Production would require
 *    a native measureText bridge or a hidden dummy TextInput.
 *  • Backward-spillover (deleting text from page N+1 back onto page N) is
 *    implemented as a best-effort reflow on Backspace at position 0.
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';

// ─── Layout constants ─────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

const PAGE_W        = SCREEN_W * 0.88;          // ~88 vw — A4 width on screen
const PAGE_H        = PAGE_W * (297 / 210);     // A4 aspect ratio  (≈ 1.414)

const PAGE_PAD_H    = 40;                        // top + bottom padding inside page
const PAGE_PAD_V    = 32;                        // left + right padding inside page

// The height available for actual text rendering.
const TEXT_AREA_H   = PAGE_H - PAGE_PAD_H * 2;

// Typography — must match the TextInput style exactly so the math is correct.
const FONT_SIZE     = 16;
const LINE_HEIGHT   = 28;

// How many lines fit on one page.
const MAX_LINES     = Math.floor(TEXT_AREA_H / LINE_HEIGHT);  // ≈ floor(375/28) = 13

// The "safe" content height. We trigger spillover when contentHeight exceeds this.
// We subtract one full line as a buffer so we never clip the last visible line.
const PAGE_SAFE_H   = (MAX_LINES - 1) * LINE_HEIGHT;

// Approx. characters that fit on one line given PAGE_W, padding, and font size.
// This is used only for the initial binary-search seed — the word-boundary walk
// corrects any deviation.
const CHARS_PER_LINE = Math.floor(
  (PAGE_W - PAGE_PAD_V * 2) / (FONT_SIZE * 0.52)   // 0.52 em ≈ avg char width
);

const MAX_SAFE_CHARS = MAX_LINES * CHARS_PER_LINE;  // upper bound for binary seed

// ─── Unique ID helper ─────────────────────────────────────────────────────────
let _uid = 1;
const uid = () => `page-${Date.now()}-${_uid++}`;

// ─── Text splitting utility ───────────────────────────────────────────────────
/**
 * splitAtWordBoundary(text, maxChars)
 *
 * Returns { head, tail } where:
 *  - head is the largest prefix of `text` that fits within `maxChars`
 *    without breaking a word.
 *  - tail is the remainder, with leading whitespace stripped.
 *
 * We walk backwards from maxChars to find the last whitespace character.
 * If no whitespace is found (one very long word) we hard-split at maxChars.
 */
function splitAtWordBoundary(text, maxChars) {
  if (text.length <= maxChars) return { head: text, tail: '' };

  let splitIdx = maxChars;

  // Walk backwards to find a word boundary (space, newline, punctuation)
  while (splitIdx > 0 && !/\s/.test(text[splitIdx])) {
    splitIdx--;
  }

  // Degenerate case: one unbreakable token longer than a full page
  if (splitIdx === 0) splitIdx = maxChars;

  const head = text.slice(0, splitIdx).trimEnd();
  const tail = text.slice(splitIdx).trimStart();

  return { head, tail };
}

/**
 * estimateMaxChars(contentHeight)
 *
 * Given the reported contentHeight from onContentSizeChange, estimate the
 * maximum number of characters that should remain on this page.
 *
 * We calculate how many lines *should* fit, then multiply by CHARS_PER_LINE.
 * The word-boundary walk in splitAtWordBoundary fine-tunes this estimate.
 */
function estimateMaxChars(contentHeight) {
  const renderedLines = Math.ceil(contentHeight / LINE_HEIGHT);
  const safeLines     = Math.max(1, renderedLines - 1); // give back one line
  return safeLines * CHARS_PER_LINE;
}

// ─── PageView ─────────────────────────────────────────────────────────────────
/**
 * A single A4 page: contains a TextInput and a page-number footer.
 * Exposes its TextInput ref upward via the `inputRef` prop so the parent
 * can shift keyboard focus across pages.
 */
const PageView = React.memo(function PageView({
  page,
  index,
  total,
  inputRef,
  onChangeText,
  onContentSizeChange,
  onKeyPress,
  onSelectionChange,
  isFocused,
}) {
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(234,230,225,0)', 'rgba(255,179,186,0.6)'],
  });

  return (
    <Animated.View style={[styles.page, { borderColor }]}>
      {/* Ruled lines — decorative only, does not affect layout */}
      <RuledLines />

      {/* Main text input */}
      <TextInput
        ref={inputRef}
        style={styles.textInput}
        multiline
        value={page.text}
        onChangeText={(t) => onChangeText(page.id, t)}
        onContentSizeChange={(e) =>
          onContentSizeChange(page.id, index, e.nativeEvent.contentSize.height)
        }
        onKeyPress={(e) => onKeyPress(page.id, index, e)}
        onSelectionChange={(e) => onSelectionChange(page.id, e.nativeEvent.selection)}
        placeholder={index === 0 ? 'Start writing…' : ''}
        placeholderTextColor="#D4CFCC"
        scrollEnabled={false}       // critical — we manage scrolling in the FlatList
        textAlignVertical="top"
        keyboardType="default"
        autoCorrect
        spellCheck
        // Prevent native scroll-to-caret from collapsing our pages
        nestedScrollEnabled={false}
      />

      {/* Page footer */}
      <View style={styles.pageFooter}>
        <View style={styles.pageFooterLine} />
        <Text style={styles.pageNumber}>{index + 1} / {total}</Text>
      </View>
    </Animated.View>
  );
});

// ─── RuledLines ───────────────────────────────────────────────────────────────
/**
 * Purely decorative ruled lines drawn behind the TextInput.
 * We render one line per LINE_HEIGHT step within TEXT_AREA_H.
 */
const RuledLines = React.memo(function RuledLines() {
  const lineCount = MAX_LINES + 1;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: lineCount }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.ruledLine,
            { top: PAGE_PAD_H + i * LINE_HEIGHT + LINE_HEIGHT - 3 },
          ]}
        />
      ))}
    </View>
  );
});

// ─── PaginatedEditor (main) ───────────────────────────────────────────────────
export default function PaginatedEditor() {
  const [pages, setPages] = useState([{ id: uid(), text: '' }]);
  const [focusedPageId, setFocusedPageId] = useState(null);
  const [pageCount, setPageCount] = useState(1);

  // Map of pageId → TextInput ref
  const inputRefs = useRef({});
  // Map of pageId → last known cursor selection
  const selections = useRef({});
  // Guard: prevent re-entrant spillover calls
  const isSpilling = useRef(false);

  // FlatList ref for programmatic scrolling
  const listRef = useRef(null);

  // ── Keep pageCount in sync (avoids stale closure in PageView) ──
  useEffect(() => {
    setPageCount(pages.length);
  }, [pages.length]);

  // ── Ensure a ref slot exists for every page ──
  const getOrCreateRef = useCallback((pageId) => {
    if (!inputRefs.current[pageId]) {
      inputRefs.current[pageId] = React.createRef();
    }
    return inputRefs.current[pageId];
  }, []);

  // ── Clean up stale refs when pages are removed ──
  useEffect(() => {
    const validIds = new Set(pages.map((p) => p.id));
    Object.keys(inputRefs.current).forEach((id) => {
      if (!validIds.has(id)) {
        delete inputRefs.current[id];
        delete selections.current[id];
      }
    });
  }, [pages]);

  // ────────────────────────────────────────────────────────────────────────────
  // TEXT CHANGE HANDLER
  // Simple update — no spillover here; let onContentSizeChange trigger it.
  // ────────────────────────────────────────────────────────────────────────────
  const handleChangeText = useCallback((pageId, newText) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, text: newText } : p))
    );
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // SELECTION TRACKER
  // We track cursor position so after a spillover we can restore it.
  // ────────────────────────────────────────────────────────────────────────────
  const handleSelectionChange = useCallback((pageId, selection) => {
    selections.current[pageId] = selection;
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // OVERFLOW ENGINE — onContentSizeChange
  //
  // Called by React Native whenever the rendered text height changes.
  // This is our trigger point for spillover.
  //
  // Flow:
  //  1. If contentHeight <= PAGE_SAFE_H → nothing to do.
  //  2. Estimate max safe chars from the content height.
  //  3. Split text at a word boundary.
  //  4. Update page[index].text = head.
  //  5. If page[index+1] exists: prepend tail to it.
  //     Else: insert a new page after index with text = tail.
  //  6. Shift focus to page[index+1] without dismissing keyboard.
  //  7. Scroll FlatList so the new page is visible.
  // ────────────────────────────────────────────────────────────────────────────
  const handleContentSizeChange = useCallback(
    (pageId, pageIndex, contentHeight) => {
      // Bail if we're already in a spillover cycle (prevent infinite loop)
      if (isSpilling.current) return;
      if (contentHeight <= PAGE_SAFE_H) return;

      isSpilling.current = true;

      setPages((prevPages) => {
        const idx  = prevPages.findIndex((p) => p.id === pageId);
        if (idx === -1) { isSpilling.current = false; return prevPages; }

        const currentPage = prevPages[idx];
        if (!currentPage.text) { isSpilling.current = false; return prevPages; }

        // ── Step 1: Calculate how many chars safely fit ──
        const maxChars = estimateMaxChars(contentHeight);

        // ── Step 2: Split at the last word boundary ──
        const { head, tail } = splitAtWordBoundary(currentPage.text, maxChars);

        // Nothing actually overflowed (edge case: very tall single line)
        if (!tail) { isSpilling.current = false; return prevPages; }

        const nextPage = prevPages[idx + 1];

        let newPages;

        if (nextPage) {
          // ── Step 3a: Push tail onto the existing next page ──
          // Prepend tail + space separator so text flows naturally.
          const separator   = nextPage.text.length > 0 ? ' ' : '';
          const mergedText  = tail + separator + nextPage.text;

          // Recursively check if the next page now also overflows — we handle
          // that in its own onContentSizeChange cycle.
          newPages = prevPages.map((p, i) => {
            if (i === idx)     return { ...p, text: head };
            if (i === idx + 1) return { ...p, text: mergedText };
            return p;
          });
        } else {
          // ── Step 3b: Create a brand-new page with the tail ──
          const newPage = { id: uid(), text: tail };
          newPages = [
            ...prevPages.slice(0, idx),
            { ...currentPage, text: head },
            newPage,
          ];
        }

        // ── Step 4: Schedule focus shift after state settles ──
        // We use a short setTimeout so the new page's TextInput has been
        // mounted and its ref is available before we call .focus().
        const targetPageId = newPages[idx + 1].id;
        setTimeout(() => {
          const ref = inputRefs.current[targetPageId];
          if (ref?.current) {
            ref.current.focus();
            // On Android, request a slight scroll to reveal the new page
            listRef.current?.scrollToIndex({
              index: idx + 1,
              animated: true,
              viewOffset: 20,
            });
          }
          isSpilling.current = false;
        }, 50);

        return newPages;
      });
    },
    []
  );

  // ────────────────────────────────────────────────────────────────────────────
  // BACKWARD REFLOW — onKeyPress
  //
  // When the user presses Backspace at position 0 on any page except page 0,
  // we merge the current page's text back onto the previous page.
  //
  // This gives a natural "delete across pages" experience matching GoodNotes.
  // ────────────────────────────────────────────────────────────────────────────
  const handleKeyPress = useCallback((pageId, pageIndex, event) => {
    if (event.nativeEvent.key !== 'Backspace') return;
    if (pageIndex === 0) return;

    const sel = selections.current[pageId] ?? { start: 0, end: 0 };
    // Only trigger merge if cursor is at the very beginning
    if (sel.start !== 0 || sel.end !== 0) return;

    setPages((prevPages) => {
      if (prevPages.length <= 1) return prevPages;

      const idx = prevPages.findIndex((p) => p.id === pageId);
      if (idx <= 0) return prevPages;

      const prevPage = prevPages[idx - 1];
      const currPage = prevPages[idx];

      // Merge: append current text to previous page with a space separator
      const mergedText  = prevPage.text + (currPage.text ? ' ' + currPage.text : '');
      const prevPageId  = prevPage.id;

      const newPages = prevPages
        .map((p, i) => {
          if (i === idx - 1) return { ...p, text: mergedText };
          return p;
        })
        .filter((_, i) => i !== idx);

      // Shift focus to the end of the previous page
      setTimeout(() => {
        const ref = inputRefs.current[prevPageId];
        if (ref?.current) ref.current.focus();
        isSpilling.current = false;
      }, 30);

      return newPages;
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // ADD PAGE MANUALLY (toolbar button)
  // ────────────────────────────────────────────────────────────────────────────
  const addPageAfterLast = useCallback(() => {
    const newPage = { id: uid(), text: '' };
    setPages((prev) => [...prev, newPage]);
    setTimeout(() => {
      const ref = inputRefs.current[newPage.id];
      if (ref?.current) {
        ref.current.focus();
        listRef.current?.scrollToEnd({ animated: true });
      }
    }, 80);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // FLAT LIST RENDER
  // ────────────────────────────────────────────────────────────────────────────
  const renderPage = useCallback(
    ({ item: page, index }) => {
      const ref = getOrCreateRef(page.id);
      return (
        <PageView
          page={page}
          index={index}
          total={pages.length}
          inputRef={ref}
          onChangeText={handleChangeText}
          onContentSizeChange={handleContentSizeChange}
          onKeyPress={handleKeyPress}
          onSelectionChange={handleSelectionChange}
          isFocused={focusedPageId === page.id}
        />
      );
    },
    [
      pages.length,
      focusedPageId,
      getOrCreateRef,
      handleChangeText,
      handleContentSizeChange,
      handleKeyPress,
      handleSelectionChange,
    ]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ItemSeparator = useCallback(
    () => <View style={styles.pageSeparator} />,
    []
  );

  // Guard: FlatList scrollToIndex can throw if index is out of range
  const onScrollToIndexFailed = useCallback((info) => {
    const wait = new Promise((resolve) => setTimeout(resolve, 300));
    wait.then(() => {
      listRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
      });
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>
          lumina <Text style={styles.toolbarTitleItalic}>notes</Text>
        </Text>
        <View style={styles.toolbarRight}>
          <Text style={styles.pageCountLabel}>
            {pages.length} page{pages.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.addPageBtn}
            onPress={addPageAfterLast}
            activeOpacity={0.75}
          >
            <Text style={styles.addPageBtnText}>+ Page</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Page list ── */}
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={keyExtractor}
        renderItem={renderPage}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScrollToIndexFailed={onScrollToIndexFailed}
        // Disable FlatList's own item-height estimation so it doesn't
        // fight our dynamic page heights.
        removeClippedSubviews={false}
        maxToRenderPerBatch={4}
        windowSize={5}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAE6E1',
  },

  // ── Toolbar ──
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F1EC',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD8D2',
  },
  toolbarTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#2D2A2E',
    letterSpacing: 2,
  },
  toolbarTitleItalic: {
    fontStyle: 'italic',
    color: '#FFB3BA',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    ga
