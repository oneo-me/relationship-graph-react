import { describe, expect, test } from 'bun:test';
import {
  createDirectoryGraphColorMap,
  createGraphPalette,
  topLevelDirectory,
} from '../src/colors.js';

describe('topLevelDirectory', () => {
  test('keeps the first path segment', () => {
    expect(topLevelDirectory('projects/foo/index.md')).toBe('projects');
    expect(topLevelDirectory('projects/foo/bar.md')).toBe('projects');
  });

  test('treats root documents as unclustered', () => {
    expect(topLevelDirectory('index.md')).toBe('');
    expect(topLevelDirectory('')).toBe('');
    expect(topLevelDirectory('./index.md')).toBe('');
  });

  test('normalizes windows separators and leading dots', () => {
    expect(topLevelDirectory('projects\\foo\\index.md')).toBe('projects');
    expect(topLevelDirectory('./projects/index.md')).toBe('projects');
  });
});

describe('createDirectoryGraphColorMap', () => {
  test('assigns a distinct hue to every sorted directory', () => {
    const map = createDirectoryGraphColorMap(['b', 'a', 'c']);
    expect([...map.keys()]).toEqual(['a', 'b', 'c']);
    const fills = [...map.values()].map((color) => color.fill);
    expect(new Set(fills).size).toBe(3);
    for (const color of map.values()) {
      expect(color.fill).toMatch(/^hsl\(/);
      expect(color.label).toMatch(/^hsl\(/);
    }
  });

  test('ignores blank and repeated directories', () => {
    const map = createDirectoryGraphColorMap(['a', 'a', ' ', '']);
    expect([...map.keys()]).toEqual(['a']);
  });

  test('switches the palette with the theme', () => {
    const light = createDirectoryGraphColorMap(['a'], 'light');
    const dark = createDirectoryGraphColorMap(['a'], 'dark');
    expect(light.get('a')).not.toEqual(dark.get('a'));
  });

  test('gives the same directory the same color across calls', () => {
    const first = createDirectoryGraphColorMap(['a', 'b']);
    const second = createDirectoryGraphColorMap(['a', 'b']);
    expect(first.get('b')).toEqual(second.get('b'));
  });
});

describe('createGraphPalette', () => {
  test('exposes a complete palette per theme', () => {
    const light = createGraphPalette('light');
    const dark = createGraphPalette('dark');
    expect(light.document.fill).toBe('#626a70');
    expect(dark.document.fill).toBe('#9aa7b3');
    expect(light.attachmentEdgeOpacity).toBeLessThan(1);
    expect(dark.hierarchyEdgeOpacity).toBeGreaterThan(0);
  });

  test('returns the same frozen palette for the same theme', () => {
    expect(createGraphPalette('dark')).toBe(createGraphPalette('dark'));
  });
});
