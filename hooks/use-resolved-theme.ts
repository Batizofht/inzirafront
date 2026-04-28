import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSyncExternalStore } from 'react';
import { getThemeModePreference, subscribeThemePreference } from '@/lib/themePreference';

export function useResolvedTheme(): 'light' | 'dark' {
  const systemColorScheme = useColorScheme();
  const selectedThemeMode = useSyncExternalStore(subscribeThemePreference, getThemeModePreference, getThemeModePreference);
  
  if (selectedThemeMode === 'system') {
    return systemColorScheme ?? 'light';
  }
  return selectedThemeMode;
}
