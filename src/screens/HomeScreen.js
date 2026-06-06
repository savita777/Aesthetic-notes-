import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';

export default function HomeScreen({ notes, onSelectNote, onCreateNew }) {
  const [activeFolder, setActiveFolder] = useState('🌸 All');
  const allFolders = ['🌸 All', '📔 Diary', '📚 School', '✨ Ideas'];

  // Sirf chune hue folder ke notes dikhao
  const filteredNotes = activeFolder === '🌸 All' ? notes : notes.filter(n => n.folder === activeFolder);

  const renderNoteCard = ({ item }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: item.color || '#FFFFFF' }]} onPress={() => onSelectNote(item)}>
      <Text style={styles.cardFolder}>{item.folder || '📔 Diary'}</Text>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled 📝'}</Text>
      <Text style={styles.cardSnippet} numberOfLines={2}>{item.content || '...'}</Text>
      <Text style={styles.cardDate}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🌸 My Cute Diary 🌸</Text>

      {/* Folders Bar */}
      <View style={styles.folderScrollBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allFolders.map((f, i) => (
            <TouchableOpacity key={i} style={[styles.tabBtn, activeFolder === f && styles.tabBtnActive]} onPress={() => setActiveFolder(f)}>
              <Text style={[styles.tabText, activeFolder === f && styles.tabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Is folder mein kuch nahi hai... 😢</Text>
        </View>
      ) : (
        <FlatList data={filteredNotes} keyExtractor={(item) => item.id} renderItem={renderNoteCard} numColumns={2} contentContainerStyle={styles.listContainer} />
      )}

      <TouchableOpacity style={styles.fab} onPress={onCreateNew}><Text style={styles.fabText}>+</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 50, paddingHorizontal: 15 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.darkPink, textAlign: 'center', marginBottom: 15 },
  folderScrollBox: { marginBottom: 15, paddingVertical: 5 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#FFF', borderRadius: 20, marginRight: 10, elevation: 1 },
  tabBtnActive: { backgroundColor: Colors.darkPink },
  tabText: { color: Colors.textLight, fontWeight: 'bold' },
  tabTextActive: { color: '#FFF' },
  listContainer: { paddingBottom: 100 },
  card: { flex: 0.5, margin: 8, padding: 15, borderRadius: 20, minHeight: 140, elevation: 3 },
  cardFolder: { fontSize: 10, color: Colors.darkPink, fontWeight: 'bold', marginBottom: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginBottom: 5 },
  cardSnippet: { fontSize: 13, color: Colors.textDark, flex: 1 },
  cardDate: { fontSize: 11, color: Colors.textLight, marginTop: 5, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textLight, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 30, bottom: 40, backgroundColor: Colors.darkPink, width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#FFF', fontSize: 35, fontWeight: '300', marginTop: -3 }
});
                           
