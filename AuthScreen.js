import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { supabase } from './supabase';

const COLORS = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  accent: '#4A90E2',
  accentLight: '#EBF3FD',
  accentDark: '#2F72C4',
  textPrimary: '#1A1D23',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E9F0',
  borderFocus: '#4A90E2',
  error: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
};

const FONTS = {
  display: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  body: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

export default function AuthScreen() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const transitionStep = (nextStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Email required', 'Please enter your email address to continue.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: trimmedEmail });
      if (error) throw error;
      transitionStep('otp');
    } catch (error) {
      Alert.alert('Could not send code', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      Alert.alert('Code required', 'Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmedCode,
        type: 'email',
      });
      if (error) throw error;
      // Session update handled by onAuthStateChange in App.js
    } catch (error) {
      Alert.alert('Verification failed', error.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setOtpCode('');
    transitionStep('email');
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <View style={styles.brandContainer}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>
          <Text style={styles.brandName}>Lumina</Text>
          <Text style={styles.brandTagline}>Your thoughts, beautifully kept.</Text>
        </View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {step === 'email' ? (
            <>
              <Text style={styles.cardTitle}>Sign in</Text>
              <Text style={styles.cardSubtitle}>
                Enter your email and we'll send a one-time code.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Check your inbox</Text>
              <Text style={styles.cardSubtitle}>
                We sent a 6-digit code to{' '}
                <Text style={styles.emailHighlight}>{maskedEmail}</Text>
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.otpInput,
                    otpFocused && styles.inputFocused,
                  ]}
                  placeholder="• • • • • •"
                  placeholderTextColor={COLORS.textMuted}
                  value={otpCode}
                  onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                  editable={!loading}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />
                <Text style={styles.inputHint}>Check your spam folder if you don't see it.</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & log in</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostButton}
                onPress={handleGoBack}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.ghostButtonText}>← Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to Lumina's{' '}
          <Text style={styles.footerLink}>Terms</Text> and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // Brand
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  logoInner: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  brandName: {
    fontFamily: FONTS.display,
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  brandTagline: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14.5,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  // Fields
  fieldGroup: {
    marginBottom: 22,
  },
  label: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15.5,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body,
  },
  otpInput: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
  },
  inputFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  inputHint: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
    minHeight: 50,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontFamily: FONTS.body,
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  ghostButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  ghostButtonText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Footer
  footerText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 32,
    maxWidth: 280,
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.accent,
    fontWeight: '500',
  },
});
