import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// TimeCapsuleWidget.js — Lumina Notes
//
// A "Knowledge Revisit" card that surfaces an older note on the HomeScreen,
// encouraging calm reflection rather than productivity anxiety.
//
// Philosophy: Calm · Private · Aesthetic · Reflection-focused.
// No streaks, no urgency language, no gamification — just a quiet invitation.
//
// Props:
//   note     → { title, content, date, createdAt, folder? } | null
//   onPress  → () => void  (called when the user taps the card)
//
// Theming:
//   All colors are sourced from useTheme() — nothing hardcoded.
//   theme.surface, .card, .border, .text, .muted, .accent, .accentSoft.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Relative date label ──────────────────────────────────────────────────────
// Returns a soft, reflective phrase rather than a precise timestamp.
// "A thought from 30 days ago" feels more poetic than "Oct 14, 2025".
function getReflectiveLabel(rawDate) {
  if (!rawDate) return 'A thought from the past';

  const then = new Date(rawDate).getTime();
  if (isNaN(then)) return 'A thought from the past';

  const diffDays = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0)  return 'A thought from today';
  if (diffDays === 1) return 'A thought from yesterday';
  if (diffDays < 7)   return `A thought from ${diffDays} days ago`;
  if (diffDays < 14)  return 'A thought from last week';
  if (diffDays < 30)  return `A thought from ${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60)  return 'A thought from a month ago';
  if (diffDays < 365) return `A thought from ${Math.floor(diffDays / 30)} months ago`;
  return 'A thought from over a year ago';
}

// ─── Strip markdown/highlight markers for the preview snippet ────────────────
// We don't want 【highlighted text】 or **bold** leaking into the card.
function cleanSnippet(raw = '') {
  return raw
    .replace(/【.*?】/g, (m) => m.slice(1, -1))   // 【text】 → text
    .replace(/\*\*(.*?)\*\*/g, '$1')               // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')                   // *italic* → italic
    .replace(/^#+\s/gm, '')                        // # headings
    .replace(/^-\s/gm, '')                         // - bullets
    .replace(/\n+/g, ' ')                          // collapse newlines
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TimeCapsuleWidget({ note, onPress }) {
  const { theme } = useTheme();

  // ── Press scale spring ────────────────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ── Entrance fade + slide ─────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Press handlers ────────────────────────────────────────────────────────
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.968,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 7,
    }).start();
  };

  const hasNote = !!note;
  const snippet = hasNote ? cleanSnippet(note.content) : '';
  const reflectiveLabel = hasNote
    ? getReflectiveLabel(note.createdAt || note.date)
    : null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={hasNote ? onPress : undefined}
        disabled={!hasNote}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {hasNote ? (
            <FilledState
              theme={theme}
              note={note}
              reflectiveLabel={reflectiveLabel}
              snippet={snippet}
            />
          ) : (
            <EmptyState theme={theme} />
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilledState — shown when a past note is available
// ─────────────────────────────────────────────────────────────────────────────
function FilledState({ theme, note, reflectiveLabel, snippet }) {
  const subjectLabel = note.folder
    ? note.folder.replace(/^\S+\s/, '')
    : null;

  return (
    <View style={styles.filledRoot}>
      {/* ── Top row: eyebrow + icon ── */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.eyebrowPill,
            { backgroundColor: theme.accentSoft, borderColor: theme.accent + '30' },
          ]}
        >
          <Feather name="clock" size={11} color={theme.accent} />
          <Text style={[styles.eyebrowText, { color: theme.accent }]}>
            FROM THE VAULT
          </Text>
        </View>

        <View style={[styles.arrowIcon, { backgroundColor: theme.accentSoft }]}>
          <Feather name="arrow-up-right" size={14} color={theme.accent} />
        </View>
      </View>

      {/* ── Reflective date label ── */}
      <Text style={[styles.reflectiveLabel, { color: theme.muted }]}>
        {reflectiveLabel}
      </Text>

      {/* ── Divider ── */}
      <View style={[styles.hairline, { backgroundColor: theme.border }]} />

      {/* ── Note title ── */}
      <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={2}>
        {note.title || 'Untitled Session'}
      </Text>

      {/* ── Snippet ── */}
      {snippet.length > 0 && (
        <Text style={[styles.noteSnippet, { color: theme.muted }]} numberOfLines={3}>
          {snippet}
        </Text>
      )}

      {/* ── Footer: subject tag + revisit CTA ── */}
      <View style={styles.footerRow}>
        {subjectLabel ? (
          <View
            style={[
              styles.subjectTag,
              { backgroundColor: theme.accentSoft, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.subjectTagText, { color: theme.muted }]}>
              {subjectLabel}
            </Text>
          </View>
        ) : (
          <View />
        )}

        <Text style={[styles.revisitCta, { color: theme.accent }]}>
          Revisit this memory →
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — shown when no past note exists yet
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ theme }) {
  return (
    <View style={styles.emptyRoot}>
      {/* Soft icon vessel */}
      <View
        style={[
          styles.emptyIconVessel,
          { backgroundColor: theme.accentSoft, borderColor: theme.border },
        ]}
      >
        <Feather name="book-open" size={22} color={theme.accent} />
      </View>

      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Your knowledge journey{'\n'}begins here.
      </Text>

      <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
        As you build your library, past notes will{'\n'}surface here for quiet reflection.
      </Text>

      {/* Decorative dots — hint at future memories */}
      <View style={styles.emptyDots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.emptyDot,
              {
                backgroundColor: theme.border,
                opacity: 1 - i * 0.25,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — NO hardcoded colors. Only structural/geometric properties here.
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 22,
  },

  // ── Card shell ──
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    // Floating shadow — subtle depth, not aggressive
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
    overflow: 'hidden',
  },

  // ─────────────────────────────────────────────────────────
  // FilledState
  // ─────────────────────────────────────────────────────────
  filledRoot: {
    padding: 20,
    gap: 10,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eyebrowText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  arrowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reflectiveLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 13.5,
    letterSpacing: 0.2,
    marginTop: -2,
  },

  hairline: {
    height: 1,
    marginVertical: 2,
  },

  noteTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 19,
    fontWeight: Platform.OS === 'ios' ? undefined : '700',
    lineHeight: 26,
    letterSpacing: 0.1,
  },

  noteSnippet: {
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: 0.15,
    marginTop: -2,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  subjectTag: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subjectTagText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  revisitCta: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─────────────────────────────────────────────────────────
  // EmptyState
  // ─────────────────────────────────────────────────────────
  emptyRoot: {
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },

  emptyIconVessel: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  emptyTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 25,
    letterSpacing: 0.2,
  },

  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  emptyDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
        
