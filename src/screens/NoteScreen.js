import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import DrawModal from '../components/DrawModal';

export default function NoteScreen({ note, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FFFFFF');
  const [folder, setFolder] = useState('📔 Diary');
  const [doodle, setDoodle] = useState(null); // Drawing save karne ke liye
  const [showDraw, setShowDraw] = useState(false);

  const cuteColors = ['#FFFFFF', '#FFE4E1', '#E8F5E9', '#E6E6FA', '#FFF0F5', '#FFFACD'];
  const stickers = ['🌸', '✨', '🎀', '💖', '🦋', '🧸', '🍓', '💌', '☁️', '🧚‍♀️'];
  const foldersList = ['📔 Diary', '📚 School', '✨ Ideas'];

  useEffect(() => {
    if (note) {
      setTitle(note.title); setContent(note.content);
      setNoteColor(note.color || '#FFFFFF'); setFolder(note.folder || '📔 Diary');
      setDoodle(note.doodle || null);
    }
  }, [note]);

  const generatePDF = async () => {
    if (!title.trim()) { Alert.alert('Oops!', 'Title likhna zaroori hai! 🌸'); return; }
    try {
      const doodleHtml = doodle ? `<div style="text-align:center; margin-top: 20px;"><img src="${doodle}" style="max-width: 100%; border-radius: 15px; border: 2px dashed ${Colors.primaryPink};" /></div>` : '';
      
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Comic Sans MS', sans-serif; padding: 40px; background-color: ${Colors.background}; color: ${Colors.textDark}; }
              h1 { color: ${Colors.darkPink}; text-align: center; border-bottom: 2px dashed ${Colors.primaryPink}; padding-bottom: 15px; }
              .folder-tag { text-align: center; color: #888; font-size: 16px; margin-top: -10px; margin-bottom: 20px; }
              p { font-size: 20px; line-height: 1.8; background-color: ${noteColor}; padding: 25px; border-radius: 20px; box-shadow: 2px 2px 15px rgba(0,0,0,0.05); white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>🌸 ${title} 🌸</h1>
            <div class="folder-tag">Folder: ${folder}</div>
            <p>${content}</p>
            ${doodleHtml}
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    } catch (error) { Alert.alert('Error', 'PDF nahi ban payi: ' + error.message); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>👈 Back</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(title, content, noteColor, folder, doodle)}>
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

      <View style={styles.stickerBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stickers.map((emoji, index) => (
             <TouchableOpacity key={index} onPress={() => setContent(content + emoji)} style={styles.stickerBtn}><Text style={{fontSize:22}}>{emoji}</Text></TouchableOpacity>
          ))}
          {/* Magic Draw Button */}
          <TouchableOpacity onPress={() => setShowDraw(true)} style={styles.drawBtn}>
            <Text style={styles.drawBtnText}>✏️ Doodle</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={[styles.noteContainer, { backgroundColor: noteColor }]}>
        <TextInput style={styles.contentInput} multiline placeholder="Type something cute... ✍️" value={content} onChangeText={setContent} />
        {/* Agar doodle save kiya hai toh note ke andar dikhega */}
        {doodle && (
          <View style={styles.doodlePreview}>
            <Image source={{ uri: doodle }} style={styles.doodleImage} />
            <TouchableOpacity onPress={() => setDoodle(null)} style={styles.removeDoodle}><Text style={{color: '#FFF'}}>❌</Text></TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}><Text style={styles.buttonText}>🌸 Save PDF</Text></TouchableOpacity>

      <DrawModal 
        visible={showDraw} 
        onClose={() => setShowDraw(false)} 
        onSave={(uri) => { setDoodle(uri); setShowDraw(false); }} 
      />
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
  stickerBar: { backgroundColor: '#FFF', paddingVertical: 5, borderRadius: 15, marginBottom: 10 },
  stickerBtn: { paddingHorizontal: 10 },
  drawBtn: { backgroundColor: Colors.pastelPurple, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, marginLeft: 10 },
  drawBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginTop: 2 },
  noteContainer: { flex: 1, borderRadius: 20, padding: 15, marginBottom: 15 },
  contentInput: { flex: 1, fontSize: 16, color: Colors.textDark, textAlignVertical: 'top' },
  doodlePreview: { height: 150, width: '100%', marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.primaryPink, overflow: 'hidden' },
  doodleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeDoodle: { position: 'absolute', top: 5, right: 5, backgroundColor: 'red', padding: 5, borderRadius: 15 },
  pdfButton: { padding: 15, borderRadius: 25, alignItems: 'center', backgroundColor: Colors.primaryPink },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
  
