import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';

export default function NoteScreen({ note, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#FFFFFF');
  const [folder, setFolder] = useState('📔 Diary'); // Default folder

  const cuteColors = ['#FFFFFF', '#FFE4E1', '#E8F5E9', '#E6E6FA', '#FFF0F5', '#FFFACD'];
  const stickers = ['🌸', '✨', '🎀', '💖', '🦋', '🧸', '🍓', '💌', '☁️', '🧚‍♀️'];
  const foldersList = ['📔 Diary', '📚 School', '✨ Ideas'];

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setNoteColor(note.color || '#FFFFFF');
      setFolder(note.folder || '📔 Diary');
    }
  }, [note]);

  const generatePDF = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Oops!', 'Title aur Content dono likhna zaroori hai! 🌸');
      return;
    }
    try {
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
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Error', 'PDF nahi ban payi: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>👈 Back</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(title, content, noteColor, folder)}>
          <Text style={styles.saveBtnText}>Save 💾</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={[styles.titleInput, { backgroundColor: noteColor }]} placeholder="Note ka Title... ✨" value={title} onChangeText={setTitle} />

      {/* Select Folder Bar */}
      <Text style={styles.sectionLabel}>Select Folder 📁:</Text>
      <View style={styles.folderRow}>
        {foldersList.map((f, i) => (
          <TouchableOpacity key={i} style={[styles.folderBtn, folder === f && styles.folderBtnActive]} onPress={() => setFolder(f)}>
            <Text style={[styles.folderText, folder === f && styles.folderTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.colorPickerContainer}>
        {cuteColors.map((color, index) => (
          <TouchableOpacity key={index} style={[styles.colorCircle, { backgroundColor: color, borderWidth: noteColor === color ? 2 : 0 }]} onPress={() => setNoteColor(color)} />
        ))}
      </View>

      <View style={styles.stickerBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stickers.map((emoji, index) => (
             <TouchableOpacity key={index} onPress={() => setContent(content + emoji)} style={styles.stickerBtn}><Text style={{fontSize:22}}>{emoji}</Text></TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.noteContainer, { backgroundColor: noteColor }]}>
        <TextInput style={styles.contentInput} multiline placeholder="Yahan apna cute note likhein... ✍️" value={content} onChangeText={setContent} />
      </View>

      <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}><Text style={styles.buttonText}>🌸 Save PDF</Text></TouchableOpacity>
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
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: Colors.textDark, marginBottom: 5, marginLeft: 5 },
  folderRow: { flexDirection: 'row', marginBottom: 10 },
  folderBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FFF', borderRadius: 20, marginRight: 8, elevation: 1 },
  folderBtnActive: { backgroundColor: Colors.primaryPink },
  folderText: { color: Colors.textLight, fontSize: 12, fontWeight: 'bold' },
  folderTextActive: { color: '#FFF' },
  colorPickerContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  colorCircle: { width: 30, height: 30, borderRadius: 15, borderColor: Colors.darkPink },
  stickerBar: { backgroundColor: '#FFF', paddingVertical: 5, borderRadius: 15, marginBottom: 10 },
  stickerBtn: { paddingHorizontal: 12 },
  noteContainer: { flex: 1, borderRadius: 20, padding: 15, marginBottom: 15 },
  contentInput: { flex: 1, fontSize: 16, color: Colors.textDark, textAlignVertical: 'top' },
  pdfButton: { padding: 15, borderRadius: 25, alignItems: 'center', backgroundColor: Colors.primaryPink },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
  
