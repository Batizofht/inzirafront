import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

export type HeadingProps = ThemedTextProps & {
  /** Maps to h1–h6 on web. Use exactly one level-1 heading per screen. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

/**
 * A ThemedText that react-native-web renders as a real <h1>–<h6>.
 *
 * Without this every heading on the site exports as an anonymous <div>, which
 * leaves crawlers with no document outline and nothing to treat as the page's
 * primary topic. On native the role/aria props are just accessibility hints.
 */
export function Heading({ level = 2, ...rest }: HeadingProps) {
  return <ThemedText role="heading" aria-level={level} {...rest} />;
}
