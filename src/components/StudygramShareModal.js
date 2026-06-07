import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK = {
  streak: 12,
  topic: 'Quantum Physics',
  hoursToday: 2.5,
  sessionsToday: 3,
  date: new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }),
  quote: 'small steps, every single day.',
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Card is 9:16 ratio, fitting comfortably on screen with padding
const CARD_W = Math.min(SCREEN_W - 48, 340);
const CARD_H = Math.round(CARD_W * (16 / 9));

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudygramShareModal({ visible, onClose }) {
  const viewShotRef = useRef(null);

  // ── Entrance animations ──
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 420,
          delay: 80,
          easing: Easing.out(Easing.back(1.3)),
          useNativeDriver: true,
        }),
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: 420,
          delay: 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset for next open
      backdropAnim.setValue(0);
      cardAnim.setValue(0);
      cardSlideAnim.setValue(40);
    }
  }, [visible]);

  // ── Share handler ──
  const handleShare = async () => {
    try {
      if (!viewShotRef.current) return;

      const uri = await viewShotRef.current.capture({
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          'Sharing unavailable',
          'Sharing is not available on this device.',
          [{ text: 'OK' }]
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your study streak ✨',
        UTI: 'public.png',
      });
    } catch (err) {
      Alert.alert('Could not capture card', err?.message ?? 'Unknown error.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="light-content" />

      {/* ── Backdrop ── */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* ── Sheet ── */}
      <View style={styles.sheet} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheetInner,
            {
              opacity: cardAnim,
              transform: [{ translateY: cardSlideAnim }, { scale: cardAnim }],
            },
          ]}
        >
          {/* ── Close button ── */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* ── Label ── */}
          <Text style={styles.previewLabel}>STORY PREVIEW</Text>

          {/* ═══════════════════════════════════════
              THE SHAREABLE CARD — only this is captured
          ════════════════════════════════════════ */}
          <ViewShot
            ref={viewShotRef}
            style={styles.card}
            options={{ format: 'png', quality: 1 }}
          >
            {/* Layered gradient simulation */}
            <View style={styles.cardBgLayer1} />
            <View style={styles.cardBgLayer2} />
            <View style={styles.cardBgLayer3} />

            {/* Decorative corner dots */}
            <View style={[styles.cornerDot, styles.cornerTL]} />
            <View style={[styles.cornerDot, styles.cornerTR]} />
            <View style={[styles.cornerDot, styles.cornerBL]} />
            <View style={[styles.cornerDot, styles.cornerBR]} />

            {/* ── Card content ── */}
            <View style={styles.cardContent}>

              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.datePill}>
                  <Text style={styles.datePillText}>{MOCK.date}</Text>
                </View>
                <Text style={styles.cardTitle}>My Daily Focus ✨</Text>
                <Text style={styles.cardSubtitle}>today's study snapshot</Text>
              </View>

              {/* Streak Hero */}
              <View style={styles.streakHero}>
                <View style={styles.streakCircle}>
                  <Text style={styles.streakFlame}>🔥</Text>
                  <Text style={styles.streakNum}>{MOCK.streak}</Text>
                  <Text style={styles.streakUnit}>day streak</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <CardStat value={`${MOCK.hoursToday}h`} label="focused" color="#FFB3BA" />
                <View style={styles.statsDivider} />
                <CardStat value={MOCK.sessionsToday} label="sessions" color="#B5D8FF" />
                <View style={styles.statsDivider} />
                <CardStat value="1" label="goal done" color="#B5E5D8" />
              </View>

              {/* Topic Section */}
              <View style={styles.topicBlock}>
                <Text style={styles.topicEyebrow}>TODAY'S TOPIC</Text>
                <View style={styles.topicPill}>
                  <Text style={styles.topicIcon}>📖</Text>
                  <Text style={styles.topicText}>{MOCK.topic}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Daily goal</Text>
                  <Text style={styles.progressValue}>
                    {MOCK.hoursToday}h / 4h
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(MOCK.hoursToday / 4) * 100}%` },
                    ]}
                  >
                    <View style={styles.progressShimmer} />
                  </View>
                </View>
              </View>

              {/* Quote */}
              <View style={styles.quoteRow}>
                <View style={styles.quoteLine} />
                <Text style={styles.quoteText}>"{MOCK.quote}"</Text>
                <View style={styles.quoteLine} />
              </View>

              {/* Watermark */}
              <View style={styles.watermark}>
                <View style={styles.watermarkDot} />
                <Text style={styles.watermarkText}>Crafted with Lumina Notes 🌸</Text>
                <View style={styles.watermarkDot} />
              </View>
            </View>
          </ViewShot>
          {/* ═══════════════════════════════════════ */}

          {/* ── CTA ── */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.shareBtnText}>Share to Instagram  📸</Text>
          </TouchableOpacity>

          <Text style={styles.shareHint}>tap anywhere outside to dismiss</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── CardStat ─────────────────────────────────────────────────────────────────
function CardStat({ value, label, color }) {
  return (
    <View style={styles.statItem}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Modal layers ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 15, 18, 0.72)',
  },
  sheet: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetInner: {
    alignItems: 'center',
    width: CARD_W + 48,
  },

  // ── Close ──
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: 4,
    marginBottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Preview label ──
  previewLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  // ── Card shell ──
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(234,230,225,0.8)',
    backgroundColor: '#FAF8F5',
    shadowColor: '#B0A0A8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },

  // Gradient layers (stacked Views simulating soft pastel gradient)
  cardBgLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF8F5',
  },
  cardBgLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.45,
    backgroundColor: 'rgba(255, 232, 237, 0.45)', // soft pink top blush
    borderRadius: 28,
  },
  cardBgLayer3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.35,
    backgroundColor: 'rgba(211, 234, 250, 0.3)', // soft sky bottom blush
    borderRadius: 28,
  },

  // Decorative corner dots
  cornerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,179,186,0.4)',
  },
  cornerTL: { top: 18, left: 18 },
  cornerTR: { top: 18, right: 18 },
  cornerBL: { bottom: 18, left: 18 },
  cornerBR: { bottom: 18, right: 18 },

  // ── Card content ──
  cardContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },

  // Header
  cardHeader: {
    alignItems: 'center',
    gap: 4,
  },
  datePill: {
    backgroundColor: 'rgba(255,179,186,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,179,186,0.3)',
    marginBottom: 4,
  },
  datePillText: {
    fontSize: 9.5,
    color: '#C8848C',
    letterSpacing: 0.8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 22,
    fontStyle: 'italic',
    color: '#2D2A2E',
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#C8BDBE',
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  // Streak hero
  streakHero: {
    alignItems: 'center',
  },
  streakCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,213,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
    gap: 2,
  },
  streakFlame: {
    fontSize: 22,
  },
  streakNum: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 30,
    fontStyle: 'italic',
    color: '#2D2A2E',
    lineHeight: 32,
  },
  streakUnit: {
    fontSize: 9.5,
    color: '#C8BDBE',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(234,230,225,0.8)',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statValue: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 17,
    color: '#2D2A2E',
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 8.5,
    color: '#C8BDBE',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statsDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#EAE6E1',
  },

  // Topic block
  topicBlock: {
    alignItems: 'center',
    gap: 7,
  },
  topicEyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#C8BDBE',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(234,230,225,0.9)',
    gap: 8,
    shadowColor: '#C8B8B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  topicIcon: { fontSize: 14 },
  topicText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 15,
    color: '#2D2A2E',
    letterSpacing: 0.2,
  },

  // Progress
  progressSection: {
    gap: 7,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    color: '#B8ADAF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  progressValue: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 12,
    color: '#2D2A2E',
  },
  progressTrack: {
    height: 7,
    backgroundColor: 'rgba(234,230,225,0.7)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFB3BA',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 10,
  },

  // Quote
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quoteLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(234,230,225,0.8)',
  },
  quoteText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 10.5,
    color: '#C8BDBE',
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.3,
  },

  // Watermark
  watermark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  watermarkDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,179,186,0.5)',
  },
  watermarkText: {
    fontSize: 9.5,
    color: '#C8BDBE',
    letterSpacing: 0.8,
    fontWeight: '500',
  },

  // ── Share button ──
  shareBtn: {
    marginTop: 18,
    backgroundColor: '#FFB3BA',
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D2A2E',
    letterSpacing: 0.3,
  },

  shareHint: {
    marginTop: 12,
    fontSize: 10,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 1,
  },
});
        
