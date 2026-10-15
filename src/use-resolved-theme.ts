import { useEffect, useState } from 'react';
import type { GraphTheme } from './colors.js';

export type GraphThemePreference = GraphTheme | 'auto';

/** Reads the theme the surrounding document already uses. */
function detectTheme(): GraphTheme {
  if (typeof document === 'undefined') return 'light';
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Resolves `auto` against the host page: an explicit `dark` or `light` class on
 * `<html>` wins, otherwise the `prefers-color-scheme` media query decides. The
 * value stays in sync while the component is mounted.
 */
export function useResolvedTheme(
  preference: GraphThemePreference,
): GraphTheme {
  const [detected, setDetected] = useState<GraphTheme>(() =>
    preference === 'auto' ? detectTheme() : preference,
  );

  useEffect(() => {
    if (preference !== 'auto') return;
    const sync = () => setDetected(detectTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributeFilter: ['class'],
      attributes: true,
    });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      media?.removeEventListener('change', sync);
    };
  }, [preference]);

  return preference === 'auto' ? detected : preference;
}
