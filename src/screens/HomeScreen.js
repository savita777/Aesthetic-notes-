import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export default function HomeScreen({ notes, onSelectNote, onCreateNew }) {
  
  const renderNoteCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => onSelectNote(item)}>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled Note 📝'}</Text>
      <Text style={styles.cardSnippet} numberOfLines={2}>{item.content || 'Khali note...'}</Text>
      <Text style={styles.cardDate}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>🌸 My Diary 🌸</Text>
      
      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Yahan abhi koi note nahi hai... 😢</Text>
          <Text style={styles.emptySubText}>Niche + daba kar pehla cute note likho! ✨</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteCard}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={onCreateNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 60, paddingHorizontal: 15 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.darkPink, textAlign: 'center', marginBottom: 20 },
  listContainer: { paddingBottom: 100 },
  card: { flex: 0.5, backgroundColor: Colors.cardBg, margin: 8, padding: 15, borderRadius: 20, minHeight: 130, elevation: 3, shadowColor: Colors.primaryPink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.darkPink, marginBottom: 5 },
  cardSnippet: { fontSize: 14, color: Colors.textDark, flex: 1 },
  cardDate: { fontSize: 11, color: Colors.textLight, marginTop: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: Colors.darkPink, fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: Colors.textDark, marginTop: 5 },
  fab: { position: 'absolute', right: 30, bottom: 40, backgroundColor: Colors.darkPink, width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  fabText: { color: '#FFF', fontSize: 35, fontWeight: '300', marginTop: -3 }
});
        
