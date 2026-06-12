// PrivacyGate.js
// Drop this file into your components/ or screens/ directory.
// It wraps your entire navigation tree and handles biometric authentication.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AppState,
  StatusBar,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

// ─── Lumina Design Tokens ──────────────────────────────────────────────────
const COLORS = {
  background: '#FDFBF7',
  accent: '#B5838D',
  accentSoft: '#D4A5AB',
  text: '#2D2A2E',
  textMuted: '#9B9099',
  border: '#EDE8E0',
  errorSoft: '#F2D0D4',
};

// ─── SVG-Free Lock Icon (pure RN, no extra deps) ──────────────────────────
// Renders a minimal padlock using View primitives.
function LockIcon({ color = COLORS.accent, size = 48 }) {
  const shackleWidth = size * 0.52;
  const shackleHeight = size * 0.38;
  const bodyWidth = size * 0.72;
  const bodyHeight = size * 0.52;
  const borderRadius = size * 0.12;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      {/* Shackle (the arch) */}
      <View
        style={{
          width: shackleWidth,
          height: shackleHeight,
          borderTopLeftRadius: shackleWidth / 2,
          borderTopRightRadius: shackleWidth / 2,
          borderWidth: size * 0.075,
          borderColor: color,
          borderBottomWidth: 0,
          marginBottom: -size * 0.04,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          backgroundColor: color,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Keyhole circle */}
        <View
          style={{
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: size * 0.08,
            backgroundColor: COLORS.background,
            marginBottom: size * 0.04,
          }}
        />
        {/* Keyhole stem */}
        <View
          style={{
            width: size * 0.07,
            height: size * 0.14,
            backgroundColor: COLORS.background,
            borderRadius: size * 0.02,
            marginTop: -size * 0.06,
          }}
        />
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function PrivacyGate({ children, session }) {
  const [isLocked, setIsLocked] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [biometricType, setBiometricType] = useState(null); // 'face', 'fingerprint', or 'pin'

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const unlockAnim = useRef(new Animated.Value(1)).current;

  // Track app state transitions (background → foreground re-lock)
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimestamp = useRef(null);

  // How long (ms) in background before re-locking. 3 seconds feels natural.
  const BACKGROUND_LOCK_DELAY = 3000;

  // ── Detect available biometric hardware on mount ──
  useEffect(() => {
    (async () => {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      } else {
        setBiometricType('pin'); // Device PIN fallback
      }
    })();
  }, []);

  // ── Entrance animation when lock screen mounts ──
  useEffect(() => {
    if (isLocked) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLocked]);

  // ── Background / Foreground listener ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;

      if (
        (prevState === 'active') &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        backgroundTimestamp.current = Date.now();
      }

      if (
        (prevState === 'background' || prevState === 'inactive') &&
        nextState === 'active'
      ) {
        const elapsed = Date.now() - (backgroundTimestamp.current || 0);
        if (elapsed > BACKGROUND_LOCK_DELAY && session) {
          setIsLocked(true);
          setAuthError(null);
        }
        backgroundTimestamp.current = null;
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [session]);

  // ── Auto-prompt when lock screen appears ──
  useEffect(() => {
    if (isLocked && session && !isAuthenticating) {
      // Small delay so the entrance animation plays first
      const timer = setTimeout(() => authenticate(), 600);
      return () => clearTimeout(timer);
    }
  }, [isLocked, session]);

  // ── Core authentication logic ──
  const authenticate = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Lumina Notes',
        fallbackLabel: 'Use Device Passcode',
        // On Android, this shows the reason in the system dialog
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow PIN/password fallback
      });

      if (result.success) {
        handleUnlockSuccess();
      } else {
        // result.error can be: 'UserCancel', 'SystemCancel', 'AuthenticationFailed', etc.
        if (result.error === 'UserCancel' || result.error === 'SystemCancel') {
          setAuthError(null); // Silent — user dismissed intentionally
        } else {
          triggerShake();
          setAuthError('Authentication failed. Please try again.');
        }
      }
    } catch (err) {
      triggerShake();
      setAuthError('Unable to authenticate. Please try again.');
      console.warn('[PrivacyGate] Auth error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  // ── Smooth unlock transition ──
  const handleUnlockSuccess = () => {
    Animated.parallel([
      Animated.timing(unlockAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLocked(false);
      unlockAnim.setValue(1); // Reset for next lock
    });
  };

  // ── Shake animation on failure ──
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── If no active session or already unlocked, render children directly ──
  if (!session || !isLocked) {
    return children;
  }

  const unlockLabel = {
    face: 'Unlock with Face ID',
    fingerprint: 'Unlock with Touch ID',
    pin: 'Unlock with Device PIN',
  }[biometricType] ?? 'Unlock';

  const biometricHint = {
    face: 'Use Face ID',
    fingerprint: 'Use Touch ID',
    pin: 'Enter Passcode',
  }[biometricType] ?? '';

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
          },
        ]}
      >
        {/* Top wordmark */}
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>LUMINA</Text>
        </View>

        {/* Central vault area */}
        <View style={styles.centerContent}>
          {/* Decorative ring around lock icon */}
          <View style={styles.iconRing}>
            <View style={styles.iconRingInner}>
              <LockIcon color={COLORS.accent} size={44} />
            </View>
          </View>

          <Text style={styles.headline}>
            Welcome back.
          </Text>
          <Text style={styles.subheadline}>
            Unlock your private{'\n'}knowledge library.
          </Text>

          {/* Error state */}
          {authError ? (
            <View style={styles.errorBadge}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom action area */}
        <View style={styles.bottomArea}>
          {/* Primary unlock button */}
          <TouchableOpacity
            style={[styles.unlockButton, isAuthenticating && styles.unlockButtonLoading]}
            onPress={authenticate}
            activeOpacity={0.78}
            disabled={isAuthenticating}
          >
            <Text style={styles.unlockButtonText}>
              {isAuthenticating ? 'Verifying…' : unlockLabel}
            </Text>
          </TouchableOpacity>

          {/* Subtle hint line */}
          <Text style={styles.hintText}>
            {isAuthenticating
              ? 'Awaiting authentication'
              : `${biometricHint} to continue`}
          </Text>
        </View>

        {/* Decorative bottom divider */}
        <View style={styles.bottomDecor} />
      </Animated.View>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 52,
    paddingHorizontal: 32,
  },

  // ── Top wordmark ──
  topBar: {
    width: '100%',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 13,
    letterSpacing: 6,
    color: COLORS.textMuted,
    fontWeight: '400',
  },

  // ── Central content ──
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },

  // Concentric decorative rings
  iconRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    // Subtle warm shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  iconRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  headline: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 28,
    color: COLORS.text,
    fontWeight: '400',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 10,
  },
  subheadline: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.1,
    fontWeight: '400',
  },

  // ── Error badge ──
  errorBadge: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.errorSoft,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.accent,
    textAlign: 'center',
  },

  // ── Bottom action area ──
  bottomArea: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  unlockButton: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // Warm drop shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  unlockButtonLoading: {
    backgroundColor: COLORS.accentSoft,
    shadowOpacity: 0.10,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },

  // ── Decorative bottom line ──
  bottomDecor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.accent,
    opacity: 0.18,
  },
});
