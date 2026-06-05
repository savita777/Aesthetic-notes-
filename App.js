import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import NoteScreen from './src/screens/NoteScreen';
import { Colors } from './src/theme/colors';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' ya 'note'
  const [selectedNote, setSelectedNote] = useState(null);

  // App khulte hi phone ki memory se data load karo
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const savedNotes = await AsyncStorage.getItem('@aesthetic_notes');
      if (savedNotes !== null) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (e) {
      console.log("Notes load karne mein error aaya:", e);
    }
  };

  const saveNotesToStorage = async (newNotes) => {
    try {
      await AsyncStorage.setItem('@aesthetic_notes', JSON.stringify(newNotes));
      setNotes(newNotes);
    } catch (e) {
      console.log("Notes save karne mein error aaya:", e);
    }
  };

  const handleSaveNote = (title, content) => {
    let updatedNotes = [...notes];
    
    if (selectedNote) {
      // Purane note ko edit kar rahe hain
      updatedNotes = notes.map(n => n.id === selectedNote.id ? { 
        ...n, 
        title, 
        content, 
        date: new Date().toLocaleDateString('en-IN') 
      } : n);
    } else {
      // Naya note bana rahe hain
      const newNote = {
        id: Date.now().toString(),
        title,
        content,
        date: new Date().toLocaleDateString('en-IN')
      };
      updatedNotes.unshift(newNote); // Naya note list mein sabse upar dikhega
    }

    saveNotesToStorage(updatedNotes);
    setCurrentScreen('home');
    setSelectedNote(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
      {currentScreen === 'home' ? (
        <HomeScreen 
          notes={notes}
          onSelectNote={(note) => { setSelectedNote(note); setCurrentScreen('note'); }}
          onCreateNew={() => { setSelectedNote(null); setCurrentScreen('note'); }}
        />
      ) : (
        <NoteScreen 
          note={selectedNote}
          onSave={handleSaveNote}
          onBack={() => { setCurrentScreen('home'); setSelectedNote(null); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }
});
        
