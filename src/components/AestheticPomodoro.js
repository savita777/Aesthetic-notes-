import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────
const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─── SVG-style progress ring via Animated ─────────────────────────────────────
// We draw the ring using a rotated half-circle technique (pure RN, no SVG lib).
const RING_SIZE = 240;
const STROKE = 6;

// ─── Component ────────────────────────────────────────────────────────────────
export default function AestheticPomodoro() {
  const [mode, setMode] = useState('focus');       // 'focus' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // useRef keeps the interval stable across re-renders
  const intervalRef = useRef(null);

  // Animated values
  const progressAnim = useRef(new Animated.Value(1)).current; // 1 → full, 0 → empty
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const totalDuration = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;

  // ── Fade-in on mount ──
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Sync progress ring to secondsLeft ──
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: secondsLeft / totalDuration,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // transform requires native, but we use it differently
    }).start();
  }, [secondsLeft, totalDuration]);

  // ── Pulse animation while running ──
  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRunning]);

  // ── Core countdown logic ──
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            // Auto-switch mode
            setMode((currentMode) => {
              if (currentMode === 'focus') {
                setSessionsCompleted((s) => s + 1);
                setSecondsLeft(BREAK_DURATION);
                return 'break';
              } else {
                setSecondsLeft(FOCUS_DURATION);
                return 'focus';
              }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // ── Controls ──
  const handleStartPause = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  const handleReset = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setSecondsLeft(mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }, [mode]);

  const handleModeSwitch = useCallback((newMode) => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setMode(newMode);
    setSecondsLeft(newMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }, []);

  // ── Progress ring calculation ──
  const progress = secondsLeft / totalDuration; // 1.0 → 0.0
  const isFocus = mode === 'focus';
  const accentColor = isFocus ? '#FFB3BA' : '#B5E5D8';
  const modeLabel = isFocus ? 'Focus Session' : 'Short Break';
  const modeEmoji = isFocus ? '✦' : '☁';

  // Ring visual — we use a simple arc approximation with two half-borders
  // clamped by overflow:hidden on a parent View (no SVG needed).
  const ringProgress = progress; // used for the clipped arc below

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.appName}>lumina</Text>
          <View style={styles.sessionPill}>
            <Text style={styles.sessionText}>
              {sessionsCompleted > 0 ? `${sessionsCompleted} session${sessionsCompleted > 1 ? 's' : ''} done ✦` : 'ready to focus ✦'}
            </Text>
          </View>
        </View>

        {/* ── Mode Switcher ── */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeTab, isFocus && styles.modeTabActive]}
            onPress={() => handleModeSwitch('focus')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTabText, isFocus && styles.modeTabTextActive]}>
              Focus
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, !isFocus && { ...styles.modeTabActive, backgroundColor: '#B5E5D8' }]}
            onPress={() => handleModeSwitch('break')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTabText, !isFocus && styles.modeTabTextActive]}>
              Break
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Circular Timer ── */}
        <Animated.View style={[styles.ringWrapper, { transform: [{ scale: pulseAnim }] }]}>

          {/* Outer decorative ring */}
          <View style={[styles.ringOuter, { borderColor: `${accentColor}30` }]} />

          {/* Progress arc using layered clipping */}
          <ProgressRing progress={ringProgress} color={accentColor} />

          {/* Inner circle — the "face" */}
          <View style={styles.ringInner}>
            <Text style={styles.modeEmoji}>{modeEmoji}</Text>
            <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
            <Text style={styles.modeLabel}>{modeLabel}</Text>
          </View>

        </Animated.View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText}>↺</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: accentColor }]}
            onPress={handleStartPause}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>
              {isRunning ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => handleModeSwitch(isFocus ? 'break' : 'focus')}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText}>⇄</Text>
          </TouchableOpacity>
        </View>

        {/* ── Lofi label ── */}
        <Text style={styles.footerText}>
          {isRunning ? 'stay present · breathe slowly' : 'press play to begin'}
        </Text>

        {/* ── Session dots ── */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < sessionsCompleted % 4 && { backgroundColor: accentColor },
              ]}
            />
          ))}
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────
// Pure RN arc using the clip-rotate trick. No SVG, no external libs.
function ProgressRing({ progress, color }) {
  const size = RING_SIZE;
  const half = size / 2;
  const strokeWidth = STROKE;

  // progress: 1.0 = full circle, 0.0 = empty
  // We split the circle into two halves. Each half is a View with
  // border on the right side only, rotated.
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // First half covers 0–180deg (right side)
  const firstHalfAngle = clampedProgress >= 0.5
    ? 180
    : clampedProgress * 360;

  // Second half covers 180–360deg (left side)
  const secondHalfAngle = clampedProgress >= 0.5
    ? (clampedProgress - 0.5) * 360
    : 0;

  return (
    <View style={[styles.ringAbsolute, { width: size, height: size }]} pointerEvents="none">
      {/* Background track */}
      <View style={[styles.ringTrack, {
        width: size,
        height: size,
        borderRadius: half,
        borderWidth: strokeWidth,
        borderColor: `${color}25`,
      }]} />

      {/* Right half arc */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: half,
        overflow: 'hidden',
      }}>
        <View style={{
          position: 'absolute',
          width: half,
          height: size,
          left: half,
          overflow: 'hidden',
        }}>
          <View style={{
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: color,
            position: 'absolute',
            left: -half,
            transform: [{ rotate: `${firstHalfAngle - 180}deg` }],
          }} />
        </View>
      </View>

      {/* Left half arc (only shown when progress > 50%) */}
      {clampedProgress > 0.5 && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          overflow: 'hidden',
        }}>
          <View style={{
            position: 'absolute',
            width: half,
            height: size,
            left: 0,
            overflow: 'hidden',
          }}>
            <View style={{
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: strokeWidth,
              borderColor: color,
              position: 'absolute',
              left: 0,
              transform: [{ rotate: `${secondHalfAngle - 180}deg` }],
            }} />
          </View>
        </View>
      )}

      {/* Progress dot at tip */}
      {clampedProgress > 0.02 && (
        <View style={[styles.progressDot, {
          backgroundColor: color,
          top: half - 5,
          left: half - 5,
          transform: [
            { translateX: half - strokeWidth / 2 - 5 },
            { rotate: `${clampedProgress * 360 - 90}deg` },
            { translateX: -(half - strokeWidth / 2 - 5) },
          ],
        }]} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FAF8F5',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appName: {
    fontFamily: 'Georgia',
    fontSize: 22,
    letterSpacing: 6,
    color: '#2D2A2E',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  sessionPill: {
    backgroundColor: 'rgba(255, 179, 186, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 186, 0.3)',
  },
  sessionText: {
    fontSize: 11,
    color: '#9A8A8C',
    letterSpacing: 1,
  },

  // Mode switcher
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F0EDE8',
    borderRadius: 30,
    padding: 4,
    marginBottom: 40,
  },
  modeTab: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 26,
  },
  modeTabActive: {
    backgroundColor: '#FFB3BA',
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  modeTabText: {
    fontSize: 13,
    color: '#9A8A8C',
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: '#2D2A2E',
    fontWeight: '600',
  },

  // Ring wrapper
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  ringOuter: {
    position: 'absolute',
    width: RING_SIZE + 20,
    height: RING_SIZE + 20,
    borderRadius: (RING_SIZE + 20) / 2,
    borderWidth: 1,
  },
  ringAbsolute: {
    position: 'absolute',
  },
  ringTrack: {
    position: 'absolute',
  },
  progressDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ringInner: {
    width: RING_SIZE - 30,
    height: RING_SIZE - 30,
    borderRadius: (RING_SIZE - 30) / 2,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8B8B8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  modeEmoji: {
    fontSize: 16,
    marginBottom: 4,
    color: '#FFB3BA',
  },
  timerText: {
    fontFamily: 'Georgia',
    fontSize: 48,
    fontStyle: 'italic',
    color: '#2D2A2E',
    letterSpacing: 2,
    lineHeight: 56,
  },
  modeLabel: {
    fontSize: 11,
    color: '#B8ADAF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 28,
  },
  btnPrimary: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB3BA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  btnPrimaryText: {
    fontSize: 22,
    color: '#2D2A2E',
  },
  btnSecondary: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8B8B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  btnSecondaryText: {
    fontSize: 18,
    color: '#9A8A8C',
  },

  // Footer
  footerText: {
    fontSize: 12,
    color: '#C8BDBE',
    letterSpacing: 1.5,
    fontStyle: 'italic',
    fontFamily: 'Georgia',
    marginBottom: 20,
  },

  // Session dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EDE8E3',
  },
});
                                       
