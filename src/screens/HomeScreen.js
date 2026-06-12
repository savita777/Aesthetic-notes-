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
const CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 12) / 2; 

const SUBJECT_PALETTE = {
  '📓 Physics':  { spine: '#A8C5DA', bg: '#F0F6FA', emoji: '📓' },
  '📐 Maths':    { spine: '#B5C9A8', bg: '#F2F7F0', emoji: '📐' },
  '🧬 Biology':  { spine: '#C5B8DA', bg: '#F5F1FA', emoji: '🧬' },
  '📝 Journal':  { spine: '#B5838D', bg: '#FDF0F2', emoji: '📝' },
  '💡 Ideas':    { spine: '#D4B896', bg: '#FAF5EF', emoji: '💡' },
};
const DEFAULT_PALETTE = { spine: '#C4BDB8', bg: '#F7F4F1', emoji: '📂' };

function getSubjectPalette(subject) {
  return SUBJECT_PALETTE[subject] || DEFAULT_PALETTE;
}

function CollectionCard({ subject, count, isActive, onPress }) {
  const palette = getSubjectPalette(subject);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const labelText = subject.replace(/^\S+\s/, '');

  return (
    <Animated.View [{ scale: scaleAnim style="{{" transform: }] }}>
      <TouchableOpacity && ]} activeOpacity="{1}" backgroundColor: isActive onPress="{onPress}" onPressIn="{handlePressIn}" onPressOut="{handlePressOut}" palette.bg style="{[" styles.collectionCard, styles.collectionCardActive, { },>
        <View backgroundColor: palette.spine style="{[styles.collectionSpine," { }]}>
          <Text numberOfLines="{4}" style="{styles.spineLabel}">
            {labelText.toUpperCase()}
          </Text>
        </View>

        <View style="{styles.collectionBody}">
          <View style="{styles.ruledLines}">
            <View style="{styles.ruledLine}"/>
            <View style="{styles.ruledLine}"/>
            <View style="{styles.ruledLine}"/>
          </View>

          <Text style="{styles.collectionEmoji}">{palette.emoji}</Text>

          <View style="{styles.collectionMeta}">
            <Text numberOfLines="{1}" style="{styles.collectionSubjectName}">
              {labelText}
            </Text>
            <Text style="{styles.collectionNoteCount}">
              {count} {count === 1 ? 'note' : 'notes'}
            </Text>
          </View>

          {isActive && <View backgroundColor: palette.spine style="{[styles.activeDot," { }]}/>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function NoteCard({ item, onPress }) {
  return (
    <TouchableOpacity '#FDF6F5' backgroundColor: item.color onPress="{()" style="{[styles.notebookCard," { || }]}> onPress(item)}
      activeOpacity={0.8}
    >
      <View style="{styles.binderStrip}">
        <View style="{styles.binderHole}"/>
        <View style="{styles.binderHole}"/>
        <View style="{styles.binderHole}"/>
        <View style="{styles.binderHole}"/>
        <View style="{styles.binderHole}"/>
      </View>

      <View style="{styles.notebookContent}">
        <View style="{styles.notebookLabel}">
          <Text style="{styles.labelSubject}">{item.folder || '📝 Journal'}</Text>
        </View>
        <Text numberOfLines="{2}" style="{styles.cardTitle}">
          {item.title || 'Untitled Session'}
        </Text>
        <Text numberOfLines="{3}" style="{styles.cardSnippet}">
          {item.content || 'Tap to study...'}
        </Text>
        <View style="{styles.footer}">
          <Text style="{styles.cardDate}">{item.date?.split(' ')[0]}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ notes, onSelectNote, onCreateNew }) {
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

  function countForSubject(subject) {
    if (subject === 'All Notes') return notes.length;
    return notes.filter(n => n.folder === subject).length;
  }

  const recentHeader = () => {
    const label = activeSubject === 'All Notes' ? 'All Notes' : activeSubject.replace(/^\S+\s/, '');
    const count = filteredNotes.length;
    return (
      <View style="{styles.sectionHeader}">
        <View>
          <Text style="{styles.sectionTitle}">Recent Notes</Text>
          <Text style="{styles.sectionSubtitle}">
            {searchQuery
              ? `${count} result${count !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${count} ${count === 1 ? 'note' : 'notes'} in ${label}`}
          </Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      <View style="{styles.header}">
        <View>
          <Text style="{styles.greetingText}">Ready to Focus? ✨</Text>
          <Text style="{styles.headerTitle}">My Study Space</Text>
        </View>
        <TouchableOpacity onPress="{()" style="{styles.shareIconBtn}"> setShowShareModal(true)}
        >
          <Text style="{styles.shareIconText}">📸 Share</Text>
        </TouchableOpacity>
      </View>

      <View style="{styles.searchContainer}">
        <Text style="{styles.searchIcon}">🔍</Text>
        <TextInput onChangeText="{setSearchQuery}" onSubmitEditing="{()" placeholder="Search notes, topics, or keywords..." placeholderTextColor="#A09E9F" returnKeyType="search" style="{styles.searchInput}" value="{searchQuery}"> Keyboard.dismiss()}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress="{()"> { setSearchQuery(''); Keyboard.dismiss(); }}
            style={styles.clearSearchBtn}
          >
            <Text style="{styles.clearSearchText}">✕</Text>
          </TouchableOpacity>
        )}
      </TextInput></View>

      <View style="{styles.widgetContainer}">
        <DailyStreakWidget/>
      </View>

      <View style="{styles.sectionHeader}">
        <View>
          <Text style="{styles.sectionTitle}">Knowledge Vault</Text>
          <Text style="{styles.sectionSubtitle}">
            {allSubjects.length - 1} collections · {notes.length} notes total
          </Text>
        </View>
        <TouchableOpacity onPress="{()"> setActiveSubject('All Notes')}>
          <Text style="{styles.seeAllText}">See All</Text>
        </TouchableOpacity>
      </View>

      <View style="{styles.collectionsGrid}">
        <TouchableOpacity && 'All Notes' ]} activeSubject="==" onPress="{()" style="{[" styles.allNotesCard, styles.allNotesCardActive,> setActiveSubject('All Notes')}
          activeOpacity={0.85}
        >
          <View && 'All Notes' activeSubject="==" style="{[styles.allNotesSpine," styles.allNotesSpineActive]}/>
          <View style="{styles.allNotesBody}">
            <Text style="{styles.allNotesEmoji}">🗂</Text>
            <View>
              <Text style="{styles.allNotesTitle}">All Notes</Text>
              <Text style="{styles.allNotesCount}">{notes.length} notes across all vaults</Text>
            </View>
          </View>
          {activeSubject === 'All Notes' && <View style="{styles.allNotesActiveDot}"/>}
        </TouchableOpacity>

        <View style="{styles.collectionsRow}">
          {allSubjects.slice(1).map((subject) => (
            <CollectionCard count="{countForSubject(subject)}" isActive="{activeSubject" key="{subject}" onPress="{()" subject="{subject}" subject}> setActiveSubject(activeSubject === subject ? 'All Notes' : subject)}
            />
          ))}
        </CollectionCard></View>
      </View>

      <View style="{styles.divider}"/>
      {recentHeader()}
    </>
  );

  return (
    <View style="{styles.container}">
      {filteredNotes.length === 0 ? (
        <ScrollView 120 contentContainerStyle="{{" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" paddingBottom: showsVerticalScrollIndicator="{false}" }}>
          <ListHeader/>
          <View style="{styles.emptyContainer}">
            <Text style="{styles.emptyIcon}">🪹</Text>
            <Text style="{styles.emptyText}">
              {searchQuery ? 'No results found.' : `No notes in ${activeSubject.replace(/^\S+\s/, '')} yet.`}
            </Text>
            <Text style="{styles.emptySubText}">
              {searchQuery
                ? 'Try a different keyword!'
                : 'Start building your knowledge vault!'}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList data="{filteredNotes}" keyExtractor="{(item)"> item.id}
          renderItem={({ item }) => (
            <NoteCard item="{item}" onPress="{onSelectNote}"/>
          )}
          numColumns={2}
          ListHeaderComponent={<ListHeader/>}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      <TouchableOpacity onPress="{onCreateNew}" style="{styles.fab}">
        <Text style="{styles.fabText}">✏️</Text>
      </TouchableOpacity>

      <StudygramShareModal onClose="{()" visible="{showShareModal}"> setShowShareModal(false)}
      />
    </StudygramShareModal></FlatList></View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  greetingText: {
    fontSize: 15,
    color: '#A09E9F',
    fontWeight: '600',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2D2A2E',
    letterSpacing: -0.5,
  },
  shareIconBtn: {
    backgroundColor: '#FFB3BA',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  shareIconText: {
    color: '#2D2A2E',
    fontWeight: '700',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 52,
    borderWidth: 1,
    borderColor: '#EAE6E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#2D2A2E', height: '100%' },
  clearSearchBtn: {
    padding: 5,
    backgroundColor: '#F0EDE8',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: { fontSize: 10, color: '#8A8788', fontWeight: '900' },
  widgetContainer: {
    marginBottom: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2A2E',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#A09E9F',
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 13,
    color: '#B5838D',
    fontWeight: '600',
  },
  collectionsGrid: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  allNotesCard: {
    width: '100%',
    height: 68,
    backgroundColor: '#F7F4F1',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EDE8E0',
  },
  allNotesCardActive: {
    borderColor: '#B5838D',
    borderWidth: 1.5,
  },
  allNotesSpine: {
    width: 6,
    height: '100%',
    backgroundColor: '#C4BDB8',
  },
  allNotesSpineActive: {
    backgroundColor: '#B5838D',
  },
  allNotesBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  allNotesEmoji: { fontSize: 26 },
  allNotesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D2A2E',
    marginBottom: 2,
  },
  allNotesCount: {
    fontSize: 12,
    color: '#A09E9F',
    fontWeight: '500',
  },
  allNotesActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B5838D',
    marginRight: 16,
  },
  collectionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  collectionCard: {
    width: CARD_WIDTH,
    height: 148,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  collectionCardActive: {
    borderWidth: 1.5,
    borderColor: '#B5838D',
    elevation: 4,
    shadowOpacity: 0.12,
  },
  collectionSpine: {
    width: 22,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  spineLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    textAlign: 'center',
    transform: [{ rotate: '180deg' }],
  },
  collectionBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  ruledLines: {
    gap: 5,
    marginBottom: 4,
  },
  ruledLine: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 1,
  },
  collectionEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  collectionMeta: {
    gap: 2,
  },
  collectionSubjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D2A2E',
    letterSpacing: -0.2,
  },
  collectionNoteCount: {
    fontSize: 11,
    color: '#A09E9F',
    fontWeight: '500',
  },
  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE8E0',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 120,
  },
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
    color: '#A09E9F',
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
