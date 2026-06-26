import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export default function AiPreviewModal({ 
  visible, 
  isThinking, 
  content, 
  theme, 
  onClose, 
  onDiscard, 
  onInsert 
}) {
  return (
    <>
      {/* ── AI Thinking Overlay ── */}
      {isThinking && (
        <View style={styles.thinkingOverlay}>
          <View style={[styles.thinkingCard, { backgroundColor: theme.card }]}>
            <View style={styles.thinkingIconRing}>
              <Text style={styles.thinkingIcon}>✨</Text>
            </View>
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 4 }} />
            <Text style={[styles.thinkingTitle, { color: theme.text }]}>AI Spark is thinking…</Text>
            <Text style={[styles.thinkingSubtitle, { color: theme.muted }]}>Reading your notes carefully</Text>
          </View>
        </View>
      )}

      {/* ── Ethical AI Preview Modal ── */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.badgeText, { color: theme.accent }]}>✨ AI Spark Suggestion</Text>
            </View>
            <Text style={[styles.sheetSubtitle, { color: theme.muted }]}>
              Review before inserting. Your note stays untouched until you approve.
            </Text>
            
            <View style={[styles.contentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <Text style={[styles.contentText, { color: theme.text }]} selectable>{content}</Text>
              </ScrollView>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btnDiscard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={onDiscard}
              >
                <Feather name="x" size={15} color={theme.muted} />
                <Text style={[styles.btnDiscardText, { color: theme.muted }]}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnInsert, { backgroundColor: theme.accent }]}
                activeOpacity={0.85}
                onPress={onInsert}
              >
                <Feather name="plus" size={15} color="#FFFFFF" />
                <Text style={styles.btnInsertText}>Insert to Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thinkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30, 26, 28, 0.52)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  thinkingCard: { width: 240, borderRadius: 28, paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 14 },
  thinkingIconRing: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(181, 131, 141, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  thinkingIcon: { fontSize: 26 },
  thinkingTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  thinkingSubtitle: { fontSize: 12, fontStyle: 'italic', marginTop: -4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 14, 16, 0.50)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 14, paddingHorizontal: 22, paddingBottom: 36, maxHeight: '82%', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 18 },
  handle: { width: 40, height: 4, borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  sheetSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  contentCard: { borderRadius: 18, borderWidth: 1, padding: 16, maxHeight: 320, marginBottom: 20 },
  contentScroll: { flexGrow: 0 },
  contentText: { fontSize: 14.5, lineHeight: 24, fontFamily: SERIF },
  buttonRow: { flexDirection: 'row', gap: 12 },
  btnDiscard: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20 },
  btnDiscardText: { fontSize: 14, fontWeight: '600' },
  btnInsert: { flex: 1, flexDirection: 'row', alignItems: 'center', justify_content: 'center', gap: 7, borderRadius: 16, paddingVertical: 14, shadowColor: '#B5838D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10, elevation: 5 },
  btnInsertText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
          
