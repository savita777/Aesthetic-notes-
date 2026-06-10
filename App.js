import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen'; 

// ☁️ Cloud aur Auth yahan import kiya
import { supabase } from './supabase'; 
import AuthScreen from './AuthScreen'; // 🔒 NAYA: OTP Login Screen

import HomeScreen from './src/screens/HomeScreen';
import NoteScreen from './src/screens/NoteScreen';
import { Colors } from './src/theme/colors';

SplashScreen.preventAutoHideAsync();

// --- 🎨 NAYA: Claude ki Premium Splash Screen UI ---
const CLAUDE_COLORS = { background: '#F8F9FA', accent: '#4A90E2' };

function SplashLoader() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.splashLogoMark}>
        <View style={styles.splashLogoInner} />
      </View>
      <Text style={styles.splashBrandName}>Lumina</Text>
      <ActivityIndicator color={CLAUDE_COLORS.accent} size="small" style={styles.splashSpinner} />
    </View>
  );
}
// --------------------------------------------------

export default function App() {
  // 🔒 NAYA: Auth Session Check karne ke liye State
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // 📔 PURANA: Notes ki State
  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [selectedNote, setSelectedNote] = useState(null);

  // 🔒 NAYA: App khulte hi Login Check Karega
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
      if (initializing) setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ⏱️ PURANA: Expo Splash Screen Timer
  useEffect(() => {
    setTimeout(async () => {
      await SplashScreen.hideAsync(); 
    }, 3000); 
  }, []);

  // 📔 PURANA: Storage se notes load karna
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

  // ☁️ PURANA: Note Save aur Cloud Sync Logic
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

    try {
      const { error } = await supabase
        .from('notes')
        .insert([
          { 
            title: title || "Untitled",
            content: content || "Khali note",
            color: color || "#FDF6F5",
            folder: folder || "📔 Diary"
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

    saveNotesToStorage(updatedNotes);
    setCurrentScreen('home');
    setSelectedNote(null);
  };

  // 🛑 GATEKEEPER 1: Jab tak check ho raha hai, Loading (Splash) dikhao
  if (initializing) {
    return <SplashLoader />;
  }

  // 🛑 GATEKEEPER 2: Agar User login nahi hai, toh OTP screen par bhejo
  if (!session) {
    return <AuthScreen />;
  }

  // ✅ GATE OPEN: Agar sab sahi hai, toh AAPKI PURANI MAIN APP dikhao
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

// 🎨 Styles mein purana aur naya dono merge kar diya
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  
  // Splash Screen Styles (Claude)
  splashContainer: {
    flex: 1,
    backgroundColor: CLAUDE_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: CLAUDE_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: CLAUDE_COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  splashLogoInner: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  splashBrandName: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1D23',
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  splashSpinner: {
    marginTop: 4,
  },
});
        
