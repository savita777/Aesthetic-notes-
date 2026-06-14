import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Motivational Quotes ──────────────────────────────────────────────────
const MOTIVATIONAL_TEXTS = [
  'keep showing up for yourself.',
  'small steps, every single day.',
  'you are doing better than you know.',
  'consistency is quiet magic.',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Component ────────────────────────────────────────────────────────────────
export default function DailyStreakWidget() {
  const [streak, setStreak] = useState(0);
  const [quote] = useState(MOTIVATIONAL_TEXTS[new Date().getDay() % MOTIVATIONAL_TEXTS.length]);
  
  // App's actual mock logic for visual representation
  const [hoursDone] = useState((Math.random() * 2 + 1).toFixed(1)); 
  const HOURS_GOAL = 4;
  const progressRatio = hoursDone / HOURS_GOAL;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  // 🚀 NAYA: "No Punishment" Streak Logic (Cumulative Tracker)
  useEffect(() => {
    const calculateCumulativeStreak = async () => {
      try {
        const lastOpenDate = await AsyncStorage.getItem('@lumina_last_open_date');
        const currentStreakStr = await AsyncStorage.getItem('@lumina_cumulative_streak');
        
        let currentStreak = currentStreakStr ? parseInt(currentStreakStr, 10) : 0;
        const today = new Date().toDateString();

        if (lastOpenDate !== today) {
          // It's a new day! No matter how many days they missed, we just add +1. No resets!
          currentStreak += 1;
          await AsyncStorage.setItem('@lumina_last_open_date', today);
          await AsyncStorage.setItem('@lumina_cumulative_streak', currentStreak.toString());
        }

        setStreak(currentStreak);
      } catch (error) {
        console.log('Error calculating streak:', error);
      }
    };

    calculateCumulativeStreak();
  }, []);

  useEffect(() => {
    // Entrance: fade + slide up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar fill — slight delay for effect
    Animated.timing(progressAnim, {
      toValue: progressRatio,
      duration: 1100,
      delay: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false, 
    }).start();
  }, [progressRatio]);

  // Interpolate progress to percentage width string
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Streak badge color: shifts warmer as streak grows
  const streakIsHot = streak >= 7;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* ── Top Row: greeting + streak badge ── */}
      <View style={styles.topRow}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingEyebrow}>TODAY'S FOCUS</Text>
          <Text style={styles.greetingTitle}>Daily Goal</Text>
        </View>

        {/* 🚀 Streak Badge (Now Unbreakable!) */}
        <View style={[styles.streakBadge, streakIsHot && styles.streakBadgeHot]}>
          <Text style={styles.streakIcon}>{streakIsHot ? '🔥' : '✨'}</Text>
          <Text style={[styles.streakNumber, streakIsHot && styles.streakNumberHot]}>
            {streak}
          </Text>
          <Text style={styles.streakLabel}>day{streak !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Progress Section ── */}
      <View style={styles.progressSection}>
        {/* Time labels */}
        <View style={styles.progressLabelRow}>
          <View style={styles.progressLabelLeft}>
            <Text style={styles.hoursValue}>{hoursDone}h</Text>
            <Text style={styles.hoursUnit}> focused</Text>
          </View>
          <Text style={styles.hoursGoal}>Goal: {HOURS_GOAL}h</Text>
        </View>

        {/* Track */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
            ]}
          >
            {/* Shimmer highlight on fill bar */}
            <View style={styles.progressShimmer} />
          </Animated.View>

          {/* Soft glow dot at progress tip */}
          <Animated.View
            style={[
              styles.progressDot,
              { left: progressWidth },
            ]}
          />
        </View>

        {/* Tick marks */}
        <View style={styles.tickRow}>
          {[0.25, 0.5, 0.75, 1].map((tick) => (
            <View
              key={tick}
              style={[
                styles.tick,
                progressRatio >= tick && styles.tickFilled,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Stats Micro Row ── */}
      <View style={styles.statsRow}>
        <StatChip
          label="Sessions"
          value={Math.round(progressRatio * 4)}
          suffix="/4"
          color="#FFB3BA"
        />
        <View style={styles.statsDivider} />
        <StatChip
          label="Remaining"
          value={`${(HOURS_GOAL - parseFloat(hoursDone)).toFixed(1)}h`}
          color="#B5D8FF"
        />
        <View style={styles.statsDivider} />
        <StatChip
          label="Best Streak"
          value={streak < 21 ? '21' : streak} 
          suffix=" 🏆"
          color="#FFD700"
        />
      </View>

      {/* ── Bottom motivational text ── */}
      <View style={styles.quoteRow}>
        <View style={styles.quoteLine} />
        <Text style={styles.quoteText}>{quote}</Text>
        <View style={styles.quoteLine} />
      </View>
    </Animated.View>
  );
}

// ─── StatChip sub-component ───────────────────────────────────────────────────
function StatChip({ label, value, suffix = '', color }) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.statValue}>
          {value}
          <Text style={styles.statSuffix}>{suffix}</Text>
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_PADDING = 20;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,          // squircle-ish on RN
    borderWidth: 1,
    borderColor: '#EAE6E1',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: CARD_PADDING,
    paddingTop: 18,
    paddingBottom: 16,
    // Soft Apple-style shadow
    shadowColor: '#C8B8B0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 5,
    // Max width guard for tablets
    maxWidth: Math.min(SCREEN_WIDTH - 32, 480),
    alignSelf: 'center',
    width: '100%',
  },

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greetingBlock: {
    gap: 2,
  },
  greetingEyebrow: {
    fontSize: 9.5,
    letterSpacing: 2,
    color: '#C8BDBE',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  greetingTitle: {
    fontSize: 18,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: '#2D2A2E',
    letterSpacing: 0.3,
  },

  // ── Streak badge ──
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFE9A0',
    gap: 4,
  },
  streakBadgeHot: {
    backgroundColor: '#FFF2E8',
    borderColor: '#FFD4A8',
  },
  streakIcon: {
    fontSize: 14,
  },
  streakNumber: {
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '700',
    color: '#C8A040',
    fontStyle: 'italic',
  },
  streakNumberHot: {
    color: '#D4701A',
  },
  streakLabel: {
    fontSize: 10,
    color: '#C8A888',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#F0EDE8',
    marginBottom: 16,
  },

  // ── Progress section ──
  progressSection: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  progressLabelLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hoursValue: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontStyle: 'italic',
    color: '#2D2A2E',
    letterSpacing: 0.5,
  },
  hoursUnit: {
    fontSize: 12,
    color: '#B8ADAF',
    letterSpacing: 0.5,
    marginLeft: 2,
  },
  hoursGoal: {
    fontSize: 11,
    color: '#C8BDBE',
    letterSpacing: 0.8,
  },

  // Progress bar
  progressTrack: {
    height: 8,
    backgroundColor: '#F5F0EC',
    borderRadius: 10,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#FFB3BA',
    overflow: 'hidden',
    position: 'relative',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
  },
  progressDot: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFB3BA',
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 3,
  },

  // Tick marks
  tickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '6%',
    marginTop: 2,
  },
  tick: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8E3DE',
  },
  tickFilled: {
    backgroundColor: '#FFB3BA',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#EAE6E1',
    marginBottom: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    justifyContent: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#2D2A2E',
    lineHeight: 18,
  },
  statSuffix: {
    fontFamily: 'Georgia',
    fontSize: 11,
    color: '#B8ADAF',
    fontStyle: 'italic',
  },
  statLabel: {
    fontSize: 9.5,
    color: '#C8BDBE',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#EAE6E1',
    marginHorizontal: 2,
  },

  // ── Quote ──
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quoteLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EAE6E1',
  },
  quoteText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: '#C8BDBE',
    letterSpacing: 0.4,
    textAlign: 'center',
    flexShrink: 1,
  },
});
        
