import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';
import DraggableSticker from '../components/DraggableSticker';

export default function NoteScreen({ note, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FFFFFF');
  const [folder, setFolder] = useState('📔 Diary');
  const [doodle, setDoodle] = useState(null);
  const [showDraw, setShowDraw] = useState(false);
  
  // Naya: Placed Stickers & Washi Tapes ki List
  const [placedItems, setPlacedItems] = useState([]);

  // PDF nikalne ke liye Note ka Screenshot engine
  const noteViewShotRef = useRef();

  const cuteColors = ['#FFFFFF', '#FFE4E1', '#E8F5E9', '#E6E6FA', '#FFF0F5', '#FFFACD'];
  const stickersList = ['🌸', '✨', '🎀', '💖', '🦋', '🧸', '🍓', '💌', '☁️', '🧚‍♀️'];
  const washiColors = ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF']; // Pastel Washi Tapes
  const foldersList = ['📔 Diary', '📚 School', '✨ Ideas'];

  useEffect(() => {
    if (note) {
      setTitle(note.title); setContent(note.content);
      setNoteColor(note.color || '#FFFFFF'); setFolder(note.folder || '📔 Diary');
      setDoodle(note.doodle || null);
      setPlacedItems(note.placedItems || []);
    }
  }, [note]);

  // Sticker ya Washi Tape Note par dalne ka function
  const addPlacedItem = (type, contentOrColor) => {
    const newItem = {
      id: Date.now().toString(),
      type: type, // 'emoji' or 'washi'
      content: type === 'emoji' ? contentOrColor : null,
      color: type === 'washi' ? contentOrColor : null,
    };
    setPlacedItems([...placedItems, newItem]);
  };

  // Sticker hatane ka function (Long Press par)
  const removePlacedItem = (id) => {
    setPlacedItems(placedItems.filter(item => item.id !== id));
  };

  // PRO PDF Generator (Poore Note ka image capture karke)
  const generatePDF = async () => {
    if (!title.trim()) { Alert.alert('Oops!', 'Title likhna zaroori hai! 🌸'); return; }
    try {
      // Pura Note Canvas (Text + Stickers + Washi + Doodle) ek Image ban jayega
      const uri = await noteViewShotRef.current.capture();
      
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Comic Sans MS', sans-serif; padding: 20px; background-color: ${Colors.background}; }
              h1 { color: ${Colors.darkPink}; text-align: center; border-bottom: 2px dashed ${Colors.primaryPink}; padding-bottom: 10px; }
              .folder-tag { text-align: center; color: #888; font-size: 14px; margin-bottom: 20px; }
              .canvas-img { width: 100%; border-radius: 20px; box-shadow: 2px 2px 15px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <h1>🌸 ${title} 🌸</h1>
            <div class="folder-tag">Folder: ${folder}</div>
            <img src="${uri}" class="canvas-img" />
          </body>
        </html>
      `;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri);
    } catch (error) { Alert.alert('Error', 'PDF nahi ban payi: ' + error.message); }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>👈 Back</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(title, content, noteColor, folder, doodle, placedItems)}>
          <Text style={styles.saveBtnText}>Save 💾</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={[styles.titleInput, { backgroundColor: noteColor }]} placeholder="Note Title... ✨" value={title} onChangeText={setTitle} />
      
      <View style={styles.folderRow}>
        {foldersList.map((f, i) => (
          <TouchableOpacity key={i} style={[styles.folderBtn, folder === f && styles.folderBtnActive]} onPress={() => setFolder(f)}>
            <Text style={[styles.folderText, folder === f && styles.folderTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Toolbox: Stickers, Washi, Draw */}
      <View style={styles.stickerBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
          <Text style={styles.toolLabel}>Stickers:</Text>
          {stickersList.map((emoji, index) => (
             <TouchableOpacity key={'stk'+index} onPress={() => addPlacedItem('emoji', emoji)} style={styles.stickerBtn}>
               <Text style={{fontSize:22}}>{emoji}</Text>
             </TouchableOpacity>
          ))}
          
          <View style={styles.verticalDivider} />
          
          <Text style={styles.toolLabel}>Washi Tape:</Text>
          {washiColors.map((color, index) => (
             <TouchableOpacity key={'wsh'+index} onPress={() => addPlacedItem('washi', color)} style={[styles.washiIcon, {backgroundColor: color}]} />
          ))}

          <View style={styles.verticalDivider} />

          <TouchableOpacity onPress={() => setShowDraw(true)} style={styles.drawBtn}>
            <Text style={styles.drawBtnText}>✏️ Doodle</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* The Master Canvas (Jiska PDF banega) */}
      <ViewShot ref={noteViewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={[styles.noteContainer, { backgroundColor: noteColor }]}>
        
        {/* Likhne ki jagah */}
        <TextInput style={styles.contentInput} multiline placeholder="Type your cute notes here... ✍️&#10;(Long press sticker to remove)" value={content} onChangeText={setContent} />
        
        {/* Doodle ki Photo */}
        {doodle && (
          <View style={styles.doodlePreview}>
            <Image source={{ uri: doodle }} style={styles.doodleImage} />
            <TouchableOpacity onPress={() => setDoodle(null)} style={styles.removeDoodle}><Text style={{color: '#FFF'}}>❌</Text></TouchableOpacity>
          </View>
        )}

        {/* Draggable Stickers aur Washi Tapes */}
        {placedItems.map((item) => (
          <DraggableSticker key={item.id} item={item} onRemove={removePlacedItem} />
        ))}
        
      </ViewShot>

      <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}><Text style={styles.buttonText}>🌸 Save Pro PDF</Text></TouchableOpacity>

      <DrawModal visible={showDraw} onClose={() => setShowDraw(false)} onSave={(uri) => { setDoodle(uri); setShowDraw(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 50 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  backButton: { fontSize: 18, color: Colors.darkPink, fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.darkPink, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  titleInput: { fontSize: 20, fontWeight: 'bold', color: Colors.textDark, padding: 15, borderRadius: 15, marginBottom: 10 },
  folderRow: { flexDirection: 'row', marginBottom: 10 },
  folderBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FFF', borderRadius: 20, marginRight: 8 },
  folderBtnActive: { backgroundColor: Colors.primaryPink },
  folderText: { color: Colors.textLight, fontSize: 12, fontWeight: 'bold' },
  folderTextActive: { color: '#FFF' },
  
  stickerBar: { backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 5, borderRadius: 15, marginBottom: 10 },
  toolLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.muted, marginHorizontal: 5 },
  stickerBtn: { paddingHorizontal: 5 },
  washiIcon: { width: 25, height: 15, transform: [{rotate: '-10deg'}], marginHorizontal: 5, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  verticalDivider: { width: 2, height: 20, backgroundColor: '#E5E5EA', marginHorizontal: 10 },
  drawBtn: { backgroundColor: Colors.pastelPurple, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, marginLeft: 5 },
  drawBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginTop: 2 },
  
  noteContainer: { flex: 1, borderRadius: 20, padding: 15, marginBottom: 15, overflow: 'hidden' }, // overflow hidden taaki sticker bahar na jaye
  contentInput: { flex: 1, fontSize: 16, color: Colors.textDark, textAlignVertical: 'top', zIndex: 1 },
  
  doodlePreview: { height: 150, width: '100%', marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.primaryPink, overflow: 'hidden', zIndex: 1 },
  doodleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeDoodle: { position: 'absolute', top: 5, right: 5, backgroundColor: 'red', padding: 5, borderRadius: 15 },
  
  pdfButton: { padding: 15, borderRadius: 25, alignItems: 'center', backgroundColor: Colors.primaryPink },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
  
