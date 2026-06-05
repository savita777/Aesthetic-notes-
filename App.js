import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function App() {
  const [note, setNote] = useState('');

  const generatePDF = async () => {
    if (note.trim() === '') {
      Alert.alert('Oops!', 'Pehle kuch cute sa likho toh! 🌸');
      return;
    }
    try {
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Comic Sans MS', 'Arial', sans-serif; padding: 40px; background-color: #FFF0F5; color: #5C4033; }
              h1 { color: #FF69B4; text-align: center; border-bottom: 2px dashed #FFB6C1; padding-bottom: 15px; font-size: 32px; }
              p { font-size: 20px; line-height: 1.8; background-color: #FFFFFF; padding: 20px; border-radius: 15px; box-shadow: 2px 2px 10px rgba(0,0,0,0.05); }
              .footer { margin-top: 30px; text-align: center; font-size: 14px; color: #FFB6C1; }
            </style>
          </head>
          <body>
            <h1>🌸 My Cute Notes 🌸</h1>
            <p>${note.replace(/\n/g, '<br>')}</p>
            <div class="footer">Made with 💖 in Aesthetic Notes App</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing available nahi hai 😢');
        return;
      }
      await Sharing.shareAsync(uri);

    } catch (error) {
      Alert.alert('Error', 'PDF banane mein problem aayi: ' + error.message);
    }
  };

  const magicAIPrompt = () => {
    Alert.alert('Magic AI ✨', 'AI features jaldi hi aayenge! Abhi ke liye notes likhiye aur colorful PDF banaiye. 🎀');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>✨ Kawaii Notes ✨</Text>
      
      <View style={styles.noteContainer}>
        <TextInput
          style={styles.input}
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="Dear Diary, aaj ka din kaisa raha? 🎀..."
          placeholderTextColor="#FFB6C1"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.aiButton]} onPress={magicAIPrompt}>
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
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#FFF0F5' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FF69B4', textAlign: 'center', marginBottom: 20 },
  noteContainer: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 15, marginBottom: 20, shadowColor: '#FFB6C1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  input: { flex: 1, fontSize: 18, color: '#5C4033', textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  button: { flex: 1, padding: 15, borderRadius: 25, alignItems: 'center', marginHorizontal: 5, elevation: 3 },
  aiButton: { backgroundColor: '#B19CD9' }, // Pastel Purple
  pdfButton: { backgroundColor: '#FFB6C1' }, // Pastel Pink
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

