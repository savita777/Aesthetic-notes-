import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen'; 

// ☁️ NAYA: Apna Cloud Vault yahan import kiya
import { supabase } from './supabase'; 

import HomeScreen from './src/screens/HomeScreen';
import NoteScreen from './src/screens/NoteScreen';
import { Colors } from './src/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    setTimeout(async () => {
      await SplashScreen.hideAsync(); 
    }, 3000); 
  }, []);

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

  const getAestheticDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = new Date().toLocaleDateString('en-IN', options);
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} 🎀 - ${timeStr}`;
  };

  // 🚀 NAYA: Is function ko 'async' bana diya taaki cloud ka wait kar sake
  const handleSaveNote = async (title, content, color, folder, doodle, placedItems) => {
    let updatedNotes = [...notes];
    const aestheticDate = getAestheticDate();
    
    if (selectedNote) {
      updatedNotes = notes.map(n => n.id === selectedNote.id ? { 
        ...n, title, content, color, folder, doodle, placedItems, date: aestheticDate 
      } : n);
    } else {
      const newNote = {
        id: Date.now().toString(),
        title, content, color, folder: folder || '📔 Diary', doodle, placedItems, date: aestheticDate
      };
      updatedNotes.unshift(newNote); 
    }

    // ☁️ THE MAGIC: Seedha Cloud par bhejne ka code!
    try {
      const { error } = await supabase
        .from('notes')
        .insert([
          { 
            title: title || "Untitled",          // Naya: Title bhej rahe hain
            content: content || "Khali note",    // Purana content waisa hi hai
            color: color || "#FDF6F5",           // Naya: Color bhej rahe hain
            folder: folder || "📔 Diary"         // Naya: Folder bhej rahe hain
          } 
        ]);

      if (error) {
        console.log("Cloud Save Error ❌:", error);
      } else {
        console.log("Pura Note Cloud par save ho gaya! ✅☁️");
      }
    } catch (err) {
      console.log("Network error ❌:", err);
    }

    // Pehle jaise phone mein bhi save kar rahe hain (Offline backup ke liye)
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
            
