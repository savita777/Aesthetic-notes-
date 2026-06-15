import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
// 🚀 NAYA: Asli PDF Engine Import
import Pdf from 'react-native-pdf';

const { width: W, height: H } = Dimensions.get('window');

const SAFE_TOP       = Platform.OS === 'ios' ? 52 : 36;
const NAV_BAR_H      = 52;
const DIVIDER_H      = 36;
const USABLE_H       = H - SAFE_TOP - NAV_BAR_H - DIVIDER_H;
const MIN_PANEL_FRAC = 0.18;   
const DEFAULT_SPLIT  = 0.50;   

const L = {
  bg:          '#F8F6F2',
  surface:     '#FFFFFF',
  card:        '#F2EFE9',
  border:      '#E8E3DB',
  accent:      '#B5838D',
  accentSoft:  '#F2E8EA',
  text:        '#2D2A2E',
  muted:       '#9B9099',
  dividerBg:   'rgba(248,246,242,0.95)',
  shadow:      '#2D2A2E',
};

function PdfPanel({ pdfUri, height }) {
  return (
    <View style={[pdfStyles.container, { height }]}>
      <View style={pdfStyles.toolbar}>
        <TouchableOpacity style={pdfStyles.toolBtn}>
          <Feather name="chevron-left" size={16} color={L.muted} />
        </TouchableOpacity>
        <Text style={pdfStyles.pageLabel}>PDF Viewer</Text>
        <TouchableOpacity style={pdfStyles.toolBtn}>
          <Feather name="chevron-right" size={16} color={L.muted} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1, backgroundColor: '#EAE6E1' }}>
        {pdfUri ? (
          <Pdf
            source={{ uri: pdfUri, cache: true }}
            style={{ flex: 1, width: W }}
            trustAllCerts={false}
            onLoadComplete={(numberOfPages, filePath) => {
               console.log(`Number of pages: ${numberOfPages}`);
            }}
            onPageChanged={(page,numberOfPages) => {
               console.log(`Current page: ${page}`);
            }}
            onError={(error) => {
               console.log("PDF Error:", error);
            }}
          />
        ) : (
          <View style={pdfStyles.mockPage}>
            <Text style={pdfStyles.placeholderHint}>
              No PDF Selected.{'\n'}Go back and select a document to focus read.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const pdfStyles = StyleSheet.create({
  container: { backgroundColor: L.card, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: L.border, backgroundColor: L.surface, gap: 4 },
  toolBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: L.card, alignItems: 'center', justifyContent: 'center' },
  pageLabel: { fontSize: 12, color: L.text, fontWeight: '700', marginHorizontal: 8 },
  mockPage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholderHint: { fontSize: 13, color: L.muted, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
});

function NotesPanel({ height, note }) {
  return (
    <View style={[notesStyles.container, { height }]}>
      <View style={notesStyles.panelHeader}>
        <Text style={notesStyles.panelLabel}>📝 Notes</Text>
        <Text style={notesStyles.linkedLabel}>Linked to this reading</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={notesStyles.scrollContent} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={notesStyles.noteTitle} numberOfLines={1}>{note?.title || 'Deep Reading Notes'}</Text>
        
        <View style={notesStyles.editorPlaceholder}>
          <View style={notesStyles.cursorLine}>
            <View style={notesStyles.cursor} />
          </View>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={[notesStyles.draftLine, { width: i === 4 ? '55%' : '100%' }]} />
          ))}
          <Text style={notesStyles.editorHint}>Rich Text Editor links here in next phase</Text>
        </View>
      </ScrollView>

      <View style={notesStyles.miniToolbar}>
        {['B', 'I', 'H1', 'H2', '"', '•'].map((action) => (
          <TouchableOpacity key={action} style={notesStyles.toolChip}><Text style={notesStyles.toolChipText}>{action}</Text></TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={notesStyles.aiChip}>
          <Feather name="zap" size={12} color={L.accent} />
          {/* 🚀 BUG FIX: styles.aiChipText tha, usko notesStyles kar diya */}
          <Text style={notesStyles.aiChipText}>AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const notesStyles = StyleSheet.create({
  container: { backgroundColor: L.bg, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: L.border },
  panelLabel: { fontSize: 13, fontWeight: '700', color: L.text },
  linkedLabel: { fontSize: 11, color: L.muted },
  scrollContent: { padding: 16, paddingBottom: 24 },
  noteTitle: { fontSize: 18, fontWeight: '800', color: L.text, letterSpacing: -0.3, marginBottom: 12 },
  editorPlaceholder: { minHeight: 180, padding: 4 },
  cursorLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cursor: { width: 2, height: 18, backgroundColor: L.accent, borderRadius: 1 },
  draftLine: { height: 8, backgroundColor: L.border, borderRadius: 4, marginBottom: 10, opacity: 0.7 },
  editorHint: { marginTop: 16, fontSize: 11, color: L.muted, textAlign: 'center', fontStyle: 'italic' },
  miniToolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 10, borderTopWidth: 1, borderTopColor: L.border, backgroundColor: L.surface, gap: 6 },
  toolChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: L.card, borderRadius: 8 },
  toolChipText: { fontSize: 12, fontWeight: '700', color: L.text },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: L.accentSoft, borderRadius: 10 },
  aiChipText: { fontSize: 12, fontWeight: '700', color: L.accent },
});

function DraggableDivider({ onMove, hasBeenDragged }) {
  const labelOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasBeenDragged) {
      Animated.timing(labelOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    }
  }, [hasBeenDragged]);

  return (
    <View style={dividerStyles.band}>
      <View style={dividerStyles.hairline} />
      <View style={dividerStyles.pill}>
        <View style={dividerStyles.pillGroove} />
        <View style={dividerStyles.pillGroove} />
        <View style={dividerStyles.pillGroove} />
      </View>
      <Animated.Text style={[dividerStyles.dragLabel, { opacity: labelOpacity }]}>DRAG</Animated.Text>
      <View style={dividerStyles.hairline} />
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  band: { height: DIVIDER_H, backgroundColor: L.dividerBg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: L.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 10 },
  hairline: { flex: 1, height: 1, backgroundColor: L.border, opacity: 0.6 },
  pill: { width: 48, height: 22, borderRadius: 11, backgroundColor: L.surface, borderWidth: 1, borderColor: L.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  pillGroove: { width: 3, height: 12, borderRadius: 2, backgroundColor: L.border },
  dragLabel: { fontSize: 6, letterSpacing: 3, color: L.muted, fontWeight: '700', position: 'absolute', bottom: 3 },
});

