import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { THEME_MODES, setThemeModePreference, getThemeModePreference, subscribeThemePreference } from '@/lib/themePreference';
import { useState, useEffect } from 'react';

interface ThemeSelectorProps {
  colors: {
    border: string;
    primary: string;
    icon: string;
    text: string;
    card: string;
  };
}

export function ThemeSelector({ colors }: ThemeSelectorProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMode, setSelectedMode] = useState(() => getThemeModePreference());

  useEffect(() => {
    // Subscribe to theme preference changes
    const unsubscribe = subscribeThemePreference(() => {
      setSelectedMode(getThemeModePreference());
    });
    return () => { unsubscribe(); };
  }, []);

  const themeModeLabel = selectedMode === 'system' ? 'System' : selectedMode === 'dark' ? 'Dark' : 'Light';

  const handleSelect = (mode: typeof selectedMode) => {
    setThemeModePreference(mode);
    setSelectedMode(mode);
    setShowOptions(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.sheetItem, { borderColor: colors.border }]}
        onPress={() => setShowOptions((prev) => !prev)}
      >
        <View style={styles.currencyRow}>
          <ThemedText style={styles.sheetItemText}>Dark Mode</ThemedText>
          <View style={styles.currencyRowRight}>
            <ThemedText style={{ color: colors.primary, marginRight: 8, fontWeight: '700' }}>
              {themeModeLabel}
            </ThemedText>
            <IconSymbol
              name={showOptions ? 'chevron.down' : 'chevron.right'}
              size={18}
              color={colors.icon}
            />
          </View>
        </View>
      </TouchableOpacity>

      {showOptions && (
        <View style={[styles.currencyOptions, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {THEME_MODES.map((mode) => {
            const label = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
            const isSelected = mode === selectedMode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.currencyOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSelect(mode)}
              >
                <ThemedText
                  style={{
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  sheetItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyOptions: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  currencyOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
