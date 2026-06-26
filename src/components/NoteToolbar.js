import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MicButton } from './AudioRecorder'; // Kyunki dono components folder me hain, isliye ./ use hoga

const washiColors = ['#FFD1DC', '#FDFD96', '#C1E1C1', '#AEC6CF', '#E6E6FA'];

export default function NoteToolbar({ theme, onAiPress, onMicComplete, onMarkPress, onWashiPress, onDrawPress }) {
  return (
    <View style={[styles.toolboxBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
        
        {/* ✨ AI Spark */}
        <TouchableOpacity onPress={onAiPress} style={[styles.aiBtn, { backgroundColor: theme.accent }]}>
          <Feather name="zap" size={14} color="#FFFFFF" />
          <Text style={styles.aiBtnText}>AI Spark</Text>
        </TouchableOpacity>
        
        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

        {/* 🎙️ Mic / Audio */}
        <MicButton onRecordingComplete={onMicComplete} />
        
        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

        {/* 🖍️ Mark / Highlight */}
        <TouchableOpacity onPress={onMarkPress} style={[styles.highlightBtn, { backgroundColor: theme.accentSoft }]}>
          <Feather name="edit-3" size={14} color={theme.text} />
          <Text style={[styles.highlightBtnText, { color: theme.text }]}>Mark</Text>
        </TouchableOpacity>
        
        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
        
        {/* 〰️ Washi Tapes (Emojis yahan se clean kar diye) */}
        <Text style={[styles.toolLabel, { color: theme.muted }]}>Washi:</Text>
        {washiColors.map((color, index) => (
            <TouchableOpacity 
              key={'wsh'+index} 
              onPress={() => onWashiPress(color)} 
              style={[styles.washiIcon, {backgroundColor: color}]} 
            />
        ))}
        
        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
        
        {/* ✏️ Draw */}
        <TouchableOpacity onPress={onDrawPress} style={[styles.drawBtn, { backgroundColor: theme.accentSoft }]}>
          <Feather name="pen-tool" size={14} color={theme.text} />
          <Text style={[styles.drawBtnText, { color: theme.text }]}>Draw</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolboxBar: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, elevation: 1 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  aiBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  highlightBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 5 },
  highlightBtnText: { fontWeight: 'bold', fontSize: 13 },
  toolLabel: { fontSize: 12, fontWeight: 'bold', marginHorizontal: 5 },
  washiIcon: { width: 30, height: 12, transform: [{rotate: '-5deg'}], marginHorizontal: 5, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  verticalDivider: { width: 1, height: 25, marginHorizontal: 10 },
  drawBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  drawBtnText: { fontWeight: 'bold', fontSize: 13 },
});

