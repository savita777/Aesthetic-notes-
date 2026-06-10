import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { supabase } from './supabase';

const ACCENT = '#B5838D';
const BG = '#FDFBF7';
const TEXT = '#2F2A28';
const SUBTEXT = '#7A6F6A';
const BORDER = '#E9DED8';

const AuthScreen = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert('Missing details', 'Please enter both email and password.');
      return null;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return null;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters long.');
      return null;
    }

    return { email: cleanEmail, password };
  };

  const handleAuth = async () => {
    const payload = validate();
    if (!payload) return;

    try {
      setLoading(true);

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword(payload);

        if (error) throw error;

        if (onAuthSuccess) onAuthSuccess(data);
        return;
      }

      const { data, error } = await supabase.auth.signUp(payload);

      if (error) throw error;

      if (data?.session) {
        if (onAuthSuccess) onAuthSuccess(data);
      } else {
        Alert.alert(
          'Account created',
          'Check your inbox to verify your email, then log in.'
        );
      }
    } catch (error) {
      Alert.alert('Authentication failed', error?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.blobPink} />
        <View style={styles.blobBlue} />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Lumina ✨</Text>
                <Text style={styles.subtitle}>
                  {isLogin
                    ? 'Welcome back. Log in to continue your notes.'
                    : 'Create your space. Start with a fresh account.'}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#B2A8A3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#B2A8A3"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType={isLogin ? 'password' : 'newPassword'}
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isLogin ? 'Log In' : 'Sign Up'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleMode} style={styles.toggleWrap}>
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.toggleAction}>
                    {isLogin ? 'Sign Up' : 'Log In'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
    position: 'relative',
  },
  blobPink: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(213, 155, 170, 0.28)',
    zIndex: 0,
  },
  blobBlue: {
    position: 'absolute',
    bottom: 80,
    left: -45,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(180, 213, 230, 0.26)',
    zIndex: 0,
  },
  keyboardView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 7,
    backdropFilter: 'blur(12px)',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: SUBTEXT,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    fontSize: 15,
    color: TEXT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  button: {
    marginTop: 8,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  toggleWrap: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 14,
    color: SUBTEXT,
    textAlign: 'center',
  },
  toggleAction: {
    color: TEXT,
    fontWeight: '800',
  },
});

export default AuthScreen;
