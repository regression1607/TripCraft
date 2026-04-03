import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, getTypography } from '../styles/theme';

const SettingsContext = createContext({});

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'THB'];

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [chatMode, setChatMode] = useState('online'); // 'online' | 'offline'

  const themeColors = darkMode ? darkColors : lightColors;
  const themeTypography = getTypography(themeColors);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setDarkMode(parsed.darkMode || false);
        setCurrency(parsed.currency || 'USD');
        setChatMode(parsed.chatMode || 'online');
      }
    } catch (e) {
      // silent
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
    } catch (e) {
      // silent
    }
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    saveSettings({ darkMode: newValue, currency, chatMode });
  };

  const updateCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    saveSettings({ darkMode, currency: newCurrency, chatMode });
  };

  const toggleChatMode = () => {
    const newMode = chatMode === 'online' ? 'offline' : 'online';
    setChatMode(newMode);
    saveSettings({ darkMode, currency, chatMode: newMode });
  };

  return (
    <SettingsContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        currency,
        updateCurrency,
        currencies: CURRENCIES,
        chatMode,
        toggleChatMode,
        colors: themeColors,
        typography: themeTypography,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
