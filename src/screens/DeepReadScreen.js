// DeepReadScreen.js
// "Deep Reading" Mode — Split-screen PDF viewer + Rich Notes
// Stealth Mode / Dark Launch — ready to wire into navigation
//
// Props (when hooked into navigator):
//   route.params.pdfUri  — URI of the PDF to display (optional)
//   route.params.note    — existing note object to pre-load (optional)
//   navigation           — standard RN navigation object

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';

// ── When you're ready to enable real PDF rendering, swap this comment:
// import Pdf from 'react-native-pdf';           // npx expo install react-native-pdf
// import Source from 'react-native-pdf';

const { width: W, height: H } = Dimensions.get('window');

// ─── Layout ──────────────────────────────────────────────────────────────────
const SAFE_TOP       = Platform.OS === 'ios' ? 52 : 36;
const NAV_BAR_H      = 52;
const DIVIDER_H      = 36;
const USABLE_H       = H - SAFE_TOP - NAV_BAR_H - DIVIDER_H;
const MIN_PANEL_FRAC = 0.18;   // smallest either panel can get (fraction of USABLE_H)
const DEFAULT_SPLIT  = 0.50;   // 50 / 50 on first open

// ─── Tokens ──────────────────────────────────────────────────────────────────
const L = {
  bg:          '#F8F6F2',
  surface:     '#FFFFFF',
  card:        '#F2EFE9',
  border:      '#E8E3DB',
  accent:      '#B5838D',
  accentSoft:  '#F2E8EA',
  text:        '#2D2A2E',
  muted:       '#9B9099',
  dividerBg:   'rgba(248,246,242,0.95)',
  shadow:      '#2D2A2E',
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF Panel
// Placeholder that looks like a document page. Swap the inner content
// for <Pdf source={{ uri: pdfUri }} style={StyleSheet.absoluteFill} />
// once react-native-pdf is installed.
// ─────────────────────────────────────────────────────────────────────────────
function PdfPanel({ pdfUri, height }) {
  return (
    <View style={[pdfStyles.container, { height }]}>
      {/* Toolbar strip */}
      <View style={pdfStyles.toolbar}>
        <TouchableOpacity style={pdfStyles.toolBtn}>
          <Text style={pdfStyles.toolIcon}>◀</Text>
        </TouchableOpacity>
        <Text style={pdfStyles.pageLabel}>Page 1 of 24</Text>
        <TouchableOpacity style={pdfStyles.toolBtn}>
          <Text style={pdfStyles.toolIcon}>▶</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={pdfStyles.toolBtn}>
          <Text style={pdfStyles.toolIcon}>⊕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pdfStyles.toolBtn}>
          <Text style={pdfStyles.toolIcon}>⊖</Text>
        </TouchableOpacity>
      </View>

      {/* Document area */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={pdfStyles.docArea}
        showsVerticalScrollIndicator={false}
      >
        {pdfUri ? (
          // ── Real PDF ──────────────────────────────────────────────────────
          // Uncomment when react-native-pdf is installed:
          // <Pdf
          //   source={{ uri: pdfUri, cache: true }}
          //   style={{ flex: 1, width: W }}
          //   onLoadComplete={(pages) => console.log(`PDF loaded: ${pages} pages`)}
          //   onError={(err) => console.warn('PDF error:', err)}
          // />
          <View style={pdfStyles.mockPage}>
            <Text style={pdfStyles.mockTitle}>Document Loaded</Text>
            <Text style={pdfStyles.mockBody}>{pdfUri}</Text>
          </View>
        ) : (
          // ── Placeholder ───────────────────────────────────────────────────
          <View style={pdfStyles.mockPage}>
            {/* Simulated document header */}
            <View style={pdfStyles.mockDocHeader}>
              <View style={[pdfStyles.mockBlock, { width: '60%', height: 14, marginBottom: 6 }]} />
              <View style={[pdfStyles.mockBlock, { width: '40%', height: 10, opacity: 0.4 }]} />
            </View>
            {/* Simulated body lines */}
            {[...Array(14)].map((_, i) => (
              <View
                key={i}
                style={[
                  pdfStyles.mockLine,
                  { width: i % 5 === 4 ? '72%' : '100%', opacity: 0.9 - i * 0.03 },
                ]}
              />
            ))}
            <View style={pdfStyles.mockSectionBreak} />
            {[...Array(10)].map((_, i) => (
              <View
                key={`b${i}`}
                style={[
                  pdfStyles.mockLine,
                  { width: i % 4 === 3 ? '80%' : '100%' },
                ]}
              />
            ))}
            <Text style={pdfStyles.placeholderHint}>
              PDF viewer area — connect a URI via{'\n'}route.params.pdfUri
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const pdfStyles = StyleSheet.create({
  container: {
    backgroundColor: L.card,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: L.border,
    backgroundColor: L.surface,
    gap: 4,
  },
  toolBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: L.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIcon: { fontSize: 13, color: L.muted },
  pageLabel: { fontSize: 12, color: L.muted, fontWeight: '600', marginHorizontal: 8 },
  docArea: { padding: 20 },
  mockPage: {
    backgroundColor: L.surface,
    borderRadius: 8,
    padding: 24,
    minHeight: 400,
    shadowColor: L.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mockDocHeader: { marginBottom: 20 },
  mockTitle: { fontSize: 15, fontWeight: '700', color: L.text, marginBottom: 6 },
  mockBody:  { fontSize: 12, color: L.muted },
  mockBlock: { backgroundColor: L.text, borderRadius: 3 },
  mockLine: {
    height: 9,
    backgroundColor: L.border,
    borderRadius: 4,
    marginBottom: 10,
  },
  mockSectionBreak: {
    height: 1,
    backgroundColor: L.border,
    marginVertical: 16,
  },
  placeholderHint: {
    marginTop: 24,
    fontSize: 11,
    color: L.muted,
    textAlign: 'center',
    lineHeight: 17,
    fontStyle: 'italic',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes Panel
// Simplified placeholder that mirrors the NoteScreen layout without the full
// RichEditor dependency. Wire in <RichEditor ref={...} /> where indicated.
// ─────────────────────────────────────────────────────────────────────────────
function NotesPanel({ height, note }) {
  return (
    <View style={[notesStyles.container, { height }]}>
      {/* Panel label */}
      <View style={notesStyles.panelHeader}>
        <Text style={notesStyles.panelLabel}>📝 Notes</Text>
        <Text style={notesStyles.linkedLabel}>Linked to this reading</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={notesStyles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={notesStyles.noteTitle} numberOfLines={1}>
          {note?.title || 'Deep Reading Notes'}
        </Text>

        {/* ── RichEditor slot ───────────────────────────────────────────────
            When wiring into production, replace this placeholder with:

            import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

            <RichEditor
              ref={richEditorRef}
              initialContentHTML={content}
              onChange={handleEditorChange}
              editorStyle={{
                backgroundColor: '#F8F6F2',
                color: '#2D2A2E',
                cssText: RICH_EDITOR_CSS,  // import from NoteScreen.js
              }}
              placeholder="Type your reading notes here..."
              style={{ flex: 1, minHeight: 200 }}
              scrollEnabled={false}
              useContainer={false}
            />
        ─────────────────────────────────────────────────────────────────── */}
        <View style={notesStyles.editorPlaceholder}>
          <View style={notesStyles.cursorLine}>
            <View style={notesStyles.cursor} />
          </View>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={[notesStyles.draftLine, { width: i === 4 ? '55%' : '100%' }]} />
          ))}
          <Text style={notesStyles.editorHint}>
            Rich Text Editor mounts here{'\n'}(react-native-pell-rich-editor)
          </Text>
        </View>
      </ScrollView>

      {/* Minimal toolbar strip */}
      <View style={notesStyles.miniToolbar}>
        {['B', 'I', 'H1', 'H2', '"', '•'].map((action) => (
          <TouchableOpacity key={action} style={notesStyles.toolChip}>
            <Text style={notesStyles.toolChipText}>{action}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={notesStyles.aiChip}>
          <Text style={notesStyles.aiChipText}>✦ AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const notesStyles = StyleSheet.create({
  container: {
    backgroundColor: L.bg,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: L.border,
  },
  panelLabel:   { fontSize: 13, fontWeight: '700', color: L.text },
  linkedLabel:  { fontSize: 11, color: L.muted },
  scrollContent: { padding: 16, paddingBottom: 24 },
  noteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: L.text,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  editorPlaceholder: {
    minHeight: 180,
    padding: 4,
  },
  cursorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cursor: {
    width: 2,
    height: 18,
    backgroundColor: L.accent,
    borderRadius: 1,
  },
  draftLine: {
    height: 8,
    backgroundColor: L.border,
    borderRadius: 4,
    marginBottom: 10,
    opacity: 0.7,
  },
  editorHint: {
    marginTop: 16,
    fontSize: 11,
    color: L.muted,
    textAlign: 'center',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  miniToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    borderTopColor: L.border,
    backgroundColor: L.surface,
    gap: 6,
  },
  toolChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: L.card,
    borderRadius: 8,
  },
  toolChipText: { fontSize: 12, fontWeight: '700', color: L.text },
  aiChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: L.accentSoft,
    borderRadius: 10,
  },
  aiChipText: { fontSize: 12, fontWeight: '700', color: L.accent },
});

// ─────────────────────────────────────────────────────────────────────────────
// Draggable Divider
// The signature element: a frosted-glass band with a pill handle.
// The "DRAG" label fades out after the first successful drag — like a premium
// appliance instruction that trusts the user after one use.
// ─────────────────────────────────────────────────────────────────────────────
function DraggableDivider({ onMove, hasBeenDragged }) {
  const labelOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasBeenDragged) {
      Animated.timing(labelOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [hasBeenDragged]);

  return (
    <View style={dividerStyles.band}>
      {/* Left hairline */}
      <View style={dividerStyles.hairline} />

      {/* Pill handle — the tactile anchor point */}
      <View style={dividerStyles.pill}>
        <View style={dividerStyles.pillGroove} />
        <View style={dividerStyles.pillGroove} />
        <View style={dividerStyles.pillGroove} />
      </View>

      {/* "DRAG" label — fades after first use */}
      <Animated.Text style={[dividerStyles.dragLabel, { opacity: labelOpacity }]}>
        DRAG
      </Animated.Text>

      {/* Right hairline */}
      <View style={dividerStyles.hairline} />
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  band: {
    height: DIVIDER_H,
    backgroundColor: L.dividerBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: L.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    // Subtle shadow on both edges
    shadowColor: L.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  hairline: {
    flex: 1,
    height: 1,
    backgroundColor: L.border,
    opacity: 0.6,
  },
  pill: {
    width: 48,
    height: 22,
    borderRadius: 11,
    backgroundColor: L.surface,
    borderWidth: 1,
    borderColor: L.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: L.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pillGroove: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: L.border,
  },
  dragLabel: {
    fontSize: 6,
    letterSpacing: 3,
    color: L.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    position: 'absolute',
    bottom: 3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DeepReadScreen — the main export
// ─────────────────────────────────────────────────────────────────────────────
export default function DeepReadScreen({ route, navigation }) {
  const pdfUri = route?.params?.pdfUri || null;
  const note   = route?.params?.note   || null;

  // splitFraction: 0 = all PDF, 1 = all notes. Clamped to MIN_PANEL_FRAC.
  const [splitFraction, setSplitFraction] = useState(DEFAULT_SPLIT);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  // Track the live drag position with a ref so PanResponder doesn't stale-close
  const splitRef = useRef(DEFAULT_SPLIT);

  // Animated value drives visual position during gesture (no setState lag)
  const dragY = useRef(new Animated.Value(DEFAULT_SPLIT * USABLE_H)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: () => {
        // Anchor the animated value at the current committed position
        dragY.setOffset(splitRef.current * USABLE_H);
        dragY.setValue(0);
        setHasBeenDragged(true);
      },

      onPanResponderMove: (_, gestureState) => {
        // Move the divider visually — no setState, no re-render during drag
        dragY.setValue(gestureState.dy);
      },

      onPanResponderRelease: (_, gestureState) => {
        dragY.flattenOffset();

        // Compute new fraction and clamp to valid range
        const rawPx  = splitRef.current * USABLE_H + gestureState.dy;
        const clamped = Math.min(
          Math.max(rawPx, MIN_PANEL_FRAC * USABLE_H),
          (1 - MIN_PANEL_FRAC) * USABLE_H,
        );
        const newFrac = clamped / USABLE_H;

        // Snap the animated value to the committed position
        Animated.spring(dragY, {
          toValue: clamped,
          friction: 7,
          tension: 60,
          useNativeDriver: false,
        }).start();

        splitRef.current = newFrac;
        setSplitFraction(newFrac);
      },
    })
  ).current;

  // Derive pixel heights for each panel
  const pdfHeight   = splitFraction * USABLE_H;
  const notesHeight = (1 - splitFraction) * USABLE_H;

  return (
    <View style={screen.root}>
      <StatusBar barStyle="dark-content" backgroundColor={L.bg} />

      {/* ── Navigation bar ── */}
      <View style={screen.navBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={screen.navBtn}>
          <Text style={screen.navBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={screen.navTitle}>Deep Reading</Text>
        <View style={screen.navRight}>
          <View style={screen.modeBadge}>
            <Text style={screen.modeBadgeText}>FOCUS</Text>
          </View>
        </View>
      </View>

      {/* ── PDF Panel ── */}
      <PdfPanel pdfUri={pdfUri} height={pdfHeight} />

      {/* ── Draggable Divider ── */}
      <View {...panResponder.panHandlers}>
        <DraggableDivider onMove={setSplitFraction} hasBeenDragged={hasBeenDragged} />
      </View>

      {/* ── Notes Panel ── */}
      <NotesPanel height={notesHeight} note={note} />
    </View>
  );
}

const screen = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: L.bg,
    paddingTop: SAFE_TOP,
  },
  navBar: {
    height: NAV_BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: L.border,
    backgroundColor: L.surface,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: L.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { fontSize: 16, color: L.text },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: L.text,
    letterSpacing: 0.2,
  },
  navRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  modeBadge: {
    backgroundColor: L.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: L.accent,
    letterSpacing: 1.5,
  },
});
  
