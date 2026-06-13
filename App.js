import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen'; 

import { supabase } from './supabase'; 
import AuthScreen from './AuthScreen'; 

import HomeScreen from './src/screens/HomeScreen';
import NoteScreen from './src/screens/NoteScreen';
import { Colors } from './src/theme/colors';

// 🛡️ NAYA: Humara Vault Gate Import kiya gaya
import PrivacyGate from './src/components/PrivacyGate';

SplashScreen.preventAutoHideAsync();

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

export default function App() {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [selectedNote, setSelectedNote] = useState(null);

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

  useEffect(() => {
    setTimeout(async () => {
      await SplashScreen.hideAsync(); 
    }, 3000); 
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserNotes(session.user.id);
    } else {
      setNotes([]); 
    }
  }, [session]);

  // 🚀 NAYA: Secure Logout Function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      console.log("User successfully logged out! ✅");
    } catch (error) {
      console.log("Logout error ❌:", error);
    }
  };

  const fetchUserNotes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId); 

      if (error) {
        console.log("Cloud Fetch Error ❌:", error);
        const savedNotes = await AsyncStorage.getItem('@aesthetic_notes');
        if (savedNotes !== null) setNotes(JSON.parse(savedNotes));
        return;
      }

      if (data) {
        console.log("Cloud se User ke apne notes aagaye! ✅☁️");
        const reversedData = [...data].reverse(); 
        setNotes(reversedData);
        AsyncStorage.setItem('@aesthetic_notes', JSON.stringify(reversedData));
      }
    } catch (e) {
      console.log("Network error ❌:", e);
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

  const handleSaveNote = async (title, content, color, folder, doodle, placedItems) => {
    let updatedNotes = [...notes];
    const aestheticDate = getAestheticDate();
    
    const newNote = {
      id: Date.now().toString(),
      title, content, color, folder: folder || '📔 Diary', doodle, placedItems, date: aestheticDate
    };

    let isExistingNote = false;

    if (selectedNote) {
      isExistingNote = true;
      updatedNotes = notes.map(n => n.id === selectedNote.id ? { 
        ...n, title, content, color, folder, doodle, placedItems, date: aestheticDate 
      } : n);
    } else {
      updatedNotes.unshift(newNote); 
    }

    try {
      if (isExistingNote && selectedNote.id) {
        // 🚀 CTO'S SECRET FIX: Agar note pehle se hai toh Cloud par UPDATE karo, Duplicate mat banao
        const { error } = await supabase
          .from('notes')
          .update({
            title: title || "Untitled",
            content: content || "Khali note",
            color: color || "#FDF6F5",
            folder: folder || "📔 Diary"
          })
          .eq('id', selectedNote.id) // Assuming id matches
          .eq('user_id', session?.user?.id); // Extra security

        if (error) console.log("Cloud Update Error ❌:", error);
        else console.log("Note Cloud par Update ho gaya! ✅☁️");

      } else {
        // Naya Note Insert karo
        const { error } = await supabase
          .from('notes')
          .insert([
            { 
              title: title || "Untitled",
              content: content || "Khali note",
              color: color || "#FDF6F5",
              folder: folder || "📔 Diary",
              user_id: session?.user?.id 
            } 
          ]);

        if (error) console.log("Cloud Insert Error ❌:", error);
        else console.log("Naya Note Cloud par save ho gaya! ✅☁️");
      }
      
      fetchUserNotes(session.user.id);
    } catch (err) {
      console.log("Network error ❌:", err);
    }

    saveNotesToStorage(updatedNotes);
    setCurrentScreen('home');
    setSelectedNote(null);
  };

  // 🚀 NAYA: MASTER DELETE FUNCTION
  const handleDeleteNote = async (noteId) => {
    // 1. Turant Home screen se gayab karo (Local UI Update)
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    await AsyncStorage.setItem('@aesthetic_notes', JSON.stringify(updatedNotes));

    // 2. Cloud se hamesha ke liye uda do
    try {
      await supabase.from('notes').delete().eq('id', noteId).eq('user_id', session?.user?.id);
      console.log("✅ Note fully deleted from Cloud!");
    } catch (err) {
      console.log("Delete error:", err);
    }

    // 3. Wapas Home screen par jao
    setCurrentScreen('home');
    setSelectedNote(null);
  };

  if (initializing) {
    return <SplashLoader />;
  }

  // ✅ Yahi wo jageh hai jahan Login dikhta hai! (Agar session null ho)
  if (!session) {
    return <AuthScreen />;
  }

  // ✅ 🚀 CLEAN & FULLY MERGED NAVIGATION
  return (
    // 🛡️ NAYA: PrivacyGate se puri app wrap ho gayi hai. Lock screen ke baad hi children render honge.
    <PrivacyGate session={session}>
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
        
        {currentScreen === 'home' ? (
          <HomeScreen 
            notes={notes}
            onSelectNote={(note) => { setSelectedNote(note); setCurrentScreen('note'); }}
            onCreateNew={() => { setSelectedNote(null); setCurrentScreen('note'); }}
            onLogout={handleLogout} // 🚀 NAYA: Logout ka connection Home Screen ko de diya
          />
        ) : (
          <NoteScreen 
            note={selectedNote}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote} // 🚀 NAYA: Delete function passed to NoteScreen
            onBack={() => { setCurrentScreen('home'); setSelectedNote(null); }}
          />
        )}
      </SafeAreaView>
    </PrivacyGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  splashContainer: { flex: 1, backgroundColor: CLAUDE_COLORS.background, alignItems: 'center', justifyContent: 'center' },
  splashLogoMark: { width: 56, height: 56, borderRadius: 18, backgroundColor: CLAUDE_COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: CLAUDE_COLORS.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8 },
  splashLogoInner: { width: 24, height: 24, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.88)' },
  splashBrandName: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 28, fontWeight: '700', color: '#1A1D23', letterSpacing: 0.5, marginBottom: 24 },
  splashSpinner: { marginTop: 4 },
});
        