export default function DeepReadScreen({ pdfUri, onBack }) {
  const [splitFraction, setSplitFraction] = useState(DEFAULT_SPLIT);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  const splitRef = useRef(DEFAULT_SPLIT);
  const dragY = useRef(new Animated.Value(DEFAULT_SPLIT * USABLE_H)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        dragY.setOffset(splitRef.current * USABLE_H);
        dragY.setValue(0);
        setHasBeenDragged(true);
      },
      onPanResponderMove: (_, gestureState) => {
        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        dragY.flattenOffset();
        const rawPx = splitRef.current * USABLE_H + gestureState.dy;
        const clamped = Math.min(Math.max(rawPx, MIN_PANEL_FRAC * USABLE_H), (1 - MIN_PANEL_FRAC) * USABLE_H);
        const newFrac = clamped / USABLE_H;

        Animated.spring(dragY, { toValue: clamped, friction: 7, tension: 60, useNativeDriver: false }).start();
        splitRef.current = newFrac;
        setSplitFraction(newFrac);
      },
    })
  ).current;

  const pdfHeight = splitFraction * USABLE_H;
  const notesHeight = (1 - splitFraction) * USABLE_H;

  return (
    <View style={screen.root}>
      <StatusBar barStyle="dark-content" backgroundColor={L.bg} />
      
      <View style={screen.navBar}>
        <TouchableOpacity onPress={onBack} style={screen.navBtn}>
          <Feather name="chevron-left" size={20} color={L.text} />
        </TouchableOpacity>
        <Text style={screen.navTitle}>Focus Reading</Text>
        <View style={screen.navRight}>
          <View style={screen.modeBadge}><Text style={screen.modeBadgeText}>FOCUS</Text></View>
        </View>
      </View>

      <PdfPanel pdfUri={pdfUri} height={pdfHeight} />
      
      <View {...panResponder.panHandlers}>
        <DraggableDivider onMove={setSplitFraction} hasBeenDragged={hasBeenDragged} />
      </View>
      
      <NotesPanel height={notesHeight} note={null} />
    </View>
  );
}

const screen = StyleSheet.create({
  root: { flex: 1, backgroundColor: L.bg, paddingTop: SAFE_TOP },
  navBar: { height: NAV_BAR_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: L.border, backgroundColor: L.surface },
  navBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: L.card, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: L.text, letterSpacing: 0.2 },
  navRight: { width: 36, alignItems: 'flex-end' },
  modeBadge: { backgroundColor: L.accentSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  modeBadgeText: { fontSize: 9, fontWeight: '800', color: L.accent, letterSpacing: 1.5 },
});
