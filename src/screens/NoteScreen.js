import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions, Modal, AppState, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system'; 
import { Feather } from '@expo/vector-icons';

// True Rich Text Engine Imports
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';
import AiSparkModal from '../components/AiSparkModal';

// Theme & Audio
import { useTheme } from '../context/ThemeContext';
import { MicButton, AudioPlaybackPill } from '../components/AudioRecorder';

import { supabase } from '../../supabase';

const { width, height } = Dimensions.get('window');

export default function NoteScreen({ note, onSave, onDelete, onBack }) {
  const { theme } = useTheme(); 

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FDF6F5'); 
  const [folder, setFolder] = useState(''); 
  const [doodle, setDoodle] = useState(null);
  const [showDraw, setShowDraw] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [placedItems, setPlacedItems] = useState([]);
  
  const [audioUri, setAudioUri] = useState(null); 

  // 🚀 NAYA: Ethical AI States
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiPreviewContent, setAiPreviewContent] = useState('');
  const [isAiPreviewVisible, setIsAiPreviewVisible] = useState(false);

  const noteViewShotRef = useRef();
  const autoSaveTimer = useRef(null);
  const richEditorRef = useRef(null);

  const stickersList = ['📌', '⭐️', '💡', '🧠', '📚', '🎯', '✏️', '📍']; 
  const washiColors = ['#FFD1DC', '#FDFD96', '#C1E1C1', '#AEC6CF', '#E6E6FA']; 

  // Load Existing Note OR Restore Draft
  useEffect(() => {
    if (note) {
      setTitle(note.title); 
      setContent(note.content);
      setNoteColor(note.color || '#FDF6F5'); 
      setFolder(note.folder || '');
      setDoodle(note.doodle || null);
      setPlacedItems(note.placedItems || []);
      setAudioUri(note.audioUri || null); 
      setTimeout(() => richEditorRef.current?.setContentHTML(note.content), 100);
    } else {
      const loadDraft = async () => {
        try {
          const savedDraft = await AsyncStorage.getItem('@lumina_draft');
          if (savedDraft) {
            const parsedDraft = JSON.parse(savedDraft);
            setTitle(parsedDraft.title || '');
            setContent(parsedDraft.content || '');
            if (parsedDraft.folder) setFolder(parsedDraft.folder);
            if (parsedDraft.noteColor) setNoteColor(parsedDraft.noteColor);
            if (parsedDraft.doodle) setDoodle(parsedDraft.doodle);
            if (parsedDraft.placedItems) setPlacedItems(parsedDraft.placedItems);
            if (parsedDraft.audioUri) setAudioUri(parsedDraft.audioUri); 
            setTimeout(() => richEditorRef.current?.setContentHTML(parsedDraft.content || ''), 100);
          }
        } catch (error) {
          console.log("Draft load error", error);
        }
      };
      loadDraft();
    }
  }, [note]);

  const saveDraftLocally = async () => {
    try {
      const draftData = { title, content, folder, noteColor, doodle, placedItems, audioUri, timestamp: Date.now() };
      await AsyncStorage.setItem('@lumina_draft', JSON.stringify(draftData));
    } catch (error) {
      console.error("Auto-save fail ho gaya:", error);
    }
  };

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title || content) saveDraftLocally();
    }, 5000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, content, folder, noteColor, doodle, placedItems, audioUri]); 

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (title || content) saveDraftLocally();
      }
    });
    return () => subscription.remove();
  }, [title, content, folder, noteColor, doodle, placedItems, audioUri]); 

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to permanently delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.removeItem('@lumina_draft');
            if (onDelete && note?.id) {
              onDelete(note.id); 
            } else {
              onBack();
            }
          } 
        }
      ]
    );
  };

  const addPlacedItem = (type, contentOrColor) => {
    const newItem = { id: Date.now().toString(), type: type, content: type === 'emoji' ? contentOrColor : null, color: type === 'washi' ? contentOrColor : null };
    setPlacedItems([...placedItems, newItem]);
  };

  const removePlacedItem = (id) => {
    setPlacedItems(placedItems.filter(item => item.id !== id));
  };

  const applyHighlight = () => {
    richEditorRef.current?.sendAction('hiliteColor', 'result', theme.accentSoft);
  };

  // 🚀 NAYA: Ethical AI Handler (Replaced Old Logic)
  const handleAiAction = async (actionId) => {
    setShowAiModal(false);

    const plainText = content.replace(/<[^>]+>/g, '').trim();
    if (plainText.length < 20) {
      Alert.alert('Oops!', 'Please write at least 20 characters so AI has something to read! ✍️');
      return;
    }

    // Show loading overlay — nothing touches the editor yet
    setIsAiThinking(true);

    try {
      const smartPrompt = `Act as an expert study assistant. The user wants you to perform this action: "${actionId}". \n\nHere are the user's notes:\n\n${plainText}\n\nPlease provide a helpful, clean, and well-structured response.`;

      const fetchPromise = supabase.functions.invoke('ask-gemini', {
        body: { prompt: smartPrompt },
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 12000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) throw new Error(error.message || 'Failed to fetch');

      const result =
        data?.reply || data?.text || data?.answer || data?.response || 'Lumina AI is speechless!';

      // Store in preview — editor is untouched until user explicitly approves
      setAiPreviewContent(result);
      setIsAiPreviewVisible(true);

    } catch (error) {
      if (error.message === 'Timeout' || error.message.includes('fetch')) {
        Alert.alert('No Internet 📶', 'Lumina AI needs an active connection. Please try again.');
      } else {
        Alert.alert('AI Error 🤖', 'Something went wrong: ' + error.message);
      }
    } finally {
      setIsAiThinking(false);
    }
  };

  const generateProfessionalPDF = async () => {
    // (Kept exact same logic as before to preserve functionality)
    if (!title.trim()) { Alert.alert('Oops!', 'Please enter a Topic Title! 📚'); return; }
    try {
      const bodyHtml = content; 
      const hasAttachments = doodle || placedItems.length > 0;
      let doodleSection = '';
      if (doodle) {
        try {
          const base64Str = await FileSystem.readAsStringAsync(doodle, { encoding: FileSystem.EncodingType.Base64 });
          doodleSection = `<div class="attachment-item"><div class="attachment-label">✏️ Doodle</div><img src="data:image/png;base64,${base64Str}" class="attachment-img" /></div>`;
        } catch (e) { console.log(e); }
      }
      const emojiItems = placedItems.filter((i) => i.type === 'emoji');
      const washiItems = placedItems.filter((i) => i.type === 'washi');
      const attachmentsBlock = hasAttachments ? `<div class="attachments-section">${doodleSection}</div>` : '';
      const htmlContent = `<!DOCTYPE html><html><head><style>body { font-family: 'Georgia', serif; font-size: 15px; line-height: 1.9; padding: 48px; }</style></head><body><h1>${title}</h1><div class="body-text">${bodyHtml}</div>${attachmentsBlock}<div style="margin-top: 48px; text-align: center; color: #D4CFCC;">Crafted with ✨ Lumina Notes</div></body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) { Alert.alert('Export Failed', error.message); }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.surface }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
    >
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={theme.muted} />
          <Text style={[styles.backButton, { color: theme.muted }]}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {note && ( 
            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleDelete}>
              <Feather name="trash-2" size={14} color="#D9534F" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: theme.accent }]} 
            onPress={async () => {
              await AsyncStorage.removeItem('@lumina_draft'); 
              onSave(title, content, noteColor, folder || 'Notes', doodle, placedItems, audioUri);
            }}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput 
        style={[styles.folderInput, { color: theme.muted }]} 
        placeholder="Subject (e.g., Physics, UPSC) 🏷️" 
        placeholderTextColor={theme.muted}
        value={folder} 
        onChangeText={setFolder} 
      />

      <TextInput 
        style={[styles.titleInput, { color: theme.text }]} 
        placeholder="Topic Title..." 
        placeholderTextColor={theme.muted}
        value={title} 
        onChangeText={setTitle} 
        multiline
      />
      
      <View style={[styles.toolboxBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setShowAiModal(true)} style={[styles.aiBtn, { backgroundColor: theme.accent }]}>
            <Feather name="zap" size={14} color="#FFFFFF" />
            <Text style={styles.aiBtnText}>AI Spark</Text>
          </TouchableOpacity>
          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

          <MicButton onRecordingComplete={(uri) => setAudioUri(uri)} />
          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity onPress={applyHighlight} style={[styles.highlightBtn, { backgroundColor: theme.accentSoft }]}>
            <Feather name="edit-3" size={14} color={theme.text} />
            <Text style={[styles.highlightBtnText, { color: theme.text }]}>Mark</Text>
          </TouchableOpacity>
          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.toolLabel, { color: theme.muted }]}>Stickers:</Text>
          {stickersList.map((emoji, index) => (
             <TouchableOpacity key={'stk'+index} onPress={() => addPlacedItem('emoji', emoji)} style={styles.stickerBtn}>
               <Text style={{fontSize:20}}>{emoji}</Text>
             </TouchableOpacity>
          ))}
          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.toolLabel, { color: theme.muted }]}>Washi:</Text>
          {washiColors.map((color, index) => (
             <TouchableOpacity key={'wsh'+index} onPress={() => addPlacedItem('washi', color)} style={[styles.washiIcon, {backgroundColor: color}]} />
          ))}
          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity onPress={() => setShowDraw(true)} style={[styles.drawBtn, { backgroundColor: theme.accentSoft }]}>
            <Feather name="pen-tool" size={14} color={theme.text} />
            <Text style={[styles.drawBtnText, { color: theme.text }]}>Draw</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <RichToolbar
        editor={richEditorRef}
        actions={[actions.setBold, actions.setItalic, actions.setUnderline, actions.heading1, actions.insertBulletsList, actions.blockquote, actions.undo, actions.redo]}
        iconTint={theme.muted}
        selectedIconTint={theme.accent}
        style={[styles.richBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
        flatContainerStyle={styles.richBarFlat}
      />

      <View style={[styles.masterCanvasWrapper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
          nestedScrollEnabled={true} 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }} 
        >
          <ViewShot ref={noteViewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={[styles.noteContainer, { backgroundColor: noteColor }]}>
            <View style={styles.ruledLinesContainer} pointerEvents="none">
               {[...Array(150)].map((_, i) => (
                 <View key={i} style={[styles.ruledLine, { borderBottomColor: theme.border + '30' }]} />
               ))}
            </View>
            
            <AudioPlaybackPill uri={audioUri} onDelete={() => setAudioUri(null)} />

            <RichEditor
              ref={richEditorRef}
              initialContentHTML={content}
              onChange={setContent}
              placeholder="Start typing your aesthetic notes here..."
              style={styles.richEditor}
              editorStyle={{
                backgroundColor: 'transparent',
                color: theme.text,
                placeholderColor: theme.muted,
                cssText: `
                  body { font-family: -apple-system, 'Georgia', serif; font-size: 17px; line-height: 35px; margin: 0; padding: 0; color: ${theme.text}; }
                  h1 { font-size: 26px; font-weight: 800; color: ${theme.text}; margin: 0; padding: 0; }
                  h1 { font-size: 26px; font-weight: 800; color: ${theme.text}; margin: 0; padding-left: 20px; line-height: 35px; }
                  blockquote { border-left: 3px solid ${theme.accent}; padding-left: 10px; color: ${theme.muted}; font-style: italic; margin: 0; }
                `
              }}
              useContainer={true}
            />
            
            {doodle && (
              <View style={[styles.doodlePreview, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <Image source={{ uri: doodle }} style={styles.doodleImage} />
                <TouchableOpacity onPress={() => setDoodle(null)} style={styles.removeDoodle}><Text style={{color: '#FFF'}}>✕</Text></TouchableOpacity>
              </View>
            )}

            {placedItems.map((item) => (
              <DraggableSticker key={item.id} item={item} onRemove={removePlacedItem} />
            ))}
          </ViewShot>
        </ScrollView>
      </View>

      {/* 🚀 NAYA: AI Thinking Overlay */}
      {isAiThinking && (
        <View style={aiModalStyles.thinkingOverlay}>
          <View style={[aiModalStyles.thinkingCard, { backgroundColor: theme.card }]}>
            <View style={aiModalStyles.thinkingIconRing}>
              <Text style={aiModalStyles.thinkingIcon}>✨</Text>
            </View>
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 4 }} />
            <Text style={[aiModalStyles.thinkingTitle, { color: theme.text }]}>AI Spark is thinking…</Text>
            <Text style={[aiModalStyles.thinkingSubtitle, { color: theme.muted }]}>Reading your notes carefully</Text>
          </View>
        </View>
      )}

      {/* 🚀 NAYA: Ethical AI Preview Modal */}
      <Modal
        visible={isAiPreviewVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setIsAiPreviewVisible(false);
          setAiPreviewContent('');
        }}
      >
        <View style={aiModalStyles.backdrop}>
          <View style={[aiModalStyles.sheet, { backgroundColor: theme.surface }]}>
            <View style={[aiModalStyles.handle, { backgroundColor: theme.border }]} />
            <View style={[aiModalStyles.badge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[aiModalStyles.badgeText, { color: theme.accent }]}>✨ AI Spark Suggestion</Text>
            </View>
            <Text style={[aiModalStyles.sheetSubtitle, { color: theme.muted }]}>Review before inserting. Your note stays untouched until you approve.</Text>
            
            <View style={[aiModalStyles.contentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ScrollView style={aiModalStyles.contentScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <Text style={[aiModalStyles.contentText, { color: theme.text }]} selectable>{aiPreviewContent}</Text>
              </ScrollView>
            </View>

            <View style={aiModalStyles.buttonRow}>
              <TouchableOpacity
                style={[aiModalStyles.btnDiscard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={() => { setIsAiPreviewVisible(false); setAiPreviewContent(''); }}
              >
                <Feather name="x" size={15} color={theme.muted} />
                <Text style={[aiModalStyles.btnDiscardText, { color: theme.muted }]}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[aiModalStyles.btnInsert, { backgroundColor: theme.accent }]}
                activeOpacity={0.85}
                onPress={() => {
                  const divider = `<div style="margin: 24px 0 10px; border-top: 1.5px dashed ${theme.accent}; opacity: 0.35;"></div>`;
                  const header = `<p style="font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${theme.accent}; margin: 0 0 10px;">✨ AI Spark</p>`;
                  const paragraphs = aiPreviewContent.split(/\n{2,}/).map(p => `<p style="margin: 0 0 12px; line-height: 1.75;">${p.trim().replace(/\n/g, '<br/>')}</p>`).join('');
                  const closingDivider = `<div style="margin: 10px 0 20px; border-top: 1.5px dashed ${theme.accent}; opacity: 0.35;"></div>`;

                  richEditorRef.current?.insertHTML(divider + header + paragraphs + closingDivider);
                  setIsAiPreviewVisible(false);
                  setAiPreviewContent('');
                }}
              >
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={aiModalStyles.btnInsertText}>Insert to Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DrawModal 
        visible={showDraw} 
        onClose={() => setShowDraw(false)} 
        onSave={async (uri) => { 
          setShowDraw(false);
          try {
            const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const b64Data = `data:image/png;base64,${base64Str}`;
            const imgHtml = `<br><br><img src="${b64Data}" style="width: 100%; border-radius: 12px; border: 1px solid #EAE6E1;" /><br><br>`;
            richEditorRef.current?.insertHTML(imgHtml);
          } catch(e) {
            console.log("Base64 conversion error:", e);
            Alert.alert("Drawing Error", "Could not save the drawing.");
          }
        }} 
      />

      <AiSparkModal visible={showAiModal} onClose={() => setShowAiModal(false)} onSelectAction={handleAiAction} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 20, paddingTop: 50 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backButton: { fontSize: 16, color: '#8A8788', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { backgroundColor: '#2D2A2E', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0F3', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, borderWidth: 1, borderColor: '#FFB3BA' },
  deleteBtnText: { color: '#D9534F', fontWeight: '700', fontSize: 13 },
  folderInput: { fontSize: 14, color: '#8A8788', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  titleInput: { fontSize: 28, fontWeight: '800', color: '#2D2A2E', marginBottom: 15, lineHeight: 32 },
  toolboxBar: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAE6E1', elevation: 1 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2D2A2E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5, shadowColor: '#2D2A2E', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  aiBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  highlightBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDFD96', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5 },
  highlightBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  toolLabel: { fontSize: 12, fontWeight: 'bold', color: '#A09E9F', marginHorizontal: 5 },
  stickerBtn: { paddingHorizontal: 5 },
  washiIcon: { width: 30, height: 12, transform: [{rotate: '-5deg'}], marginHorizontal: 5, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  verticalDivider: { width: 1, height: 25, backgroundColor: '#EAE6E1', marginHorizontal: 10 },
  drawBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E6E6FA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  drawBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  richBar: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 1, borderBottomColor: '#EAE6E1', paddingVertical: 2 },
  richBarFlat: { paddingHorizontal: 10, gap: 5 },
  richEditor: { flex: 1, minHeight: height * 0.6, zIndex: 1 },
  masterCanvasWrapper: { flex: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginBottom: 15, borderWidth: 1, borderTopWidth: 0, borderColor: '#EAE6E1', overflow: 'hidden', backgroundColor: '#FFF' }, 
  noteContainer: { minHeight: height * 0.6, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50, overflow: 'hidden' }, 
  ruledLinesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 30 },
  ruledLine: { height: 35, borderBottomWidth: 1, borderBottomColor: 'rgba(160, 158, 159, 0.2)' },
  doodlePreview: { height: 180, width: '100%', marginTop: 20, borderRadius: 8, borderWidth: 1, borderColor: '#EAE6E1', overflow: 'hidden', zIndex: 1, backgroundColor: '#FFF' },
  doodleImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  removeDoodle: { position: 'absolute', top: 10, right: 10, backgroundColor: '#2D2A2E', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
});

// 🚀 NAYA: AI Modal Styles
const aiModalStyles = StyleSheet.create({
  thinkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30, 26, 28, 0.52)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  thinkingCard: { width: 240, borderRadius: 28, paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 14 },
  thinkingIconRing: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(181, 131, 141, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  thinkingIcon: { fontSize: 26 },
  thinkingTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  thinkingSubtitle: { fontSize: 12, fontStyle: 'italic', marginTop: -4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 14, 16, 0.50)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 14, paddingHorizontal: 22, paddingBottom: 36, maxHeight: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 18 },
  handle: { width: 40, height: 4, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  sheetSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  contentCard: { borderRadius: 18, borderWidth: 1, padding: 16, maxHeight: 320, marginBottom: 20 },
  contentScroll: { flexGrow: 0 },
  contentText: { fontSize: 14.5, lineHeight: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  btnDiscard: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20 },
  btnDiscardText: { fontSize: 14, fontWeight: '600' },
  btnInsert: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 16, paddingVertical: 14, shadowColor: '#B5838D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5 },
  btnInsertText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
