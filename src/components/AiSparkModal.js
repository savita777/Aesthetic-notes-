import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.56; // bottom sheet occupies ~56% of screen

const AI_ACTIONS = [
  {
    id: 'summarize',
    icon: '📝',
    label: 'Summarize (TL;DR)',
    description: 'Shorten into quick bullet points',
    bg: 'rgba(255, 179, 186, 0.14)',   // pastel pink tint
    border: 'rgba(255, 179, 186, 0.45)',
    dot: '#FFB3BA',
    accentText: '#C0606C',
  },
  {
    id: 'flashcards',
    icon: '🃏',
    label: 'Generate Flashcards',
    description: 'Create Q&A cards for active recall',
    bg: 'rgba(255, 223, 140, 0.14)',   // soft yellow tint
    border: 'rgba(255, 213, 100, 0.45)',
    dot: '#FFD700',
    accentText: '#A07800',
  },
  {
    id: 'aesthetic',
    icon: '🪄',
    label: 'Make it Aesthetic',
    description: 'Fix grammar and format beautifully',
    bg: 'rgba(181, 221, 210, 0.14)',   // soft mint tint
    border: 'rgba(181, 221, 210, 0.5)',
    dot: '#7ECABB',
    accentText: '#2E8A78',
  },
];

const DAILY_SPARKS_REMAINING = 3;
const DAILY_SPARKS_TOTAL     = 3;

// ─── Component ────────────────────────────────────────────────────────────────
export default function AiSparkModal({ visible, onClose, onSelectAction }) {
  // Sheet slides up from SHEET_H (off-screen below) → 0 (fully visible)
  const slideAnim   = useRef(new Animated.Value(SHEET_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Per-card stagger entrance
  const cardAnims = useRef(AI_ACTIONS.map(() => new Animated.Value(0))).current;
  const cardSlideAnims = useRef(AI_ACTIONS.map(() => new Animated.Value(16))).current;

  // Glow pulse on title
  const glowAnim = useRef(new Animated.Value(0.7)).current;

  // ── Entrance ──
  const runOpen = useCallback(() => {
    // Reset card anims
    cardAnims.forEach((a) => a.setValue(0));
    cardSlideAnims.forEach((a) => a.setValue(16));

    Animated.parallel([
      // Backdrop fade
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Sheet slide up with spring feel
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 260,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stagger cards in after sheet settles
      const stagger = Animated.stagger(
        70,
        AI_ACTIONS.map((_, i) =>
          Animated.parallel([
            Animated.timing(cardAnims[i], {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(cardSlideAnims[i], {
              toValue: 0,
              duration: 300,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        )
      );
      stagger.start();

      // Glow pulse loop on title
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  // ── Exit ──
  const runClose = useCallback((callback) => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_H,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      glowAnim.stopAnimation();
      if (callback) callback();
    });
  }, []);

  useEffect(() => {
    if (visible) {
      // Reset position before modal mounts
      slideAnim.setValue(SHEET_H);
      backdropAnim.setValue(0);
      runOpen();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    runClose(onClose);
  }, [onClose, runClose]);

  const handleAction = useCallback(
    (actionId) => {
      runClose(() => {
        onClose?.();
        onSelectAction?.(actionId);
      });
    },
    [onClose, onSelectAction, runClose]
  );

  // ── Spark quota display ──
  const sparksUsed = DAILY_SPARKS_TOTAL - DAILY_SPARKS_REMAINING;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar
        backgroundColor="rgba(0,0,0,0)"
        translucent
        barStyle="light-content"
      />

      {/* ── Backdrop ── */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* ── Bottom Sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandleRow}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Animated.Text
              style={[
                styles.titleIcon,
                { opacity: glowAnim },
              ]}
            >
              ✨
            </Animated.Text>
            <Text style={styles.title}>Lumina AI</Text>
          </View>
          <Text style={styles.subtitle}>How can I help with these notes?</Text>
        </View>

        {/* ── Action cards ── */}
        <View style={styles.actionsContainer}>
          {AI_ACTIONS.map((action, i) => (
            <Animated.View
              key={action.id}
              style={{
                opacity: cardAnims[i],
                transform: [{ translateY: cardSlideAnims[i] }],
              }}
            >
              <ActionCard
                action={action}
                onPress={() => handleAction(action.id)}
              />
            </Animated.View>
          ))}
        </View>

        {/* ── Footer quota ── */}
        <View style={styles.footer}>
          <View style={styles.quotaRow}>
            {/* Spark pip indicators */}
            {Array.from({ length: DAILY_SPARKS_TOTAL }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.sparkPip,
                  i < DAILY_SPARKS_REMAINING
                    ? styles.sparkPipActive
                    : styles.sparkPipUsed,
                ]}
              />
            ))}
            <Text style={styles.quotaText}>
              {DAILY_SPARKS_REMAINING}/{DAILY_SPARKS_TOTAL} daily AI sparks remaining
            </Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── ActionCard ───────────────────────────────────────────────────────────────
function ActionCard({ action, onPress }) {
  const pressAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.actionCard,
          {
            backgroundColor: action.bg,
            borderColor: action.border,
            transform: [{ scale: pressAnim }],
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.actionAccentBar, { backgroundColor: action.dot }]} />

        {/* Icon */}
        <View style={[styles.actionIconWrap, { borderColor: action.border }]}>
          <Text style={styles.actionIcon}>{action.icon}</Text>
        </View>

        {/* Text */}
        <View style={styles.actionTextBlock}>
          <Text style={[styles.actionLabel, { color: action.accentText }]}>
            {action.label}
          </Text>
          <Text style={styles.actionDesc}>{action.description}</Text>
        </View>

        {/* Chevron */}
        <Text style={[styles.actionChevron, { color: action.dot }]}>›</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Backdrop ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 14, 16, 0.55)',
  },

  // ── Sheet ──
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    // Apple-style shadow
    shadowColor: '#3A2830',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16, // safe area buffer
  },

  // ── Drag handle ──
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#D8D2CC',
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 18,
    gap: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  titleIcon: {
    fontSize: 20,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 22,
    color: '#2D2A2E',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#B8ADAF',
    letterSpacing: 0.4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },

  // ── Actions ──
  actionsContainer: {
    paddingHorizontal: 18,
    gap: 10,
    flex: 1,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 13,
    overflow: 'hidden',
  },
  actionAccentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderRadius: 4,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#C8B8B0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  actionDesc: {
    fontSize: 11.5,
    color: '#B8ADAF',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  actionChevron: {
    fontSize: 22,
    fontWeight: '300',
    marginRight: 2,
    lineHeight: 26,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sparkPipActive: {
    backgroundColor: '#FFB3BA',
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  sparkPipUsed: {
    backgroundColor: '#E0DBD6',
  },
  quotaText: {
    fontSize: 11,
    color: '#C8BDBE',
    letterSpacing: 0.5,
    marginLeft: 2,
  },
});
    
