import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions, Modal, AppState, KeyboardAvoidingView, Platform, FlatList, Animated, Easing } from 'react-native'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';
import AestheticPomodoro from '../components/AestheticPomodoro';
import AiSparkModal from '../components/AiSparkModal';
import { supabase } from '../../supabase';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── A4 ENGINE CONSTANTS ───
const PAGE_W        = SCREEN_W * 0.88;          
const PAGE_H        = PAGE_W * (297 / 210);     
const PAGE_PAD_H    = 40;                        
const PAGE_PAD_V    = 32;                        
const TEXT_AREA_H   = PAGE_H - PAGE_PAD_H * 2;
const FONT_SIZE     = 16;
const LINE_HEIGHT   = 28;
const MAX_LINES     = Math.floor(TEXT_AREA_H / LINE_HEIGHT);  
const PAGE_SAFE_H   = (MAX_LINES - 1) * LINE_HEIGHT;

let _uid = 1;
const uid = () => `page-${Date.now()}-${_uid++}`;

function splitAtWordBoundary(text, maxChars) {
  if (text.length <= maxChars) return { head: text, tail: '' };
  let splitIdx = maxChars;
  while (splitIdx > 0 && !/\s/.test(text[splitIdx])) splitIdx--;
  if (splitIdx === 0) splitIdx = maxChars;
  return { head: text.slice(0, splitIdx).trimEnd(), tail: text.slice(splitIdx).trimStart() };
}

// ─── A4 PAGE COMPONENT ───
const PageView = React.memo(function PageView({ page, index, total, inputRef, onChangeText, onContentSizeChange, onKeyPress, onSelectionChange, isFocused }) {
  const borderAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(borderAnim, { toValue: isFocused ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [isFocused]);

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(234,230,225,0)', 'rgba(255,179,186,0.6)'] });

  return (
    <Animated.View style={[styles.page, { borderColor }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: MAX_LINES + 1 }).map((_, i) => (
          <View key={i} style={[styles.ruledLine, { top: PAGE_PAD_H + i * LINE_HEIGHT + LINE_HEIGHT - 3 }]} />
        ))}
      </View>
      <TextInput
        ref={inputRef} style={styles.textInput} multiline value={page.text}
        onChangeText={(t) => onChangeText(page.id, t)}
        onContentSizeChange={(e) => onContentSizeChange(page.id, index, e.nativeEvent.contentSize.height)}
        onKeyPress={(e) => onKeyPress(page.id, index, e)}
        onSelectionChange={(e) => onSelectionChange(page.id, e.nativeEvent.selection)}
        placeholder={index === 0 ? 'Start typing your aesthetic notes here...\n\n(Select text and tap 🖍️ Mark to highlight)' : ''}
        placeholderTextColor="#D4CFCC" scrollEnabled={false} textAlignVertical="top" keyboardType="default" autoCorrect spellCheck nestedScrollEnabled={false}
        onFocus={() => onContentSizeChange(page.id, index, 0, true)} 
      />
      <View style={styles.pageFooter}>
        <View style={styles.pageFooterLine} />
        <Text style={styles.pageNumber}>{index + 1} / {total}</Text>
      </View>
    </Animated.View>
  );
});

