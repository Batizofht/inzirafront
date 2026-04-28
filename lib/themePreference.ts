import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeb } from './platform';

export const THEME_MODES = ['system', 'light', 'dark'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

const THEME_STORAGE_KEY = '@theme_mode';

let selectedThemeMode: ThemeMode = 'system';
let isInitialized = false;
const listeners = new Set<() => void>();

const canUseLocalStorage = () => isWeb && typeof window !== 'undefined';

export async function loadThemePreference(): Promise<void> {
  if (isInitialized) return;
  try {
    const value = canUseLocalStorage()
      ? localStorage.getItem(THEME_STORAGE_KEY)
      : await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (value && (value === 'system' || value === 'light' || value === 'dark')) {
      selectedThemeMode = value as ThemeMode;
    }
  } catch {
    // Keep default
  }
  isInitialized = true;
}

export function getThemeModePreference(): ThemeMode {
  if (!isInitialized) {
    // Return default until loaded
    return 'system';
  }
  return selectedThemeMode;
}

export async function setThemeModePreference(mode: ThemeMode): Promise<void> {
  selectedThemeMode = mode;
  try {
    if (canUseLocalStorage()) {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } else if (!isWeb) {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  } catch {
    // Silently fail
  }
  listeners.forEach((listener) => listener());
}

export function subscribeThemePreference(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
