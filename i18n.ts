import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en';
import fr from './locales/fr';
import rw from './locales/rw';

const resources = {
  en,
  fr,
  rw,
};

const LANGUAGE_KEY = 'app_language';
let inMemoryLanguage = 'en';
let storageUnavailable = false;

const readSavedLanguage = async () => {
  if (storageUnavailable || typeof window === 'undefined') {
    return inMemoryLanguage;
  }

  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang) {
      inMemoryLanguage = storedLang;
      return storedLang;
    }
  } catch (error) {
    storageUnavailable = true;
    console.warn('AsyncStorage get failed, using memory storage', error);
  }

  return inMemoryLanguage;
};

const saveLanguage = async (lng: string) => {
  inMemoryLanguage = lng;

  if (storageUnavailable) {
    return;
  }

  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  } catch (error) {
    storageUnavailable = true;
    console.warn('AsyncStorage set failed, using memory storage', error);
  }
};

const initI18n = async () => {
  const savedLanguage = await readSavedLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
    });
};

initI18n();

export const changeLanguage = async (lng: string) => {
  try {
    await i18n.changeLanguage(lng);
    await saveLanguage(lng);
  } catch (error) {
    console.error('Error saving language to storage', error);
  }
};

export default i18n;
