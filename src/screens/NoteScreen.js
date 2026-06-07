import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image, Dimensions } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';

const { width } = Dimensions.get('window');

export default function NoteScreen({ note, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FDF6F5'); // Aesthetic Off-White
  
  // 📚 NAYA: Custom Subject Input (Pehle fix tha, ab user likhega)
  const [folder, setFolder] = useState(''); 
  
  const [doodle, setDoodle] = useState(null);
  const [showDraw, setShowDraw] = useState(false);
  const [placedItems, setPlacedItems] = useState([]);
  
  // 🖍️ NAYA: Text Selection ke liye state (Highlighter ke liye)
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const noteViewShotRef = useRef();

  const stickersList = ['📌', '⭐️', '💡', '🧠', '📚', '🎯', '✏️', '📍']; // Study Aesthetic Stickers
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

  // 🖍️ NAYA: Neon Highlighter Function
  const applyHighlight = () => {
    if (selection.start !== selection.end) {
      const selectedText = content.substring(selection.start, selection.end);
      const textBefore = content.substring(0, selection.start);
      const textAfter = content.substring(selection.end);
      // Text ke aage peeche special bracket lagayenge jo renderer highlight samjhega
      const highlightedText = textBefore + `【${selectedText}】` + textAfter;
      setContent(highlightedText);
    } else {
      Alert.alert('Pro Tip 💡', 'Pehle text ko select/highlight karo, phir mark dabao!');
    }
  };

  // 📝 NAYA: Text Renderer (Highlight brackets ko UI mein convert karega)
  const renderHighlightedText = () => {
    // Ye function sirf UI dikhane ke liye hai taaki typing ke peeche lines aaye
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
      const uri = await noteViewShotRef.current.capture();
      
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; background-color: #FAF8F5; }
              h1 { color: #2D2A2E; text-align: left; border-left: 5px solid #FFD1DC; padding-left: 15px; margin-bottom: 5px;}
              .folder-tag { color: #888; font-size: 14px; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .canvas-img { width: 100%; border-radius: 10px; box-shadow: 0px 10px 30px rgba(0,0,0,0.08); }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="folder-tag">${folder || 'General Notes'}</div>
            <img src="${uri}" class="canvas-img" />
          </body>
        </html>
      `;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) { Alert.alert('Error', 'PDF Export Failed: ' + error.message); }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(title, content, noteColor, folder || 'Notes', doodle, placedItems)}>
          <Text style={styles.saveBtnText}>Save Note</Text>
        </TouchableOpacity>
      </View>

      {/* 📚 Custom Subject Input */}
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
      
      {/* Toolbox: Stickers, Highlighter, Draw */}
      <View style={styles.toolboxBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          
          {/* 🖍️ Neon Highlighter Button */}
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

      {/* The Master Canvas (Jiska PDF banega) */}
      <ViewShot ref={noteViewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={[styles.noteContainer, { backgroundColor: noteColor }]}>
        
        {/* 📓 Notebook Lines Background (Ruled Paper Aesthetic) */}
        <View style={styles.ruledLinesContainer} pointerEvents="none">
           {[...Array(30)].map((_, i) => (
             <View key={i} style={styles.ruledLine} />
           ))}
        </View>
        
        {/* Likhne ki jagah */}
        <TextInput 
          style={styles.contentInput} 
          multiline 
          placeholder="Start typing your aesthetic notes here...\n\n(Select text and tap 'Mark' to highlight)" 
          value={content} 
          onChangeText={setContent} 
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        />
        
        {/* Doodle ki Photo */}
        {doodle && (
          <View style={styles.doodlePreview}>
            <Image source={{ uri: doodle }} style={styles.doodleImage} />
            <TouchableOpacity onPress={() => setDoodle(null)} style={styles.removeDoodle}><Text style={{color: '#FFF'}}>✕</Text></TouchableOpacity>
          </View>
        )}

        {/* Draggable Stickers aur Washi Tapes */}
        {placedItems.map((item) => (
          <DraggableSticker key={item.id} item={item} onRemove={removePlacedItem} />
        ))}
        
      </ViewShot>

      <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
        <Text style={styles.buttonText}>📤 Export PDF</Text>
      </TouchableOpacity>

      <DrawModal visible={showDraw} onClose={() => setShowDraw(false)} onSave={(uri) => { setDoodle(uri); setShowDraw(false); }} />
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
  
  highlightBtn: { backgroundColor: '#FDFD96', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5 },
  highlightBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  
  toolLabel: { fontSize: 12, fontWeight: 'bold', color: '#A09E9F', marginHorizontal: 5 },
  stickerBtn: { paddingHorizontal: 5 },
  washiIcon: { width: 30, height: 12, transform: [{rotate: '-5deg'}], marginHorizontal: 5, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  verticalDivider: { width: 1, height: 25, backgroundColor: '#EAE6E1', marginHorizontal: 10 },
  drawBtn: { backgroundColor: '#E6E6FA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  drawBtnText: { color: '#2D2A2E', fontWeight: 'bold', fontSize: 13 },
  
  noteContainer: { flex: 1, borderRadius: 12, paddingHorizontal: 15, paddingTop: 10, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#EAE6E1' }, 
  
  // 📓 Ruled Lines Effect
  ruledLinesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 30 },
  ruledLine: { height: 35, borderBottomWidth: 1, borderBottomColor: 'rgba(160, 158, 159, 0.2)' },
  
  contentInput: { flex: 1, fontSize: 17, lineHeight: 35, color: '#2D2A2E', textAlignVertical: 'top', zIndex: 1 },
  highlightedText: { backgroundColor: '#FDFD96', fontWeight: '600' }, // Neon Yellow
  
  doodlePreview: { height: 180, width: '100%', marginTop: 20, borderRadius: 8, borderWidth: 1, borderColor: '#EAE6E1', overflow: 'hidden', zIndex: 1, backgroundColor: '#FFF' },
  doodleImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  removeDoodle: { position: 'absolute', top: 10, right: 10, backgroundColor: '#2D2A2E', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  
  pdfButton: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE6E1', elevation: 2 },
  buttonText: { color: '#2D2A2E', fontSize: 16, fontWeight: '700' }
});
    
