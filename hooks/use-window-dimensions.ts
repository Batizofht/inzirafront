import { useEffect, useLayoutEffect, useState } from 'react';
import { useWindowDimensions as useRNWindowDimensions } from 'react-native';

import { isWeb } from '@/lib/platform';

const SSR_DIMENSIONS = { width: 0, height: 0, scale: 1, fontScale: 1 };

// useLayoutEffect on a Node render (the static export pass) logs "does
// nothing on the server"; it's harmless but noisy during `expo export`.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Drop-in replacement for react-native's useWindowDimensions.
 *
 * The web build is a static export: Node has no real viewport, so every
 * width-based branch (isDesktopWeb, isLg, isXl, ...) bakes into the shipped
 * HTML as "width 0" (mobile layout). RN Web's own useWindowDimensions reads
 * the real browser width on the very first client render — which runs
 * during hydration, not after — so a desktop visitor's first client render
 * already disagrees with the mobile markup that was hydrated against. React
 * discards the mismatch and redraws, which is the flash of the mobile
 * layout every widescreen visitor was seeing before this landed.
 *
 * This keeps the first client render identical to the server (0x0, matching
 * Node), then swaps to the real measurement in a layout effect — after
 * hydration has committed but before the browser paints — so it resolves to
 * one deliberate update instead of a mismatch-triggered re-render.
 */
export function useWindowDimensions() {
  const real = useRNWindowDimensions();
  const [hydrated, setHydrated] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setHydrated(true);
  }, []);

  if (isWeb && !hydrated) {
    return SSR_DIMENSIONS;
  }

  return real;
}
