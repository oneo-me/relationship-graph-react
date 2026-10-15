import { describe, expect, test } from 'bun:test';
import {
  buildGraphAdjacency,
  compensateCameraForGraphCenter,
  computeHoverDepths,
  fitGraphLabel,
  graphBoundsCenter,
  graphRevealNodeCount,
  graphWheelInteraction,
  hoverEmphasisForDepth,
  hoverEmphasisForEdge,
  hoverMuteForEdge,
  hoverMuteForNode,
  mixGraphColor,
  parseGraphColor,
} from '../src/canvas-renderer.js';

describe('parseGraphColor', () => {
  test('reads hex colors', () => {
    expect(parseGraphColor('#028bff')).toEqual([2, 139, 255]);
  });

  test('reads rgb and rgba colors', () => {
    expect(parseGraphColor('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
    expect(parseGraphColor('rgba(1 2 3 / 0.5)')).toEqual([1, 2, 3]);
  });

  test('reads hsl colors', () => {
    expect(parseGraphColor('hsl(0, 100%, 50%)')).toEqual([255, 0, 0]);
    expect(parseGraphColor('hsl(120, 100%, 25%)')).toEqual([0, 128, 0]);
  });

  test('rejects unsupported notations', () => {
    expect(parseGraphColor('oklab(0.5 0 0)')).toBeNull();
    expect(parseGraphColor('red')).toBeNull();
  });
});

describe('mixGraphColor', () => {
  test('interpolates between two colors', () => {
    expect(mixGraphColor('#000000', '#ffffff', 0)).toBe('rgb(0, 0, 0)');
    expect(mixGraphColor('#000000', '#ffffff', 1)).toBe(
      'rgb(255, 255, 255)',
    );
    expect(mixGraphColor('#000000', '#ffffff', 0.5)).toBe(
      'rgb(128, 128, 128)',
    );
  });

  test('clamps the amount and falls back for unknown colors', () => {
    expect(mixGraphColor('#000000', '#ffffff', 2)).toBe('rgb(255, 255, 255)');
    expect(mixGraphColor('red', 'blue', 0)).toBe('red');
    expect(mixGraphColor('red', 'blue', 1)).toBe('blue');
  });
});

describe('fitGraphLabel', () => {
  const measure = (value: string) => value.length;

  test('keeps labels that already fit', () => {
    expect(fitGraphLabel('abc', 10, measure)).toBe('abc');
  });

  test('truncates with a single-character ellipsis', () => {
    expect(fitGraphLabel('abcdef', 4, measure)).toBe('abc…');
  });

  test('splits by code point instead of UTF-16 unit', () => {
    expect(fitGraphLabel('😀😀😀😀', 3, measure)).toBe('😀…');
  });

  test('returns nothing when even the ellipsis is too wide', () => {
    expect(fitGraphLabel('abcdef', 0, measure)).toBe('');
  });
});

describe('buildGraphAdjacency', () => {
  test('links both directions and skips missing neighbours', () => {
    const adjacency = buildGraphAdjacency(3, [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 0, target: 9 },
    ]);
    expect(adjacency).toEqual([[1, 9], [0, 2], [1]]);
  });
});
