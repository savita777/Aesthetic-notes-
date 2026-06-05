import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';

export default function NoteScreen({ note, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Agar purana note khola hai toh uski details load karo
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  // Cute Ready-made Templates
  const templates = {
    diary: "Dear Diary, 📋\n\nToday was a beautiful day because...",
    study: "📚 Subject: \n🎯 Today's Goal: \n\n✨ Important Notes:\n- \n- \n\n✅ Revision Done? [ ]",
    todo: "✨ My Cute Goals Today ✨\n\n🌸 1. \n🌸 2. \n🌸 3. \n\n💖 Remember: You can do it!"
  };

  const applyTemplate = (type) => {
    Alert.alert('Template Switch', 'Kya aap yeh template load karna chahte hain? (Aapka purana text mityega nahi, niche jud jayega)', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes 🎀', onPress: () => setContent(content + "\n\n" + templates[type]) }
    ]);
  };

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
              body { font-family: 'Comic Sans MS', 'Arial', sans-serif; padding: 40px; background-color: ${Colors.background}; color: ${Colors.textDark}; }
              h1 { color: ${Colors.darkPink}; text-align: center; border-bottom: 2px dashed ${Colors.primaryPink}; padding-bottom: 15px; font-size: 32px; }
              p { font-size: 20px; line-height: 1.8; background-color: #FFFFFF; padding: 25px; border-radius: 20px; box-shadow: 2px 2px 15px rgba(0,0,0,0.05); white-space: pre-wrap; }
              .footer { margin-top: 30px; text-align: center; font-size: 14px; color: ${Colors.primaryPink}; }
            </style>
          </head>
          <body>
            <h1>🌸 ${title} 🌸</h1>
            <p>${content}</p>
            <div class="footer">Made with 💖 in Aesthetic Notes App</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Error', 'Sharing feature support nahi kar raha.');
      }
    } catch (error) {
      Alert.alert('Error', 'PDF nahi ban payi: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>👈 Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(title, content)}>
          <Text style={styles.saveBtnText}>Save 💾</Text>
        </TouchableOpacity>
      </View>

      {/* Templates Selector */}
      <Text style={styles.sectionLabel}>Quick Templates 🎀:</Text>
      <View style={styles.templateRow}>
        <TouchableOpacity style={styles.templateTab} onPress={() => applyTemplate('diary')}>
          <Text style={styles.templateText}>🌸 Diary</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.templateTab} onPress={() => applyTemplate('study')}>
          <Text style={styles.templateText}>📚 Study</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.templateTab} onPress={() => applyTemplate('todo')}>
          <Text style={styles.templateText}>✨ To-Do</Text>
        </TouchableOpacity>
      </View>

      {/* Inputs */}
      <TextInput
        style={styles.titleInput}
        placeholder="Note ka Title... ✨"
        placeholderTextColor="#FFB6C1"
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.noteContainer}>
        <TextInput
          style={styles.contentInput}
          multiline
          placeholder="Yahan apna cute note ya schedule likhein... ✍️"
          placeholderTextColor="#FFB6C1"
          value={content}
          onChangeText={setContent}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.aiButton]} onPress={() => Alert.alert('Magic AI ✨', 'Google AI Studio Connect hone ke liye ready hai! Next step mein iska jadoo chalega. 🧠')}>
          <Text style={styles.buttonText}>✨ Magic AI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.pdfButton]} onPress={generatePDF}>
          <Text style={styles.buttonText}>🌸 Save PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 50 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  backButton: { fontSize: 18, color: Colors.darkPink, fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.darkPink, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.textDark, marginBottom: 5 },
  templateRow: { flexDirection: 'row', marginBottom: 15 },
  templateTab: { backgroundColor: Colors.mintGreen, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15, marginRight: 10, elevation: 1 },
  templateText: { color: Colors.textDark, fontWeight: 'bold', fontSize: 13 },
  titleInput: { backgroundColor: '#FFF', fontSize: 20, fontWeight: 'bold', color: Colors.textDark, padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2 },
  noteContainer: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 2 },
  contentInput: { flex: 1, fontSize: 16, color: Colors.textDark, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, padding: 15, borderRadius: 25, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  aiButton: { backgroundColor: Colors.pastelPurple },
  pdfButton: { backgroundColor: Colors.primaryPink },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
        
