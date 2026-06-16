import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const themes = {
  light: {
    id: 'light',
    name: 'Vanilla Light',
    surface: '#FFFFFF', 
    card: '#F2EFE9', 
    border: '#E8E3DB', 
    accent: '#B5838D',
    accentSoft: '#F2E8EA', 
    text: '#2D2A2E', 
    muted: '#9B9099'
  },
  dark: {
    id: 'dark',
    name: 'Midnight Dark',
    surface: '#121212', 
    card: '#1E1E1E', 
    border: '#2C2C2C', 
    accent: '#FFB4A2', 
    accentSoft: '#3A2A2D', 
    text: '#E0E0E0', 
    muted: '#888888'
  },
  coffee: {
    id: 'coffee',
    name: 'Mocha Coffee',
    surface: '#FAEDE3', 
    card: '#EEDAC5', 
    border: '#D4B89F', 
    accent: '#8D6E63',
    accentSoft: '#D7CCC8', 
    text: '#3E2723', 
    muted: '#795548'
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState(themes.light);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedThemeId = await AsyncStorage.getItem('@lumina_theme');
        if (savedThemeId && themes[savedThemeId]) {
          setActiveTheme(themes[savedThemeId]);
        }
      } catch (error) {
        console.error("Theme load error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const switchTheme = async (themeId) => {
    try {
      setActiveTheme(themes[themeId]);
      await AsyncStorage.setItem('@lumina_theme', themeId);
    } catch (error) {
      console.error("Theme save error:", error);
    }
  };

  const themeName = activeTheme.id;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, switchTheme, themeName, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
