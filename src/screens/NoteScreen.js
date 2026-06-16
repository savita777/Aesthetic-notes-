import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions, Modal, AppState, KeyboardAvoidingView, Platform } from 'react-native'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system'; 
import { Feather } from '@expo/vector-icons';

// True Rich Text Engine Imports
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';
import AiSparkModal from '../components/AiSparkModal';

// 🚀 NAYA: ThemeContext Import
import { useTheme } from '../context/ThemeContext';

// 🚀 NAYA: Audio Modules Import (Notability style)
import { MicButton, AudioPlaybackPill } from '../components/AudioRecorder';

import { supabase } from '../../supabase';

const { width, height } = Dimensions.get('window');

// 🚀 NAYA: onDelete prop add kiya hai taaki App.js delete ko control kar sake
export default function NoteScreen({ note, onSave, onDelete, onBack }) {
  const { theme } = useTheme(); // 🎨 Theme hook added

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FDF6F5'); 
  const [folder, setFolder] = useState(''); 
  const [doodle, setDoodle] = useState(null);
  const [showDraw, setShowDraw] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [placedItems, setPlacedItems] = useState([]);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  
  const [audioUri, setAudioUri] = useState(null); // 🚀 NAYA: Audio State

  const [isAiThinking, setIsAiThinking] = useState(false);

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
      setAudioUri(note.audioUri || null); // 🚀 NAYA: Load saved audio
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
            if (parsedDraft.audioUri) setAudioUri(parsedDraft.audioUri); // 🚀 NAYA: Load audio from draft
            console.log("✅ Purana Data (Draft) Wapas Aa Gaya!");
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
      // 🚀 NAYA: Included audioUri in draftData
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
  }, [title, content, folder, noteColor, doodle, placedItems, audioUri]); // 🚀 NAYA: Added audioUri dependency

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (title || content) saveDraftLocally();
      }
    });
    return () => subscription.remove();
  }, [title, content, folder, noteColor, doodle, placedItems, audioUri]); // 🚀 NAYA: Added audioUri dependency

  // 🚀 NAYA: FIXED DELETE FUNCTION - Ab yeh seedha App.js ka function call karega
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
              onDelete(note.id); // Command sent to App.js!
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

  const generateAestheticPDF = async () => {
    if (!title.trim()) {
      Alert.alert('Oops!', 'Please enter a Topic Title! 📚');
      return;
    }
    try {
      const uri = await noteViewShotRef.current.capture({ format: 'png', quality: 1 });

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; background-color: #FAF8F5; margin: 0; }
              .header { text-align: left; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #EAE6E1; }
              h1 { color: #2D2A2E; margin: 0; border-left: 5px solid #FFD1DC; padding-left: 15px; }
              .folder-tag { color: #888; font-size: 14px; margin-top: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .canvas-img { width: 100%; height: auto; display: block; image-rendering: high-quality; border-radius: 10px; box-shadow: 0px 10px 30px rgba(0,0,0,0.08); }
              .watermark { text-align: center; margin-top: 30px; font-size: 12px; color: #C8BDBE; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <div class="folder-tag">${folder || 'General Notes'}</div>
            </div>
            <img src="${uri}" class="canvas-img" />
            <div class="watermark">Crafted with ✨ Lumina Notes</div>
          </body>
        </html>
      `;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) {
      Alert.alert('Export Failed', error.message);
    }
  };

  const generateProfessionalPDF = async () => {
    if (!title.trim()) {
      Alert.alert('Oops!', 'Please enter a Topic Title! 📚');
      return;
    }
    try {
      const bodyHtml = content; 
      const hasAttachments = doodle || placedItems.length > 0;

      let doodleSection = '';
      if (doodle) {
        try {
          const base64Str = await FileSystem.readAsStringAsync(doodle, { encoding: FileSystem.EncodingType.Base64 });
          const doodleBase64 = `data:image/png;base64,${base64Str}`;
          doodleSection = `<div class="attachment-item">
               <div class="attachment-label">✏️ Doodle / Sketch</div>
               <img src="${doodleBase64}" class="attachment-img" />
             </div>`;
        } catch (e) {
          console.log("Error converting doodle to base64", e);
        }
      }

      const emojiItems = placedItems.filter((i) => i.type === 'emoji');
      const washiItems = placedItems.filter((i) => i.type === 'washi');

      const stickersSection = emojiItems.length > 0
          ? `<div class="attachment-item">
               <div class="attachment-label">🗂️ Stickers Used</div>
               <div class="sticker-row">
                 ${emojiItems.map((s) => `<span class="sticker-chip">${s.content}</span>`).join('')}
               </div>
             </div>` : '';

      const washiSection = washiItems.length > 0
          ? `<div class="attachment-item">
               <div class="attachment-label">🎀 Washi Tape Colors</div>
               <div class="sticker-row">
                 ${washiItems.map((w) => `<span class="washi-chip" style="background-color:${w.color};"></span>`).join('')}
               </div>
             </div>` : '';

      const attachmentsBlock = hasAttachments
        ? `<div class="attachments-section">
             <div class="attachments-heading">📎 Attachments</div>
             ${doodleSection}
             ${stickersSection}
             ${washiSection}
           </div>` : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Georgia', serif; font-size: 15px; line-height: 1.9; color: #2D2A2E; background: #FFFFFF; padding: 48px 52px; }
              .doc-header { margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #EAE6E1; }
              .folder-tag { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #B8ADAF; margin-bottom: 8px; }
              h1 { font-size: 28px; font-weight: 800; color: #2D2A2E; border-left: 4px solid #FFB3BA; padding-left: 14px; line-height: 1.25; }
              .meta-row { margin-top: 10px; font-family: 'Helvetica Neue', sans-serif; font-size: 12px; color: #C8BDBE; letter-spacing: 0.5px; }
              .body-text { white-space: pre-wrap; word-break: break-word; font-size: 15px; line-height: 1.9; color: #2D2A2E; }
              mark { background-color: #FDFD96; padding: 0 2px; border-radius: 3px; }
              .attachments-section { margin-top: 48px; padding-top: 24px; border-top: 1.5px dashed #EAE6E1; }
              .attachments-heading { font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #B8ADAF; margin-bottom: 20px; }
              .attachment-item { margin-bottom: 22px; }
              .attachment-label { font-family: 'Helvetica Neue', sans-serif; font-size: 12px; font-weight: 600; color: #8A8788; margin-bottom: 8px; letter-spacing: 0.4px; }
              .attachment-img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #EAE6E1; display: block; }
              .sticker-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
              .sticker-chip { font-size: 22px; padding: 4px; background: #FAF8F5; border-radius: 8px; border: 1px solid #EAE6E1; }
              .washi-chip { display: inline-block; width: 48px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.07); }
              .watermark { margin-top: 48px; text-align: center; font-family: 'Georgia', serif; font-style: italic; font-size: 12px; color: #D4CFCC; }
            </style>
          </head>
          <body>
            <div class="doc-header">
              <div class="folder-tag">${folder || 'General Notes'}</div>
              <h1>${title}</h1>
              <div class="meta-row">
                ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div class="body-text">${bodyHtml}</div>
            ${attachmentsBlock}
            <div class="watermark">Crafted with ✨ Lumina Notes</div>
          </body>
        </html>
      `;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) {
      Alert.alert('Export Failed', error.message);
    }
  };

  const handleAiAction = async (actionId) => {
    setShowAiModal(false); 
    const plainText = content.replace(/<[^>]+>/g, '');
    if (!plainText || plainText.trim().length < 20) {
      Alert.alert('Oops!', 'Please write at least 20 characters so AI has something to read! ✍️');
      return;
    }
    setIsAiThinking(true);
    const thinkingText = '<p id="ai-thinking" style="color:#B5838D;"><em>✨ [Lumina AI is thinking...]</em></p>';
    setContent(prev => {
      const newHtml = prev + thinkingText;
      richEditorRef.current?.setContentHTML(newHtml);
      return newHtml;
    });

    try {
      const smartPrompt = `Act as an expert study assistant. The user wants you to perform this action: "${actionId}". \n\nHere are the user's notes:\n\n${plainText}\n\nPlease provide a helpful, clean, and aesthetic response.`;
      const fetchPromise = supabase.functions.invoke('ask-gemini', { body: { prompt: smartPrompt } });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 12000));
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) throw new Error(error.message || "Failed to fetch");
      
      const result = data?.reply || data?.text || data?.answer || data?.response || "Lumina AI is speechless!";
      setContent(prev => {
        const safePrev = prev || "";
        const cleanContent = safePrev.replace('<p id="ai-thinking" style="color:#B5838D;"><em>✨ [Lumina AI is thinking...]</em></p>', '');
        const formattedResult = result.replace(/\n/g, '<br>');
        const updatedHTML = cleanContent + '<br><br><hr style="border:none;border-top:1px dashed #B5838D;" /><br><b>✨ AI Spark:</b><br>' + formattedResult + '<br><br><hr style="border:none;border-top:1px dashed #B5838D;" /><br>';
        richEditorRef.current?.setContentHTML(updatedHTML);
        return updatedHTML;
      });
    } catch (error) {
      setContent(prev => {
        const cleaned = (prev || "").replace('<p id="ai-thinking" style="color:#B5838D;"><em>✨ [Lumina AI is thinking...]</em></p>', '');
        richEditorRef.current?.setContentHTML(cleaned);
        return cleaned;
      });
      if (error.message === 'Timeout' || error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        Alert.alert('No Internet 📶', 'Lumina AI needs an active internet connection. Please check your network and try again!');
      } else {
        Alert.alert('AI Error 🤖', 'Something went wrong: ' + error.message);
      }
    } finally {
      setIsAiThinking(false);
    }
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
        
        {/* 🚀 NAYA: DELETE & SAVE BUTTON CONTAINER REFINED */}
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
              // 🚀 NAYA: Passed audioUri to onSave function
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

          {/* 🚀 NAYA: Mic Button UI Injection */}
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
            
            {/* 🚀 NAYA: Audio Pill Injection Right above Text */}
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
            
            {/* Kept for backwards compatibility with older drafts */}
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

      <View style={styles.exportFooter}>
        <View style={styles.exportFooterHeader}>
          <View style={[styles.exportFooterLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.exportFooterLabel, { color: theme.muted }]}>Export Note</Text>
          <View style={[styles.exportFooterLine, { backgroundColor: theme.border }]} />
        </View>
        <View style={styles.exportBtnRow}>
          <TouchableOpacity style={[styles.exportBtn, styles.exportBtnAesthetic, { backgroundColor: theme.accentSoft, borderColor: theme.accent + '50' }]} onPress={generateAestheticPDF} activeOpacity={0.8}>
            <Feather name="image" size={22} color={theme.accent} style={styles.exportBtnIcon} />
            <Text style={[styles.exportBtnTitle, { color: theme.text }]}>Aesthetic PDF</Text>
            <Text style={[styles.exportBtnSub, { color: theme.muted }]}>Visual · Stickers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, styles.exportBtnPro, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={generateProfessionalPDF} activeOpacity={0.8}>
            <Feather name="file-text" size={22} color={theme.accent} style={styles.exportBtnIcon} />
            <Text style={[styles.exportBtnTitle, { color: theme.text }]}>Professional PDF</Text>
            <Text style={[styles.exportBtnSub, { color: theme.muted }]}>Text · Clean</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🚀 NAYA: INLINE DRAWING FIX (Saves directly into Rich Editor) */}
      <DrawModal 
        visible={showDraw} 
        onClose={() => setShowDraw(false)} 
        onSave={async (uri) => { 
          setShowDraw(false);
          try {
            const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const b64Data = `data:image/png;base64,${base64Str}`;
            
            // Image tag generated and inserted directly into the editor!
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

// 🎨 NOTE: Purane colors delete nahi kiye gaye hain, wo yahin rahenge as a blueprint.
// Naye colors directly components mein { inline } inject kar diye gaye hain.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 20, paddingTop: 50 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backButton: { fontSize: 16, color: '#8A8788', fontWeight: 'bold' },
  
  // 🚀 NAYA: Styles for Action Buttons
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
  highlightedText: { backgroundColor: '#FDFD96', fontWeight: '600' }, 
  
  doodlePreview: { height: 180, width: '100%', marginTop: 20, borderRadius: 8, borderWidth: 1, borderColor: '#EAE6E1', overflow: 'hidden', zIndex: 1, backgroundColor: '#FFF' },
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
  exportBtnIcon: { marginBottom: 2 },
  exportBtnTitle: { fontSize: 13, fontWeight: '700', color: '#2D2A2E', letterSpacing: 0.2 },
  exportBtnSub: { fontSize: 10, color: '#B8ADAF', letterSpacing: 0.3, textAlign: 'center' },
});
