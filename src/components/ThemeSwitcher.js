import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const THEME_DEFINITIONS = [
  {
    key: 'light',
    label: 'Ivory',
    icon: 'sun',
    description: 'Clean & bright',
    swatches: ['#FDFBF7', '#F8F6F2', '#B5838D'],
    cardBg: '#FDFBF7',
    cardBorder: '#EAE6E1',
    labelColor: '#2D2A2E',
    mutedColor: '#9A8A8C',
  },
  {
    key: 'dark',
    label: 'Midnight',
    icon: 'moon',
    description: 'Dark & focused',
    swatches: ['#1A1A2E', '#2D2A4E', '#B5838D'],
    cardBg: '#1E1E2E',
    cardBorder: '#3D3A5E',
    labelColor: '#FDFBF7',
    mutedColor: '#8A8AA8',
  },
  {
    key: 'coffee',
    label: 'Espresso',
    icon: 'coffee',
    description: 'Warm & cozy',
    swatches: ['#2C1A0E', '#3E2A1A', '#E5A87C'],
    cardBg: '#2C1A0E',
    cardBorder: '#5A3825',
    labelColor: '#F5E6D8',
    mutedColor: '#9A7A68',
  },
];

export default function ThemeSwitcher() {
  const { theme, switchTheme, themeName } = useTheme();
  const entranceFade = useRef(new Animated.Value(0)).current;
  const entranceSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceFade, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(entranceSlide, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [entranceFade, entranceSlide]);

  return (
    <Animated.View style={[styles.container, { opacity: entranceFade, transform: [{ translateY: entranceSlide }] }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>Choose your study environment</Text>
      </View>
      <View style={styles.cardsRow}>
        {THEME_DEFINITIONS.map((def) => (
          <ThemeCard
            key={def.key}
            definition={def}
            isActive={themeName === def.key}
            onPress={() => switchTheme(def.key)}
            activeAccent={theme.accent}
          />
        ))}
      </View>
      <ActiveThemePill themeName={themeName} theme={theme} />
    </Animated.View>
  );
}

function ThemeCard({ definition, isActive, onPress, activeAccent }) {
  const { cardBg, cardBorder, swatches, label, description, icon, labelColor, mutedColor } = definition;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkFade = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(isActive ? 1 : 0.6)).current;
  const borderOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    const toValue = isActive ? 1 : 0;
    const toScale = isActive ? 1 : 0.6;
    Animated.parallel([
      Animated.spring(checkFade, { toValue, useNativeDriver: true, speed: 18, bounciness: 6 }),
      Animated.spring(checkScale, { toValue: toScale, useNativeDriver: true, speed: 18, bounciness: 8 }),
      Animated.timing(borderOpacity, { toValue, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start();
  }, [isActive, checkFade, checkScale, borderOpacity]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
  }, [scaleAnim]);

  const animatedBorderColor = borderOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [cardBorder, activeAccent],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        <Animated.View style={[styles.themeCard, { backgroundColor: cardBg, borderColor: animatedBorderColor }]}>
          <View style={styles.swatchRow}>
            {swatches.map((color, i) => (
              <View key={i} style={[styles.swatch, { backgroundColor: color, width: i === 2 ? 16 : 12, height: i === 2 ? 16 : 12, borderRadius: i === 2 ? 8 : 6 }]} />
            ))}
          </View>
          <View style={[styles.themeIconWrap, { backgroundColor: swatches[2] + '22', borderColor: swatches[2] + '44' }]}>
            <Feather name={icon} size={16} color={swatches[2]} />
          </View>
          <Text style={[styles.themeCardLabel, { color: labelColor }]} numberOfLines={1}>{label}</Text>
          <Text style={[styles.themeCardDesc, { color: mutedColor }]} numberOfLines={1}>{description}</Text>
          <Animated.View style={[styles.checkBadge, { backgroundColor: activeAccent, opacity: checkFade, transform: [{ scale: checkScale }] }]}>
            <Feather name="check" size={9} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ActiveThemePill({ themeName, theme }) {
  const LABELS = { light: 'Ivory Light', dark: 'Midnight Dark', coffee: 'Espresso Coffee' };
  const ICONS  = { light: 'sun',         dark: 'moon',          coffee: 'coffee' };
  return (
    <View style={[styles.activePill, { backgroundColor: theme.accentSoft, borderColor: theme.accent + '40' }]}>
      <Feather name={ICONS[themeName] ?? 'circle'} size={12} color={theme.accent} />
      <Text style={[styles.activePillText, { color: theme.accent }]}>
        {LABELS[themeName] ?? themeName} is active
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 4 },
  sectionHeader: { marginBottom: 16, gap: 3 },
  sectionTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 18, letterSpacing: 0.2 },
  sectionSubtitle: { fontSize: 12.5, letterSpacing: 0.4, fontWeight: '500' },
  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  themeCard: { borderRadius: 20, borderWidth: 1.5, padding: 14, alignItems: 'flex-start', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, minHeight: 140, position: 'relative' },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  swatch: { borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  themeIconWrap: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themeCardLabel: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.1 },
  themeCardDesc: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  activePillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
});
          
