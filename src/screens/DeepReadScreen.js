import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions, Modal, AppState, KeyboardAvoidingView, Platform } from 'react-native'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system'; 

// True Rich Text Engine Imports
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';
import AestheticPomodoro from '../components/AestheticPomodoro';
import AiSparkModal from '../components/AiSparkModal';

// 🚀 NAYA: Audio Modules Import (Notability style)
import { MicButton, AudioPlaybackPill } from '../components/AudioRecorder';

import { supabase } from '../../supabase';

const { width, height } = Dimensions.get('window');

export default function NoteScreen({ note, onSave, onDelete, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FDF6F5'); 
  const [folder, setFolder] = useState(''); 
  const [doodle, setDoodle] = useState(null);
  const [placedItems, setPlacedItems] = useState([]);
  const [audioUri, setAudioUri] = useState(null); // 🚀 NAYA: Audio State
  
  const [showDraw, setShowDraw] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const noteViewShotRef = useRef();
  const autoSaveTimer = useRef(null);
  const richEditorRef = useRef(null);

  const stickersList = ['📌', '⭐️', '💡', '🧠', '📚', '🎯', '✏️', '📍']; 
  const washiColors = ['#FFD1DC', '#FDFD96', '#C1E1C1', '#AEC6CF', '#E6E6FA']; 

  useEffect(() => {
    if (note) {
      setTitle(note.title); 
      setContent(note.content);
      setNoteColor(note.color || '#FDF6F5'); 
      setFolder(note.folder || '');
      setDoodle(note.doodle || null);
      setPlacedItems(note.placedItems || []);
      setAudioUri(note.audioUri || null); // Load saved audio
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
        } catch (error) { console.log("Draft load error", error); }
      };
      loadDraft();
    }
  }, [note]);

  const saveDraftLocally = async () => {
    try {
      const draftData = { title, content, folder, noteColor, doodle, placedItems, audioUri, timestamp: Date.now() };
      await AsyncStorage.setItem('@lumina_draft', JSON.stringify(draftData));
    } catch (error) {}
  };

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title || content) saveDraftLocally();
    }, 5000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, content, folder, noteColor, doodle, placedItems, audioUri]);

  const handleDelete = () => {
    Alert.alert("Delete Note", "Are you sure you want to permanently delete this note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem('@lumina_draft');
          if (onDelete && note?.id) onDelete(note.id); else onBack();
      }}
    ]);
  };

  const addPlacedItem = (type, contentOrColor) => {
    const newItem = { id: Date.now().toString(), type: type, content: type === 'emoji' ? contentOrColor : null, color: type === 'washi' ? contentOrColor : null };
    setPlacedItems([...placedItems, newItem]);
  };

  const removePlacedItem = (id) => setPlacedItems(placedItems.filter(item => item.id !== id));
  const applyHighlight = () => richEditorRef.current?.sendAction('hiliteColor', 'result', '#FDFD96');

  // ... (Keeping your exact PDF generation logic untouched)
  const generateProfessionalPDF = async () => {
    if (!title.trim()) { Alert.alert('Oops!', 'Please enter a Topic Title! 📚'); return; }
    try {
      const bodyHtml = content; 
      const htmlContent = `<html><head><style>body { font-family: 'Georgia', serif; font-size: 15px; padding: 48px; }</style></head><body><h1>${title}</h1><div>${bodyHtml}</div></body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) { Alert.alert('Export Failed', error.message); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
        <View style={styles.headerActions}>
          {note && ( 
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={async () => {
              await AsyncStorage.removeItem('@lumina_draft'); 
              onSave(title, content, noteColor, folder || 'Notes', doodle, placedItems, audioUri); // AudioUri passed!
            }}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput style={styles.folderInput} placeholder="Subject (e.g., Physics, UPSC) 🏷️" value={folder} onChangeText={setFolder} />
      <TextInput style={styles.titleInput} placeholder="Topic Title..." value={title} onChangeText={setTitle} multiline />
      
      <View style={styles.toolboxBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setShowAiModal(true)} style={styles.aiBtn}><Text style={styles.aiBtnText}>✨ AI Spark</Text></TouchableOpacity>
          <View style={styles.verticalDivider} />
          
          {/* 🚀 NAYA: Mic Button UI Injection */}
          <MicButton onRecordingComplete={(uri) => setAudioUri(uri)} />
          <View style={styles.verticalDivider} />
          
          <TouchableOpacity onPress={() => setShowPomodoro(true)} style={styles.pomodoroBtn}><Text style={styles.pomodoroBtnText}>⏱️ Focus</Text></TouchableOpacity>
          <View style={styles.verticalDivider} />
          <TouchableOpacity onPress={applyHighlight} style={styles.highlightBtn}><Text style={styles.highlightBtnText}>🖍️ Mark</Text></TouchableOpacity>
          <View style={styles.verticalDivider} />
          <Text style={styles.toolLabel}>Stickers:</Text>
          {stickersList.map((emoji, index) => (
             <TouchableOpacity key={'stk'+index} onPress={() => addPlacedItem('emoji', emoji)} style={styles.stickerBtn}><Text style={{fontSize:20}}>{emoji}</Text></TouchableOpacity>
          ))}
          <View style={styles.verticalDivider} />
          <TouchableOpacity onPress={() => setShowDraw(true)} style={styles.drawBtn}><Text style={styles.drawBtnText}>✏️ Draw</Text></TouchableOpacity>
        </ScrollView>
      </View>

      <RichToolbar editor={richEditorRef} actions={[actions.setBold, actions.setItalic, actions.setUnderline, actions.heading1, actions.insertBulletsList, actions.blockquote, actions.undo, actions.redo]} iconTint="#A09E9F" selectedIconTint="#B5838D" style={styles.richBar} flatContainerStyle={styles.richBarFlat} />

      <View style={styles.masterCanvasWrapper}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}>
          <ViewShot ref={noteViewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={[styles.noteContainer, { backgroundColor: noteColor }]}>
            
            {/* 🚀 NAYA: Audio Pill Injection Right above Text */}
            <AudioPlaybackPill uri={audioUri} onDelete={() => setAudioUri(null)} />
            
            <RichEditor
              ref={richEditorRef}
              initialContentHTML={content}
              onChange={setContent}
              placeholder="Start typing your aesthetic notes here..."
              style={styles.richEditor}
              editorStyle={{ backgroundColor: 'transparent', color: '#2D2A2E', placeholderColor: '#A09E9F', cssText: `body { font-family: -apple-system, 'Georgia', serif; font-size: 17px; line-height: 35px; margin: 0; padding: 0; }` }}
              useContainer={true}
            />

            {placedItems.map((item) => (
              <DraggableSticker key={item.id} item={item} onRemove={removePlacedItem} />
            ))}
          </ViewShot>
        </ScrollView>
      </View>

      <DrawModal visible={showDraw} onClose={() => setShowDraw(false)} onSave={async (uri) => { 
          setShowDraw(false);
          try {
            const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const b64Data = `data:image/png;base64,${base64Str}`;
            richEditorRef.current?.insertHTML(`<br><br><img src="${b64Data}" style="width: 100%; border-radius: 12px; border: 1px solid #EAE6E1;" /><br><br>`);
          } catch(e) {}
        }} />

      <Modal visible={showPomodoro} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <TouchableOpacity style={styles.closePomodoroBtn} onPress={() => setShowPomodoro(false)}><Text style={styles.closePomodoroText}>✕ Close Timer</Text></TouchableOpacity>
          <AestheticPomodoro />
        </View>
      </Modal>

      <AiSparkModal visible={showAiModal} onClose={() => setShowAiModal(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 20, paddingTop: 50 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backButton: { fontSize: 16, color: '#8A8788', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { backgroundColor: '#2D2A2E', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { backgroundColor: '#FFF0F3', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, borderWidth: 1, borderColor: '#FFB3BA' },
  deleteBtnText: { color: '#D9534F', fontWeight: '700', fontSize: 13 },
  folderInput: { fontSize: 14, color: '#8A8788', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  titleInput: { fontSize: 28, fontWeight: '800', color: '#2D2A2E', marginBottom: 15, lineHeight: 32 },
  toolboxBar: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAE6E1', elevation: 1 },
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
  richBar: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 1, borderBottomColor: '#EAE6E1', paddingVertical: 2 },
  richBarFlat: { paddingHorizontal: 10, gap: 5 },
  richEditor: { flex: 1, minHeight: height * 0.6, zIndex: 1 },
  masterCanvasWrapper: { flex: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginBottom: 15, borderWidth: 1, borderTopWidth: 0, borderColor: '#EAE6E1', overflow: 'hidden', backgroundColor: '#FFF' }, 
  noteContainer: { minHeight: height * 0.6, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50, overflow: 'hidden' }, 
});
                                                  
