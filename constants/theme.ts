/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0A2540'; // Professional Deep Navy
const tintColorDark = '#3B82F6';  // Vibrant blue for dark mode

export const Colors = {
  light: {
    text: '#1A1D20',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6C757D',
    tabIconDefault: '#ADB5BD',
    tabIconSelected: tintColorLight,
    card: '#F8F9FA',
    border: '#E9ECEF',
    primary: '#0A2540',
    secondary: '#495057',
    accent: '#1A1D20',
  },
  dark: {
    text: '#F1F3F5',
    background: '#0D1117',
    tint: tintColorDark,
    icon: '#8B949E',
    tabIconDefault: '#6E7681',
    tabIconSelected: tintColorDark,
    card: '#161B22',
    border: '#30363D',
    primary: '#3B82F6',
    secondary: '#8B949E',
    accent: '#F1F3F5',
  },
};

/**
 * Design tokens — a single source of truth for spacing, radius, typography
 * and (deliberately restrained) elevation. The brief: professional and clean,
 * NOT heavy drop-shadows. Cards lean on borders + a faint hairline lift.
 */

/** 4pt spacing scale. Use Spacing.md instead of magic numbers like 16. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/** Corner radius scale. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Type scale — sizes + the line-heights/weights that make text feel designed. */
export const Type = {
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.2 },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  headline: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.4 },
  price: { fontSize: 18, lineHeight: 22, fontWeight: '800' as const, letterSpacing: -0.3 },
} as const;

/**
 * Flat elevation. The user explicitly dislikes heavy shadows, so cards use a
 * crisp 1px border plus an almost-imperceptible lift. `card` is the default for
 * vehicle cards; `raised` is reserved for sheets/menus that float over content.
 */
export const Elevation = {
  flat: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  raised: {
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
