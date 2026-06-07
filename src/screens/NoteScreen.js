import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions, Modal } from 'react-native'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';
import AestheticPomodoro from '../components/AestheticPomodoro';

// ✨ NAYA: AI Spark Modal Import Kiya
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
  
  // ✨ NAYA: AI Modal ki State
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

  const generatePDF = async () => {
    if (!title.trim()) { Alert.alert('Oops!', 'Please enter a Topic Title! 📚'); return; }
    try {
      const uri = await noteViewShotRef.current.capture({ format: 'png', quality: 1 });
      
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; background-color: #FAF8F5; margin: 0; }
              .header { text-align: left; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #EAE6E1; }
              h1 { color: #2D2A2E; margin: 0; border-left: 5px solid #FFD1DC; padding-left: 15px;}
              .folder-tag { color: #888; font-size: 14px; margin-top: 5px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .canvas-img { 
                width: 100%; 
                height: auto; 
                display: block; 
                image-rendering: high-quality;
                border-radius: 10px; 
                box-shadow: 0px 10px 30px rgba(0,0,0,0.08); 
              }
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
    } catch (error) { Alert.alert('Error', 'PDF Export Failed: ' + error.message); }
  };

  // ✨ NAYA: AI Action Handler (Abhi ke liye Mock Alert)
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
          
          {/* ✨ NAYA: AI Spark Button */}
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

      <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
        <Text style={styles.buttonText}>📤 Export HD PDF</Text>
      </TouchableOpacity>

      <DrawModal visible={showDraw} onClose={() => setShowDraw(false)} onSave={(uri) => { setDoodle(uri); setShowDraw(false); }} />

      <Modal visible={showPomodoro} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <TouchableOpacity style={styles.closePomodoroBtn} onPress={() => setShowPomodoro(false)}>
            <Text style={styles.closePomodoroText}>✕ Close Timer</Text>
          </TouchableOpacity>
          <AestheticPomodoro />
        </View>
      </Modal>

      {/* ✨ NAYA: AI Spark Modal Component */}
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
  
  // ✨ NAYA: AI Button Styling
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
  
  pdfButton: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE6E1', elevation: 2 },
  buttonText: { color: '#2D2A2E', fontSize: 16, fontWeight: '700' }
});
                                  