// ─── MAIN NOTE SCREEN (MEGA MERGE) ───
export default function NoteScreen({ note, onSave, onBack }) {
  // UI States
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState(''); 
  const [noteColor, setNoteColor] = useState('#FDF6F5'); 
  const [doodle, setDoodle] = useState(null);
  const [placedItems, setPlacedItems] = useState([]);
  
  // Modals
  const [showDraw, setShowDraw] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // A4 Engine States
  const [pages, setPages] = useState([{ id: uid(), text: '' }]);
  const [focusedPageId, setFocusedPageId] = useState(null);
  const inputRefs = useRef({});
  const selections = useRef({});
  const isSpilling = useRef(false);
  const listRef = useRef(null);
  const noteViewShotRef = useRef();
  const autoSaveTimer = useRef(null);

  const stickersList = ['📌', '⭐️', '💡', '🧠', '📚', '🎯', '✏️', '📍']; 
  const washiColors = ['#FFD1DC', '#FDFD96', '#C1E1C1', '#AEC6CF', '#E6E6FA']; 

  // 🔄 LOAD EXISTING / DRAFT
  useEffect(() => {
    if (note) {
      setTitle(note.title); setFolder(note.folder || ''); setNoteColor(note.color || '#FDF6F5');
      setDoodle(note.doodle || null); setPlacedItems(note.placedItems || []);
      // If old note has content, put it in page 1
      setPages([{ id: uid(), text: note.content || '' }]);
    } else {
      const loadDraft = async () => {
        try {
          const savedDraft = await AsyncStorage.getItem('@lumina_draft');
          if (savedDraft) {
            const parsedDraft = JSON.parse(savedDraft);
            setTitle(parsedDraft.title || ''); setFolder(parsedDraft.folder || ''); setNoteColor(parsedDraft.noteColor || '#FDF6F5');
            setDoodle(parsedDraft.doodle || null); setPlacedItems(parsedDraft.placedItems || []);
            if (parsedDraft.pages) setPages(parsedDraft.pages);
          }
        } catch (error) { console.log("Draft load error", error); }
      };
      loadDraft();
    }
  }, [note]);

  // 💾 AUTO-SAVE LOGIC
  const saveDraftLocally = async () => {
    try {
      const draftData = { title, folder, noteColor, doodle, placedItems, pages, timestamp: Date.now() };
      await AsyncStorage.setItem('@lumina_draft', JSON.stringify(draftData));
    } catch (error) { console.error("Auto-save fail ho gaya:", error); }
  };

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { if (title || pages[0].text) saveDraftLocally(); }, 5000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, folder, noteColor, doodle, placedItems, pages]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (title || pages[0].text) saveDraftLocally();
      }
    });
    return () => subscription.remove();
  }, [title, folder, noteColor, doodle, placedItems, pages]);

  // ─── A4 ENGINE LOGIC ───
  const getOrCreateRef = useCallback((pageId) => {
    if (!inputRefs.current[pageId]) inputRefs.current[pageId] = React.createRef();
    return inputRefs.current[pageId];
  }, []);

  const handleChangeText = useCallback((pageId, newText) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, text: newText } : p)));
  }, []);

  const handleSelectionChange = useCallback((pageId, selection) => {
    selections.current[pageId] = selection;
  }, []);

  const handleContentSizeChange = useCallback((pageId, pageIndex, contentHeight, isFocusEvent = false) => {
    if (isFocusEvent) { setFocusedPageId(pageId); return; }
    if (isSpilling.current || contentHeight <= PAGE_SAFE_H) return;
    isSpilling.current = true;

    setPages((prevPages) => {
      const idx = prevPages.findIndex((p) => p.id === pageId);
      if (idx === -1 || !prevPages[idx].text) { isSpilling.current = false; return prevPages; }
      
      const ratio = PAGE_SAFE_H / contentHeight;
      let maxChars = Math.floor(prevPages[idx].text.length * ratio);
      if (maxChars >= prevPages[idx].text.length) maxChars = prevPages[idx].text.length - 15; 
      if (maxChars < 0) maxChars = 0;

      const { head, tail } = splitAtWordBoundary(prevPages[idx].text, maxChars);
      if (!tail) { isSpilling.current = false; return prevPages; }

      let newPages;
      if (prevPages[idx + 1]) {
        const mergedText = tail + (prevPages[idx + 1].text ? ' ' : '') + prevPages[idx + 1].text;
        newPages = prevPages.map((p, i) => i === idx ? { ...p, text: head } : i === idx + 1 ? { ...p, text: mergedText } : p);
      } else {
        newPages = [...prevPages.slice(0, idx), { ...prevPages[idx], text: head }, { id: uid(), text: tail }];
      }

      setTimeout(() => {
        const ref = inputRefs.current[newPages[idx + 1].id];
        if (ref?.current) { ref.current.focus(); listRef.current?.scrollToIndex({ index: idx + 1, animated: true }); }
        isSpilling.current = false;
      }, 50);
      return newPages;
    });
  }, []);

  const handleKeyPress = useCallback((pageId, pageIndex, event) => {
    if (event.nativeEvent.key !== 'Backspace' || pageIndex === 0) return;
    const sel = selections.current[pageId] ?? { start: 0, end: 0 };
    if (sel.start !== 0 || sel.end !== 0) return;

    setPages((prevPages) => {
      const idx = prevPages.findIndex((p) => p.id === pageId);
      if (idx <= 0) return prevPages;
      const mergedText = prevPages[idx - 1].text + (prevPages[idx].text ? ' ' + prevPages[idx].text : '');
      const prevPageId = prevPages[idx - 1].id;
      
      const newPages = prevPages.map((p, i) => i === idx - 1 ? { ...p, text: mergedText } : p).filter((_, i) => i !== idx);
      setTimeout(() => {
        const ref = inputRefs.current[prevPageId];
        if (ref?.current) ref.current.focus();
        isSpilling.current = false;
      }, 30);
      return newPages;
    });
  }, []);

  // ─── STICKERS & HIGHLIGHTS ───
  const addPlacedItem = (type, contentOrColor) => {
    setPlacedItems([...placedItems, { id: Date.now().toString(), type, content: type === 'emoji' ? contentOrColor : null, color: type === 'washi' ? contentOrColor : null }]);
  };
  const removePlacedItem = (id) => setPlacedItems(placedItems.filter(item => item.id !== id));

  const applyHighlight = () => {
    if (!focusedPageId) { Alert.alert('Pro Tip 💡', 'Please tap on the text first to select a page!'); return; }
    const sel = selections.current[focusedPageId];
    if (sel && sel.start !== sel.end) {
      setPages(prev => prev.map(p => {
        if(p.id === focusedPageId) {
          const t = p.text;
          return { ...p, text: t.substring(0, sel.start) + `【${t.substring(sel.start, sel.end)}】` + t.substring(sel.end) };
        }
        return p;
      }));
    } else {
      Alert.alert('Pro Tip 💡', 'Please select some text first, then tap Mark!');
    }
  };

  const convertHighlightsToHtml = (rawText) => {
    const escaped = rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return escaped.replace(/【(.*?)】/g, '<mark style="background-color:#FDFD96; padding:0 2px; border-radius:3px;">$1</mark>');
  };

  // ─── AI SPARK ───
  const handleAiAction = async (actionId) => {
    setShowAiModal(false); 
    const fullText = pages.map(p => p.text).join('\n\n');
    if (fullText.trim().length < 20) { Alert.alert('Oops!', 'Please write at least 20 characters! ✍️'); return; }

    setIsAiThinking(true);
    setPages(prev => {
      const newPages = [...prev];
      newPages[newPages.length - 1].text += '\n\n✨ [Lumina AI is thinking...]';
      return newPages;
    });

    try {
      const smartPrompt = `Act as an expert study assistant. Action: "${actionId}". \n\nUser Notes:\n${fullText}\n\nProvide a helpful, aesthetic response.`;
      const { data, error } = await supabase.functions.invoke('ask-gemini', { body: { prompt: smartPrompt } });
      if (error) throw new Error("AI Cloud Error: " + error.message);
      
      const result = data?.reply || data?.text || data?.answer || "Lumina AI is speechless!";
      setPages(prev => {
        const newPages = [...prev];
        let lastText = newPages[newPages.length - 1].text;
        lastText = lastText.replace('\n\n✨ [Lumina AI is thinking...]', '');
        newPages[newPages.length - 1].text = lastText + '\n\n════ ⋆★⋆ ════\n\n' + result + '\n\n════ ⋆★⋆ ════';
        return newPages;
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setPages(prev => {
        const newPages = [...prev];
        newPages[newPages.length - 1].text = newPages[newPages.length - 1].text.replace('\n\n✨ [Lumina AI is thinking...]', '');
        return newPages;
      });
      Alert.alert('AI Error', error.message);
    } finally { setIsAiThinking(false); }
  };

  // ─── DUAL PDF EXPORT ───
  const generateAestheticPDF = async () => {
    if (!title.trim()) { Alert.alert('Oops!', 'Please enter a Topic Title! 📚'); return; }
    try {
      const uri = await noteViewShotRef.current.capture({ format: 'png', quality: 1 });
      const htmlContent = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" /><style>body { font-family: 'Helvetica', sans-serif; padding: 20px; background-color: #FAF8F5; margin: 0; } .header { text-align: left; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #EAE6E1; } h1 { color: #2D2A2E; margin: 0; border-left: 5px solid #FFD1DC; padding-left: 15px; } .folder-tag { color: #888; font-size: 14px; margin-top: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; } .canvas-img { width: 100%; height: auto; display: block; image-rendering: high-quality; border-radius: 10px; box-shadow: 0px 10px 30px rgba(0,0,0,0.08); } .watermark { text-align: center; margin-top: 30px; font-size: 12px; color: #C8BDBE; font-style: italic; }</style></head><body><div class="header"><h1>${title}</h1><div class="folder-tag">${folder || 'General Notes'}</div></div><img src="${uri}" class="canvas-img" /><div class="watermark">Crafted with ✨ Lumina Notes</div></body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) { Alert.alert('Export Failed', error.message); }
  };

  const generateProfessionalPDF = async () => {
    if (!title.trim()) { Alert.alert('Oops!', 'Please enter a Topic Title! 📚'); return; }
    try {
      const fullText = pages.map(p => p.text).join('\n\n');
      const bodyHtml = convertHighlightsToHtml(fullText);
      const attachmentsBlock = doodle || placedItems.length > 0 ? `<div class="attachments-section"><div class="attachments-heading">📎 Attachments included</div></div>` : '';
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: 'Georgia', serif; font-size: 15px; line-height: 1.9; color: #2D2A2E; background: #FFFFFF; padding: 48px 52px; } .doc-header { margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #EAE6E1; } .folder-tag { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #B8ADAF; margin-bottom: 8px; } h1 { font-size: 28px; font-weight: 800; color: #2D2A2E; border-left: 4px solid #FFB3BA; padding-left: 14px; line-height: 1.25; } .meta-row { margin-top: 10px; font-family: 'Helvetica Neue', sans-serif; font-size: 12px; color: #C8BDBE; letter-spacing: 0.5px; } .body-text { white-space: pre-wrap; word-break: break-word; font-size: 15px; line-height: 1.9; color: #2D2A2E; } mark { background-color: #FDFD96; padding: 0 2px; border-radius: 3px; } .attachments-section { margin-top: 48px; padding-top: 24px; border-top: 1.5px dashed #EAE6E1; } .attachments-heading { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #B8ADAF; margin-bottom: 20px; } .watermark { margin-top: 48px; text-align: center; font-family: 'Georgia', serif; font-style: italic; font-size: 12px; color: #D4CFCC; }</style></head><body><div class="doc-header"><div class="folder-tag">${folder || 'General Notes'}</div><h1>${title}</h1><div class="meta-row">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div><div class="body-text">${bodyHtml}</div>${attachmentsBlock}<div class="watermark">Crafted with ✨ Lumina Notes</div></body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) { Alert.alert('Export Failed', error.message); }
  };

  // ─── RENDER ───
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={async () => {
            const fullText = pages.map(p => p.text).join('\n\n');
            await AsyncStorage.removeItem('@lumina_draft'); 
            onSave(title, fullText, noteColor, folder || 'Notes', doodle, placedItems);
          }}>
          <Text style={styles.saveBtnText}>Save Note</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.folderInput} placeholder="Subject (e.g., Physics) 🏷️" value={folder} onChangeText={setFolder} />
      <TextInput style={styles.titleInput} placeholder="Topic Title..." value={title} onChangeText={setTitle} multiline />
      
      {/* TOOLBOX */}
      <View style={styles.toolboxBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setShowAiModal(true)} style={styles.aiBtn}><Text style={styles.aiBtnText}>✨ AI Spark</Text></TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity onPress={() => setShowPomodoro(true)} style={styles.pomodoroBtn}><Text style={styles.pomodoroBtnText}>⏱️ Focus</Text></TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity onPress={applyHighlight} style={styles.highlightBtn}><Text style={styles.highlightBtnText}>🖍️ Mark</Text></TouchableOpacity>
          <View style={styles.verticalDivider} />
          <Text style={styles.toolLabel}>Stickers:</Text>
          {stickersList.map((emoji, i) => (<TouchableOpacity key={i} onPress={() => addPlacedItem('emoji', emoji)} style={styles.stickerBtn}><Text style={{fontSize:20}}>{emoji}</Text></TouchableOpacity>))}
          <View style={styles.verticalDivider} />
          <Text style={styles.toolLabel}>Washi:</Text>
          {washiColors.map((color, i) => (<TouchableOpacity key={i} onPress={() => addPlacedItem('washi', color)} style={[styles.washiIcon, {backgroundColor: color}]} />))}
          <View style={styles.verticalDivider} />
          <TouchableOpacity onPress={() => setShowDraw(true)} style={styles.drawBtn}><Text style={styles.drawBtnText}>✏️ Draw</Text></TouchableOpacity>
        </ScrollView>
      </View>

      {/* A4 CANVAS WRAPPER */}
      <View style={styles.masterCanvasWrapper}>
        <ViewShot ref={noteViewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={[styles.noteContainer, { backgroundColor: noteColor }]}>
          
          <FlatList
            ref={listRef} data={pages} keyExtractor={p => p.id}
            renderItem={({ item: page, index }) => (
              <PageView page={page} index={index} total={pages.length} inputRef={getOrCreateRef(page.id)} onChangeText={handleChangeText} onContentSizeChange={handleContentSizeChange} onKeyPress={handleKeyPress} onSelectionChange={handleSelectionChange} isFocused={focusedPageId === page.id} />
            )}
            ItemSeparatorComponent={() => <View style={styles.pageSeparator} />}
            contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
            onScrollToIndexFailed={(info) => { setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 300); }}
          />
          
          {doodle && (
            <View style={styles.doodlePreview}>
              <Image source={{ uri: doodle }} style={styles.doodleImage} />
              <TouchableOpacity onPress={() => setDoodle(null)} style={styles.removeDoodle}><Text style={{color: '#FFF'}}>✕</Text></TouchableOpacity>
            </View>
          )}

          {placedItems.map((item) => (
            <DraggableSticker key={item.id} item={item} onRemove={removePlacedItem} />
          ))}

        </ViewShot>
      </View>

      {/* DUAL EXPORT FOOTER */}
      <View style={styles.exportFooter}>
        <View style={styles.exportFooterHeader}><View style={styles.exportFooterLine} /><Text style={styles.exportFooterLabel}>Export Note</Text><View style={styles.exportFooterLine} /></View>
        <View style={styles.exportBtnRow}>
          <TouchableOpacity style={[styles.exportBtn, styles.exportBtnAesthetic]} onPress={generateAestheticPDF} activeOpacity={0.8}><Text style={styles.exportBtnIcon}>🎨</Text><Text style={styles.exportBtnTitle}>Aesthetic PDF</Text><Text style={styles.exportBtnSub}>Visual · Stickers intact</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, styles.exportBtnPro]} onPress={generateProfessionalPDF} activeOpacity={0.8}><Text style={styles.exportBtnIcon}>📄</Text><Text style={styles.exportBtnTitle}>Professional PDF</Text><Text style={styles.exportBtnSub}>Text · Long notes</Text></TouchableOpacity>
        </View>
      </View>

      <DrawModal visible={showDraw} onClose={() => setShowDraw(false)} onSave={(uri) => { setDoodle(uri); setShowDraw(false); }} />
      <Modal visible={showPomodoro} animationType="slide" presentationStyle="pageSheet"><View style={{ flex: 1, backgroundColor: '#FAF8F5' }}><TouchableOpacity style={styles.closePomodoroBtn} onPress={() => setShowPomodoro(false)}><Text style={styles.closePomodoroText}>✕ Close Timer</Text></TouchableOpacity><AestheticPomodoro /></View></Modal>
      <AiSparkModal visible={showAiModal} onClose={() => setShowAiModal(false)} onSelectAction={handleAiAction} />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 20, paddingTop: 50 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backButton: { fontSize: 16, color: '#8A8788', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#2D2A2E', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  folderInput: { fontSize: 14, color: '#8A8788', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  titleInput: { fontSize: 28, fontWeight: '800', color: '#2D2A2E', marginBottom: 15, lineHeight: 32 },
  
  toolboxBar: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EAE6E1', elevation: 1 },
  aiBtn: { backgroundColor: '#2D2A2E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5, shadowColor: '#2D2A2E', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  aiBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  pomodoroBtn: { backgroundColor: '#FFB3BA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5 },
  pomodoroBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  closePomodoroBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: '#EAE6E1' },
  closePomodoroText: { fontSize: 13, fontWeight: '800', color: '#2D2A2E', letterSpacing: 0.5 },
  highlightBtn: { backgroundColor: '#FDFD96', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5 },
  highlightBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  toolLabel: { fontSize: 12, fontWeight: 'bold', color: '#A09E9F', marginHorizontal: 5 },
  stickerBtn: { paddingHorizontal: 5 },
  washiIcon: { width: 30, height: 12, transform: [{rotate: '-5deg'}], marginHorizontal: 5, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  verticalDivider: { width: 1, height: 25, backgroundColor: '#EAE6E1', marginHorizontal: 10 },
  drawBtn: { backgroundColor: '#E6E6FA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  drawBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  
  masterCanvasWrapper: { flex: 1, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EAE6E1', overflow: 'hidden', backgroundColor: '#FFF' }, 
  noteContainer: { flex: 1, overflow: 'hidden' }, 
  
  // A4 Page Styles merged with NoteScreen
  listContent: { paddingTop: 20, paddingBottom: 60, alignItems: 'center' },
  pageSeparator: { height: 24, backgroundColor: 'transparent' },
  page: { width: PAGE_W, minHeight: PAGE_H, backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 1.5, shadowColor: '#5A4A42', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 3, overflow: 'hidden', paddingHorizontal: PAGE_PAD_V, paddingVertical: PAGE_PAD_H },
  ruledLine: { position: 'absolute', left: PAGE_PAD_V, right: PAGE_PAD_V, height: 1, backgroundColor: '#F0EDE8' },
  textInput: { flex: 1, minHeight: TEXT_AREA_H, fontSize: FONT_SIZE, lineHeight: LINE_HEIGHT, color: '#2D2A2E', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textAlignVertical: 'top', padding: 0, margin: 0, letterSpacing: 0.2, zIndex: 1 },
  pageFooter: { alignItems: 'center', paddingTop: 8, gap: 6 },
  pageFooterLine: { width: 40, height: 1, backgroundColor: '#EAE6E1' },
  pageNumber: { fontSize: 10, color: '#C8BDBE', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic' },
  
  doodlePreview: { position: 'absolute', top: 50, left: 20, height: 180, width: '80%', borderRadius: 8, borderWidth: 1, borderColor: '#EAE6E1', overflow: 'hidden', zIndex: 10, backgroundColor: '#FFF' },
  doodleImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  removeDoodle: { position: 'absolute', top: 10, right: 10, backgroundColor: '#2D2A2E', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  
  exportFooter: { paddingTop: 10, paddingBottom: 6 },
  exportFooterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  exportFooterLine: { flex: 1, height: 1, backgroundColor: '#EAE6E1' },
  exportFooterLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: '#C8BDBE' },
  exportBtnRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, gap: 3, shadowColor: '#C8B8B0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  exportBtnAesthetic: { backgroundColor: '#FFF0F3', borderColor: 'rgba(255,179,186,0.5)' },
  exportBtnPro: { backgroundColor: '#F4F2FF', borderColor: 'rgba(174,166,230,0.5)' },
  exportBtnIcon: { fontSize: 22, marginBottom: 2 },
  exportBtnTitle: { fontSize: 13, fontWeight: '700', color: '#2D2A2E', letterSpacing: 0.2 },
  exportBtnSub: { fontSize: 10, color: '#B8ADAF', letterSpacing: 0.3, textAlign: 'center' },
});
