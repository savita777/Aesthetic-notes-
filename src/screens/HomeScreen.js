import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';

import DailyStreakWidget from '../components/DailyStreakWidget';
import StudygramShareModal from '../components/StudygramShareModal';

// 🧪 NAYA: onTestEditor prop ab use nahi ho raha toh uski zaroorat nahi
export default function HomeScreen({ notes, onSelectNote, onCreateNew }) {
  const [activeSubject, setActiveSubject] = useState('All Notes');
  const allSubjects = ['All Notes', '📓 Physics', '📐 Maths', '🧬 Biology', '📝 Journal', '💡 Ideas'];

  const [showShareModal, setShowShareModal] = useState(false);

  const filteredNotes = activeSubject === 'All Notes' ? notes : notes.filter(n => n.folder === activeSubject);

  const renderNotebookCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notebookCard, { backgroundColor: item.color || '#FDF6F5' }]} 
      onPress={() => onSelectNote(item)}
    >
      <View style={styles.binderStrip}>
        <View style={styles.binderHole} />
        <View style={styles.binderHole} />
        <View style={styles.binderHole} />
        <View style={styles.binderHole} />
        <View style={styles.binderHole} />
      </View>

      <View style={styles.notebookContent}>
        <View style={styles.notebookLabel}>
          <Text style={styles.labelSubject}>{item.folder || '📝 Journal'}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title || 'Untitled Session'}</Text>
        <Text style={styles.cardSnippet} numberOfLines={3}>{item.content || 'Tap to study...'}</Text>
        <View style={styles.footer}>
          <Text style={styles.cardDate}>{item.date?.split(' ')[0]}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Ready to Focus? ✨</Text>
          <Text style={styles.headerTitle}>My Study Space</Text>
        </View>

        <TouchableOpacity style={styles.shareIconBtn} onPress={() => setShowShareModal(true)}>
          <Text style={styles.shareIconText}>📸 Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.widgetContainer}>
        <DailyStreakWidget />
      </View>

      <View style={styles.subjectScrollBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {allSubjects.map((subject, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.subjectBtn, activeSubject === subject && styles.subjectBtnActive]} 
              onPress={() => setActiveSubject(subject)}
            >
              <Text style={[styles.subjectText, activeSubject === subject && styles.subjectTextActive]}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🪹</Text>
          <Text style={styles.emptyText}>No notes in {activeSubject} yet.</Text>
          <Text style={styles.emptySubText}>Start building your aesthetic knowledge base!</Text>
        </View>
      ) : (
        <FlatList 
          data={filteredNotes} 
          keyExtractor={(item) => item.id} 
          renderItem={renderNotebookCard} 
          numColumns={2} 
          contentContainerStyle={styles.listContainer} 
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={onCreateNew}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>

      <StudygramShareModal 
        visible={showShareModal} 
        onClose={() => setShowShareModal(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', paddingTop: 60 }, 
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 }, 
  greetingText: { fontSize: 16, color: '#A09E9F', fontWeight: '600', marginBottom: 5 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#2D2A2E', letterSpacing: -0.5 },
  
  shareIconBtn: { backgroundColor: '#FFB3BA', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, elevation: 2, shadowColor: '#FFB3BA', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5 },
  shareIconText: { color: '#2D2A2E', fontWeight: '700', fontSize: 12 },

  widgetContainer: { marginBottom: 15, width: '100%', alignItems: 'center' },

  subjectScrollBox: { marginBottom: 20 },
  subjectBtn: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#FFFFFF', borderRadius: 25, marginRight: 12, borderWidth: 1, borderColor: '#EAE6E1', elevation: 0 },
  subjectBtnActive: { backgroundColor: '#2D2A2E', borderColor: '#2D2A2E' }, 
  subjectText: { color: '#8A8788', fontWeight: '600', fontSize: 14 },
  subjectTextActive: { color: '#FFF' },
  
  listContainer: { paddingHorizontal: 10, paddingBottom: 120 },
  
  notebookCard: { flex: 0.5, margin: 8, borderRadius: 16, minHeight: 180, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, flexDirection: 'row', overflow: 'hidden' },
  binderStrip: { width: 20, backgroundColor: '#rgba(255,255,255,0.3)', justifyContent: 'space-evenly', alignItems: 'center', borderRightWidth: 1, borderColor: '#rgba(0,0,0,0.05)' },
  binderHole: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FAF8F5' }, 
  notebookContent: { flex: 1, padding: 12, paddingLeft: 8 },
  notebookLabel: { alignSelf: 'flex-start', backgroundColor: '#rgba(255,255,255,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  labelSubject: { fontSize: 10, color: '#555', fontWeight: '800', textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#2D2A2E', marginBottom: 8, lineHeight: 22 },
  cardSnippet: { fontSize: 13, color: '#666', flex: 1, lineHeight: 18 },
  footer: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#rgba(0,0,0,0.05)', paddingTop: 8 },
  cardDate: { fontSize: 11, color: '#888', fontWeight: '600' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 18, color: '#2D2A2E', fontWeight: '700', textAlign: 'center', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#A09E9F', textAlign: 'center', lineHeight: 20 },
  
  fab: { position: 'absolute', right: 25, bottom: 40, backgroundColor: '#2D2A2E', width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#2D2A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabText: { fontSize: 26, marginLeft: 3 }
});
  
