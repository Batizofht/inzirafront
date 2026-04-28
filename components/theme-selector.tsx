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
        style={[styles.item, { borderColor: colors.border }]}
        onPress={() => setShowOptions((prev) => !prev)}
      >
        <View style={styles.row}>
          <ThemedText style={styles.itemText}>Dark Mode</ThemedText>
          <View style={styles.rowRight}>
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
        <View style={[styles.options, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {THEME_MODES.map((mode) => {
            const label = mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light';
            const isSelected = mode === selectedMode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.option, { borderBottomColor: colors.border }]}
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
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  options: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
