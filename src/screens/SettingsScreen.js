import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Yahan apna path sahi karna
import ThemeSwitcher from '../components/ThemeSwitcher'; // Yahan apne component ka path

export default function SettingsScreen() {
  // Yeh line hai sabse important: Ye theme ka 'Brain' access karti hai
  const { theme } = useTheme();

  return (
    // Dekho yahan background inline style se change ho raha hai
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      </View>

      {/* Yahan humne ThemeSwitcher component laga diya */}
      <ThemeSwitcher />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
});
