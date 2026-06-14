import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Keyboard,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import DailyStreakWidget from '../components/DailyStreakWidget';
import StudygramShareModal from '../components/StudygramShareModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 14) / 2;

// 🚀 NAYA: Premium Frosted Glass Colors (Apple iOS Style)
const SUBJECT_GLASS = {
  '📓 Physics':  { tint: '#E3EDF4', emoji: '📓' },
  '📐 Maths':    { tint: '#E5EFE4', emoji: '📐' },
  '🧬 Biology':  { tint: '#EDE7F4', emoji: '🧬' },
  '📝 Journal':  { tint: '#F6E4E7', emoji: '📝' },
  '💡 Ideas':    { tint: '#F4EBE0', emoji: '💡' },
};
const DEFAULT_GLASS = { tint: '#EAEAEA', emoji: '📂' };

function getGlassPalette(subject) {
  return SUBJECT_GLASS[subject] || DEFAULT_GLASS;
}

// 🚀 NAYA: Frosted Glass Collection Card
function CollectionCard({ subject, count, isActive, onPress }) {
  const palette = getGlassPalette(subject);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const labelText = subject.replace(/^\S+\s/, '');

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.glassCard,
          { backgroundColor: palette.tint }, // Soft pastel tint
          isActive && styles.glassCardActive,
        ]}
      >
        <View style={styles.glassInner}>
          <Text style={styles.glassEmoji}>{palette.emoji}</Text>

          <View style={styles.glassMeta}>
            <Text style={styles.glassSubjectName} numberOfLines={1}>
              {labelText}
            </Text>
            <Text style={styles.glassNoteCount}>
              {count} {count === 1 ? 'note' : 'notes'}
            </Text>
          </View>

          {isActive && <View style={styles.activeDot} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 📓 UNCHANGED: The Notebook Note Card
function NoteCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.notebookCard, { backgroundColor: item.color || '#FDF6F5' }]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
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
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title || 'Untitled Session'}
        </Text>
        <Text style={styles.cardSnippet} numberOfLines={3}>
          {item.content || 'Tap to study...'}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.cardDate}>{item.date?.split(' ')[0]}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// 🚀 NAYA: onLogout added to props
