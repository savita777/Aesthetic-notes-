import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen'; // 👈 Library ab perfectly kaam karegi

import HomeScreen from './src/screens/HomeScreen';
import NoteScreen from './src/screens/NoteScreen';
import { Colors } from './src/theme/colors';

// App load hote hi splash screen ko tab tak roko jab tak hum na kahein 🛑
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' ya 'note'
  const [selectedNote, setSelectedNote] = useState(null);

  // 🪄 THE 3-SECOND SPLASH SCREEN MAGIC HOLD
  useEffect(() => {
    setTimeout(async () => {
      await SplashScreen.hideAsync(); // 3 second baad aaram se screen hatega
    }, 3000); 
  }, []);

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

  // Date ko cute format mein set karne ke liye
  const getAestheticDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = new Date().toLocaleDateString('en-IN', options);
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} 🎀 - ${timeStr}`;
  };

  // Note save karne ka main function
  const handleSaveNote = (title, content, color, folder, doodle, placedItems) => {
    let updatedNotes = [...notes];
    const aestheticDate = getAestheticDate();
    
    if (selectedNote) {
      // Purane note ko update kar rahe hain
      updatedNotes = notes.map(n => n.id === selectedNote.id ? { 
        ...n, 
        title, 
        content, 
        color, 
        folder, 
        doodle, 
        placedItems, // Drag & drop stickers ka data
        date: aestheticDate 
      } : n);
    } else {
      // Naya note bana rahe hain
      const newNote = {
        id: Date.now().toString(),
        title, 
        content, 
        color, 
        folder: folder || '📔 Diary', 
        doodle, 
        placedItems, // Drag & drop stickers ka data
        date: aestheticDate
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
    
