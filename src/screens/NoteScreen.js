import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions, Modal } from 'react-native'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';
import AestheticPomodoro from '../components/AestheticPomodoro';
import AiSparkModal from '../components/AiSparkModal';

const { width, height } = Dimensions.get('window');

export default function NoteScreen({ note, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FDF6F5'); 
  const [folder, setFolder] = useState(''); 
  const [doodle, setDoodle] = useState(null);
  const [showDraw, setShowDraw] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [placedItems, setPlacedItems] = useState([]);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const noteViewShotRef = useRef();

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
    }
  }, [note]);

  const addPlacedItem = (type, contentOrColor) => {
    const newItem = {
      id: Date.now().toString(),
      type: type,
      content: type === 'emoji' ? contentOrColor : null,
      color: type === 'washi' ? contentOrColor : null,
    };
    setPlacedItems([...placedItems, newItem]);
  };

  const removePlacedItem = (id) => {
    setPlacedItems(placedItems.filter(item => item.id !== id));
  };

  const applyHighlight = () => {
    if (selection.start !== selection.end) {
      const selectedText = content.substring(selection.start, selection.end);
      const textBefore = content.substring(0, selection.start);
      const textAfter = content.substring(selection.end);
      const highlightedText = textBefore + `【${selectedText}】` + textAfter;
      setContent(highlightedText);
    } else {
      Alert.alert('Pro Tip 💡', 'Pehle text ko select/highlight karo, phir mark dabao!');
    }
  };

  const renderHighlightedText = () => {
    const parts = content.split(/(【.*?】)/g);
    return parts.map((part, i) => {
      if (part.startsWith('【') && part.endsWith('】')) {
        return (
          <Text key={i} style={styles.highlightedText}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  // ── Helper: convert 【text】 markers → <mark> tags ──────────────────────────
  const convertHighlightsToHtml = (rawText) => {
    const escaped = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped.replace(
      /【(.*?)】/g,
      '<mark style="background-color:#FDFD96; padding:0 2px; border-radius:3px;">$1</mark>'
    );
  };

  // ── 1. AESTHETIC PDF (Screenshot path) ──────────────────────────────────────
  const generateAestheticPDF = async () => {
    if (!title.trim()) {
      Alert.alert('Oops!', 'Please enter a Topic Title! 📚');
      return;
    }
    try {
      const uri = await noteViewShotRef.current.capture({
        format: 'png',
        quality: 1,
      });

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

  // ── 2. PROFESSIONAL PDF (pure HTML/CSS) ─────────────────────────────────────
  const generateProfessionalPDF = async () => {
    if (!title.trim()) {
      Alert.alert('Oops!', 'Please enter a Topic Title! 📚');
      return;
    }
    try {
      const bodyHtml = convertHighlightsToHtml(content);
      const hasAttachments = doodle || placedItems.length > 0;

      const doodleSection = doodle
        ? `<div class="attachment-item">
             <div class="attachment-label">✏️ Doodle / Sketch</div>
             <img src="${doodle}" class="attachment-img" />
           </div>`
        : '';

      const emojiItems = placedItems.filter((i) => i.type === 'emoji');
      const washiItems = placedItems.filter((i) => i.type === 'washi');

      const stickersSection = emojiItems.length > 0
          ? `<div class="attachment-item">
               <div class="attachment-label">🗂️ Stickers Used</div>
               <div class="sticker-row">
                 ${emojiItems.map((s) => `<span class="sticker-chip">${s.content}</span>`).join('')}
               </div>
             </div>`
          : '';

      const washiSection = washiItems.length > 0
          ? `<div class="attachment-item">
               <div class="attachment-label">🎀 Washi Tape Colors</div>
               <div class="sticker-row">
                 ${washiItems.map((w) => `<span class="washi-chip" style="background-color:${w.color};"></span>`).join('')}
               </div>
             </div>`
          : '';

      const attachmentsBlock = hasAttachments
        ? `<div class="attachments-section">
             <div class="attachments-heading">📎 Attachments</div>
             ${doodleSection}
             ${stickersSection}
             ${washiSection}
           </div>`
        : '';

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

  const handleAiAction = (actionId) => {
    setTimeout(() => {
      Alert.alert('✨ Lumina AI Magic', `The '${actionId}' feature is connecting to Gemini. Coming in the PRO update! 🚀`);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(title, content, noteColor, folder || 'Notes', doodle, placedItems)}>
          <Text style={styles.saveBtnText}>Save Note</Text>
        </TouchableOpacity>
      </View>

      <TextInput 
        style={styles.folderInput} 
        placeholder="Subject (e.g., Physics, UPSC) 🏷️" 
        value={folder} 
        onChangeText={setFolder} 
      />

      <TextInput 
        style={styles.titleInput} 
        placeholder="Topic Title..." 
        value={title} 
        onChangeText={setTitle} 
        multiline
      />
      
      <View style={styles.toolboxBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setShowAiModal(true)} style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>✨ AI Spark</Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />

          <TouchableOpacity onPress={() => setShowPomodoro(true)} style={styles.pomodoroBtn}>
            <Text style={styles.pomodoroBtnText}>⏱️ Focus</Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />

          <TouchableOpacity onPress={applyHighlight} style={styles.highlightBtn}>
            <Text style={styles.highlightBtnText}>🖍️ Mark</Text>
          </TouchableOpacity>
          <View style={styles.verticalDivider} />

          <Text style={styles.toolLabel}>Stickers:</Text>
          {stickersList.map((emoji, index) => (
             <TouchableOpacity key={'stk'+index} onPress={() => addPlacedItem('emoji', emoji)} style={styles.stickerBtn}>
               <Text style={{fontSize:20}}>{emoji}</Text>
             </TouchableOpacity>
          ))}
          <View style={styles.verticalDivider} />
          
          <Text style={styles.toolLabel}>Washi:</Text>
          {washiColors.map((color, index) => (
             <TouchableOpacity key={'wsh'+index} onPress={() => addPlacedItem('washi', color)} style={[styles.washiIcon, {backgroundColor: color}]} />
          ))}
          <View style={styles.verticalDivider} />

          <TouchableOpacity onPress={() => setShowDraw(true)} style={styles.drawBtn}>
            <Text style={styles.drawBtnText}>✏️ Draw</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.masterCanvasWrapper}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <ViewShot ref={noteViewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={[styles.noteContainer, { backgroundColor: noteColor }]}>
            
            <View style={styles.ruledLinesContainer} pointerEvents="none">
               {[...Array(150)].map((_, i) => (
                 <View key={i} style={styles.ruledLine} />
               ))}
            </View>
            
            <TextInput 
              style={styles.contentInput} 
              multiline 
              scrollEnabled={false}
              placeholder="Start typing your aesthetic notes here...\n\n(Select text and tap 'Mark' to highlight)" 
              value={content} 
              onChangeText={setContent} 
              onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
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
        </ScrollView>
      </View>

      {/* ── Dual Export Footer ── */}
      <View style={styles.exportFooter}>
        <View style={styles.exportFooterHeader}>
          <View style={styles.exportFooterLine} />
          <Text style={styles.exportFooterLabel}>Export Note</Text>
          <View style={styles.exportFooterLine} />
        </View>
        <View style={styles.exportBtnRow}>
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnAesthetic]}
            onPress={generateAestheticPDF}
            activeOpacity={0.8}
          >
            <Text style={styles.exportBtnIcon}>🎨</Text>
            <Text style={styles.exportBtnTitle}>Aesthetic PDF</Text>
            <Text style={styles.exportBtnSub}>Visual · Stickers intact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnPro]}
            onPress={generateProfessionalPDF}
            activeOpacity={0.8}
          >
            <Text style={styles.exportBtnIcon}>📄</Text>
            <Text style={styles.exportBtnTitle}>Professional PDF</Text>
            <Text style={styles.exportBtnSub}>Text · Long notes</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DrawModal visible={showDraw} onClose={() => setShowDraw(false)} onSave={(uri) => { setDoodle(uri); setShowDraw(false); }} />

      <Modal visible={showPomodoro} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <TouchableOpacity style={styles.closePomodoroBtn} onPress={() => setShowPomodoro(false)}>
            <Text style={styles.closePomodoroText}>✕ Close Timer</Text>
          </TouchableOpacity>
          <AestheticPomodoro />
        </View>
      </Modal>

      <AiSparkModal 
        visible={showAiModal} 
        onClose={() => setShowAiModal(false)} 
        onSelectAction={handleAiAction}
      />

    </View>
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
  noteContainer: { minHeight: height * 0.6, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 50, overflow: 'hidden' }, 
  ruledLinesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 30 },
  ruledLine: { height: 35, borderBottomWidth: 1, borderBottomColor: 'rgba(160, 158, 159, 0.2)' },
  contentInput: { fontSize: 17, lineHeight: 35, color: '#2D2A2E', textAlignVertical: 'top', zIndex: 1 },
  highlightedText: { backgroundColor: '#FDFD96', fontWeight: '600' }, 
  
  doodlePreview: { height: 180, width: '100%', marginTop: 20, borderRadius: 8, borderWidth: 1, borderColor: '#EAE6E1', overflow: 'hidden', zIndex: 1, backgroundColor: '#FFF' },
  doodleImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  removeDoodle: { position: 'absolute', top: 10, right: 10, backgroundColor: '#2D2A2E', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  
  // ── Dual Export Footer Styles ──
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