export default function HomeScreen({ notes, onSelectNote, onCreateNew, onLogout }) {
  const [activeSubject, setActiveSubject] = useState('All Notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const allSubjects = ['All Notes', '📓 Physics', '📐 Maths', '🧬 Biology', '📝 Journal', '💡 Ideas'];

  const filteredNotes = notes.filter(n => {
    const matchesSubject = activeSubject === 'All Notes' ? true : n.folder === activeSubject;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesSubject;
    const matchesSearch =
      (n.title || '').toLowerCase().includes(query) ||
      (n.content || '').toLowerCase().includes(query) ||
      (n.folder || '').toLowerCase().includes(query);
    return matchesSubject && matchesSearch;
  });

  // 🚀 NAYA FIX: Accurate Folder Note Count Fix!
  function countForSubject(subject) {
    if (subject === 'All Notes') return notes.length;
    
    // Remove emoji and spaces to get clean subject text (e.g., "📓 Physics" -> "physics")
    const cleanSubject = subject.replace(/^\S+\s/, '').toLowerCase().trim();
    
    return notes.filter(n => {
      const noteFolder = (n.folder || '').toLowerCase().trim();
      return noteFolder.includes(cleanSubject) || cleanSubject.includes(noteFolder);
    }).length;
  }

  const recentHeader = () => {
    const label = activeSubject === 'All Notes' ? 'All Notes' : activeSubject.replace(/^\S+\s/, '');
    const count = filteredNotes.length;
    return (
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recent Notes</Text>
          <Text style={styles.sectionSubtitle}>
            {searchQuery
              ? `${count} result${count !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${count} ${count === 1 ? 'note' : 'notes'} in ${label}`}
          </Text>
        </View>
      </View>
    );
  };

  // 🚀 NAYA: The Static Header (Keeps Keyboard from Dismissing!)
  const renderStaticHeader = () => (
    <View style={styles.staticHeader}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Ready to Focus? ✨</Text>
          <Text style={styles.headerTitle}>My Study Space</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareIconBtn} onPress={() => setShowShareModal(true)}>
            <Text style={styles.shareIconText}>📸</Text>
          </TouchableOpacity>
          {/* 🚀 NAYA: Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes, topics..."
          placeholderTextColor="#A09E9F"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderScrollableHeader = () => (
    <View style={{ paddingTop: 6 }}>
      <View style={styles.widgetContainer}>
        <DailyStreakWidget />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Knowledge Vault</Text>
          <Text style={styles.sectionSubtitle}>
            {allSubjects.length - 1} collections · {notes.length} notes total
          </Text>
        </View>
        <TouchableOpacity onPress={() => setActiveSubject('All Notes')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.collectionsGrid}>
        {/* The 'All Notes' Glass Card */}
        <TouchableOpacity
          style={[styles.glassCardWide, activeSubject === 'All Notes' && styles.glassCardActive]}
          onPress={() => setActiveSubject('All Notes')}
          activeOpacity={0.8}
        >
          <View style={styles.glassInnerWide}>
            <Text style={styles.glassEmojiWide}>🗂</Text>
            <View>
              <Text style={styles.glassSubjectName}>All Notes</Text>
              <Text style={styles.glassNoteCount}>{notes.length} notes across all vaults</Text>
            </View>
          </View>
          {activeSubject === 'All Notes' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <View style={styles.collectionsRow}>
          {allSubjects.slice(1).map((subject) => (
            <CollectionCard
              key={subject}
              subject={subject}
              count={countForSubject(subject)}
              isActive={activeSubject === subject}
              onPress={() => setActiveSubject(activeSubject === subject ? 'All Notes' : subject)}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />
      {recentHeader()}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🚀 Static Header outside the ScrollView fixes the Keyboard Bug! */}
      {renderStaticHeader()}

      {filteredNotes.length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {renderScrollableHeader()}
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🪹</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No results found.' : `No notes in ${activeSubject.replace(/^\S+\s/, '')} yet.`}
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery
                ? 'Try a different keyword!'
                : 'Start building your knowledge vault!'}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteCard item={item} onPress={onSelectNote} />
          )}
          numColumns={2}
          ListHeaderComponent={renderScrollableHeader()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={onCreateNew}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>

      <StudygramShareModal visible={showShareModal} onClose={() => setShowShareModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F2', // Premium Alabaster Background
  },
  staticHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    backgroundColor: '#F8F6F2',
    paddingBottom: 10,
    zIndex: 10, 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 14,
    color: '#8A8788',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D2A2E',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareIconBtn: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shareIconText: { fontSize: 16 },
  logoutBtn: {
    backgroundColor: '#FFF0F3', // Soft red background for logout
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 186, 0.4)',
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutBtnText: { fontSize: 16 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#2D2A2E', height: '100%' },
  clearSearchBtn: {
    padding: 5,
    backgroundColor: '#F0EDE8',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: { fontSize: 11, color: '#8A8788', fontWeight: '900' },
  
  widgetContainer: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D2A2E',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8A8788',
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    color: '#B5838D',
    fontWeight: '700',
  },
  collectionsGrid: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  // 🚀 NAYA: Premium Frosted Glass CSS
  glassCardWide: {
    width: '100%',
    height: 76,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    marginBottom: 14,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  glassInnerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
  },
  glassEmojiWide: { fontSize: 32 },
  collectionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  glassCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  glassCardActive: {
    borderColor: '#B5838D',
    borderWidth: 1.5,
  },
  glassInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  glassEmoji: {
    fontSize: 32,
  },
  glassMeta: {
    gap: 4,
  },
  glassSubjectName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D2A2E',
    letterSpacing: -0.2,
  },
  glassNoteCount: {
    fontSize: 12,
    color: '#8A8788',
    fontWeight: '600',
  },
  activeDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B5838D',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 120,
  },

  // 📓 UNCHANGED: NoteCard Styles
  notebookCard: {
    flex: 0.5,
    margin: 6,
    borderRadius: 16,
    minHeight: 175,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  binderStrip: {
    width: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  binderHole: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FDFBF7',
  },
  notebookContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 10,
  },
  notebookLabel: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  labelSubject: {
    fontSize: 9,
    color: '#555',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D2A2E',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardSnippet: {
    fontSize: 12,
    color: '#777',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 7,
  },
  cardDate: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 60,
  },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  emptyText: {
    fontSize: 17,
    color: '#2D2A2E',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8A8788',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 38,
    backgroundColor: '#2D2A2E',
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#2D2A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  fabText: { fontSize: 26, marginLeft: 2 },
});
          
