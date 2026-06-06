import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './src/screens/HomeScreen';
import NoteScreen from './src/screens/NoteScreen';
import { Colors } from './src/theme/colors';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    try {
      const savedNotes = await AsyncStorage.getItem('@aesthetic_notes');
      if (savedNotes !== null) setNotes(JSON.parse(savedNotes));
    } catch (e) { console.log(e); }
  };

  const saveNotesToStorage = async (newNotes) => {
    try {
      await AsyncStorage.setItem('@aesthetic_notes', JSON.stringify(newNotes));
      setNotes(newNotes);
    } catch (e) { console.log(e); }
  };

  const getAestheticDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return `${new Date().toLocaleDateString('en-IN', options)} 🎀`;
  };

  // Yahan 'folder' parameter add kiya gaya hai
  const handleSaveNote = (title, content, color, folder) => {
    let updatedNotes = [...notes];
    const aestheticDate = getAestheticDate();
    
    if (selectedNote) {
      updatedNotes = notes.map(n => n.id === selectedNote.id ? { 
        ...n, title, content, color, folder, date: aestheticDate 
      } : n);
    } else {
      const newNote = {
        id: Date.now().toString(),
        title, content, color, folder: folder || '📔 Diary', date: aestheticDate
      };
      updatedNotes.unshift(newNote);
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

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background } });
