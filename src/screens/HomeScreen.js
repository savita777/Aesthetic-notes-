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
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
// 🚀 NAYA: FileSystem import kiya crash fix ke liye
import * as FileSystem from 'expo-file-system'; 

import { Colors } from '../theme/colors';
import DailyStreakWidget from '../components/DailyStreakWidget';
import StudygramShareModal from '../components/StudygramShareModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 14) / 2;

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

function CollectionCard({ subject, count, isActive, onPress }) {
  const palette = getGlassPalette(subject);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const labelText = subject.replace(/^\S+\s/, '');

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity activeOpacity={0.8} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={[styles.glassCard, { backgroundColor: palette.tint }, isActive && styles.glassCardActive]}>
        <View style={styles.glassInner}>
          <Text style={styles.glassEmoji}>{palette.emoji}</Text>
          <View style={styles.glassMeta}>
            <Text style={styles.glassSubjectName} numberOfLines={1}>{labelText}</Text>
            <Text style={styles.glassNoteCount}>{count} {count === 1 ? 'note' : 'notes'}</Text>
          </View>
          {isActive && <View style={styles.activeDot} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function NoteCard({ item, onPress }) {
  return (
    <TouchableOpacity style={[styles.notebookCard, { backgroundColor: item.color || '#FDF6F5' }]} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={styles.binderStrip}>
        <View style={styles.binderHole} /><View style={styles.binderHole} /><View style={styles.binderHole} /><View style={styles.binderHole} /><View style={styles.binderHole} />
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
}

function FocusReadBanner({ onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[styles.focusBanner, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={styles.focusBannerInner}>
        <View style={styles.focusBannerLeft}>
          <View style={styles.focusBannerIconWrap}>
            <Feather name="book-open" size={20} color="#5C4B8A" />
          </View>
          <View>
            <Text style={styles.focusBannerTitle}>Focus Read</Text>
            <Text style={styles.focusBannerSub}>Deep read mode · PDF + Notes</Text>
          </View>
        </View>
        <View style={styles.focusBannerArrow}>
          <Feather name="arrow-right" size={16} color="#8B7AB5" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ notes, onSelectNote, onCreateNew, onLogout, onOpenDeepRead }) {
  const [activeSubject, setActiveSubject] = useState('All Notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const allSubjects = ['All Notes', '📓 Physics', '📐 Maths', '🧬 Biology', '📝 Journal', '💡 Ideas'];

  const filteredNotes = notes.filter(n => {
    const matchesSubject = activeSubject === 'All Notes' ? true : n.folder === activeSubject;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesSubject;
    return matchesSubject && ((n.title || '').toLowerCase().includes(query) || (n.content || '').toLowerCase().includes(query) || (n.folder || '').toLowerCase().includes(query));
  });

  function countForSubject(subject) {
    if (subject === 'All Notes') return notes.length;
    const cleanSubject = subject.replace(/^\S+\s/, '').toLowerCase().trim();
    return notes.filter(n => {
      const noteFolder = (n.folder || '').toLowerCase().trim();
      return noteFolder.includes(cleanSubject) || cleanSubject.includes(noteFolder);
    }).length;
  }

  // 🚀 NAYA: CRASH FIX - Local Absolute Path logic added
  const handleOpenFocusRead = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        let safeUri = result.assets[0].uri;
        
        // Convert content:// to an absolute file:// path for Android PDF Viewer
        if(Platform.OS === 'android' && safeUri.startsWith('content://')){
          const fileInfo = await FileSystem.getInfoAsync(safeUri);
          if(fileInfo.exists) {
            safeUri = fileInfo.uri;
          }
        }
        
        onOpenDeepRead(safeUri);
      }
    } catch (err) {
      console.log("Error selecting PDF:", err);
    }
  };

  const recentHeader = () => {
    const label = activeSubject === 'All Notes' ? 'All Notes' : activeSubject.replace(/^\S+\s/, '');
    const count = filteredNotes.length;
    return (
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recent Notes</Text>
          <Text style={styles.sectionSubtitle}>{searchQuery ? `${count} results for "${searchQuery}"` : `${count} ${count === 1 ? 'note' : 'notes'} in ${label}`}</Text>
        </View>
      </View>
    );
  };

  const renderStaticHeader = () => (
    <View style={styles.staticHeader}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Your Private Library</Text>
          <Text style={styles.headerTitle}>My Study Space</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareIconBtn} onPress={() => setShowShareModal(true)}>
            <Feather name="camera" size={18} color="#2D2A2E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Feather name="log-out" size={18} color="#D9534F" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#A09E9F" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Search notes, topics..." placeholderTextColor="#A09E9F" value={searchQuery} onChangeText={setSearchQuery} returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} autoCorrect={false} />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }} style={styles.clearSearchBtn}><Text style={styles.clearSearchText}>✕</Text></TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderScrollableHeader = () => (
    <View style={{ paddingTop: 6 }}>
      
      <View style={styles.widgetContainer}>
        <DailyStreakWidget />
      </View>

      <FocusReadBanner onPress={handleOpenFocusRead} />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Knowledge Vault</Text>
          <Text style={styles.sectionSubtitle}>{allSubjects.length - 1} collections · {notes.length} notes total</Text>
        </View>
        <TouchableOpacity onPress={() => setActiveSubject('All Notes')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>

      <View style={styles.collectionsGrid}>
        <TouchableOpacity style={[styles.glassCardWide, activeSubject === 'All Notes' && styles.glassCardActive]} onPress={() => setActiveSubject('All Notes')} activeOpacity={0.8}>
          <View style={styles.glassInnerWide}>
            <Feather name="layers" size={28} color="#2D2A2E" />
            <View>
              <Text style={styles.glassSubjectName}>All Notes</Text>
              <Text style={styles.glassNoteCount}>{notes.length} notes across all vaults</Text>
            </View>
          </View>
          {activeSubject === 'All Notes' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <View style={styles.collectionsRow}>
          {allSubjects.slice(1).map((subject) => (
            <CollectionCard key={subject} subject={subject} count={countForSubject(subject)} isActive={activeSubject === subject} onPress={() => setActiveSubject(activeSubject === subject ? 'All Notes' : subject)} />
          ))}
        </View>
      </View>

      <View style={styles.divider} />
      {recentHeader()}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStaticHeader()}
      {filteredNotes.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 120 }}>
          {renderScrollableHeader()}
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={56} color="#C8BDBE" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>{searchQuery ? 'No results found.' : `No notes in ${activeSubject.replace(/^\S+\s/, '')} yet.`}</Text>
            <Text style={styles.emptySubText}>{searchQuery ? 'Try a different keyword!' : 'Start building your knowledge vault!'}</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList data={filteredNotes} keyExtractor={(item) => item.id} renderItem={({ item }) => <NoteCard item={item} onPress={onSelectNote} />} numColumns={2} ListHeaderComponent={renderScrollableHeader()} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" />
      )}
      <TouchableOpacity style={styles.fab} onPress={onCreateNew}>
        <Feather name="edit-2" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <StudygramShareModal visible={showShareModal} onClose={() => setShowShareModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6F2' },
  staticHeader: { paddingTop: Platform.OS === 'ios' ? 60 : 48, backgroundColor: '#F8F6F2', paddingBottom: 10, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  greetingText: { fontSize: 14, color: '#8A8788', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#2D2A2E', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  shareIconBtn: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { backgroundColor: '#FFF0F3', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 179, 186, 0.4)', shadowColor: '#FFB3BA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 18, paddingHorizontal: 16, height: 54, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#2D2A2E', height: '100%' },
  clearSearchBtn: { padding: 5, backgroundColor: '#F0EDE8', borderRadius: 12, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  clearSearchText: { fontSize: 11, color: '#8A8788', fontWeight: '900' },
  widgetContainer: { marginBottom: 24, width: '100%', alignItems: 'center' },
  focusBanner: { marginHorizontal: 20, marginBottom: 22, borderRadius: 20, backgroundColor: 'rgba(237, 230, 255, 0.75)', borderWidth: 1.5, borderColor: 'rgba(180, 160, 220, 0.35)', shadowColor: '#8B6FBF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 3 },
  focusBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  focusBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  focusBannerIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(200, 185, 240, 0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(180, 160, 220, 0.4)' },
  focusBannerTitle: { fontSize: 15, fontWeight: '800', color: '#3A2D5C', letterSpacing: -0.2, marginBottom: 2 },
  focusBannerSub: { fontSize: 12, color: '#8B7AB5', fontWeight: '600' },
  focusBannerArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(200, 185, 240, 0.4)', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#2D2A2E', letterSpacing: -0.3, marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, color: '#8A8788', fontWeight: '600' },
  seeAllText: { fontSize: 14, color: '#B5838D', fontWeight: '700' },
  collectionsGrid: { paddingHorizontal: 20, marginBottom: 8 },
  glassCardWide: { width: '100%', height: 76, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 24, marginBottom: 14, justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,1)', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  glassInnerWide: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  collectionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  glassCard: { width: CARD_WIDTH, height: CARD_WIDTH * 0.9, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  glassCardActive: { borderColor: '#B5838D', borderWidth: 1.5 },
  glassInner: { flex: 1, padding: 16, justifyContent: 'space-between' },
  glassEmoji: { fontSize: 32 },
  glassMeta: { gap: 4 },
  glassSubjectName: { fontSize: 16, fontWeight: '800', color: '#2D2A2E', letterSpacing: -0.2 },
  glassNoteCount: { fontSize: 12, color: '#8A8788', fontWeight: '600' },
  activeDot: { position: 'absolute', top: 16, right: 16, width: 10, height: 10, borderRadius: 5, backgroundColor: '#B5838D', borderWidth: 2, borderColor: '#FFF' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginHorizontal: 20, marginTop: 8, marginBottom: 24 },
  listContainer: { paddingHorizontal: 12, paddingBottom: 120 },
  notebookCard: { flex: 0.5, margin: 6, borderRadius: 16, minHeight: 175, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, flexDirection: 'row', overflow: 'hidden' },
  binderStrip: { width: 18, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'space-evenly', alignItems: 'center', borderRightWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  binderHole: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FDFBF7' },
  notebookContent: { flex: 1, padding: 12, paddingLeft: 10 },
  notebookLabel: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  labelSubject: { fontSize: 9, color: '#555', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2D2A2E', marginBottom: 6, lineHeight: 22 },
  cardSnippet: { fontSize: 12, color: '#777', flex: 1, lineHeight: 18 },
  footer: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 7 },
  cardDate: { fontSize: 10, color: '#999', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 20, paddingBottom: 60 },
  emptyIcon: { marginBottom: 14 },
  emptyText: { fontSize: 17, color: '#2D2A2E', fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  emptySubText: { fontSize: 14, color: '#8A8788', textAlign: 'center', lineHeight: 20 },
  fab: { position: 'absolute', right: 22, bottom: 38, backgroundColor: '#2D2A2E', width: 62, height: 62, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#2D2A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10 },
});
  
