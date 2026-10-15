import { describe, expect, test } from 'bun:test';
import {
  graphNodeDiameter,
  graphNodeScreenRadius,
  initialGraphPosition,
} from '../src/layout.js';

describe('graphNodeDiameter', () => {
  test('clamps to the minimum diameter for light nodes', () => {
    expect(graphNodeDiameter(0)).toBe(12);
    expect(graphNodeDiameter(-5)).toBe(12);
  });

  test('grows with degree and clamps at the maximum', () => {
    expect(graphNodeDiameter(10)).toBeGreaterThan(graphNodeDiameter(0));
    expect(graphNodeDiameter(1_000_000)).toBe(44);
  });
});

describe('graphNodeScreenRadius', () => {
  test('keeps the full radius at normal zoom levels', () => {
    expect(graphNodeScreenRadius(20, 1)).toBe(10);
    expect(graphNodeScreenRadius(20, 0.4)).toBe(10);
  });

  test('shrinks with distant overviews and never disappears', () => {
    expect(graphNodeScreenRadius(20, 0.2)).toBe(5);
    expect(graphNodeScreenRadius(20, 0.000_001)).toBe(0.75);
  });
});

describe('initialGraphPosition', () => {
  test('is deterministic for a node id', () => {
    const first = initialGraphPosition({ id: 'a.md' }, 10);
    const second = initialGraphPosition({ id: 'a.md' }, 10);
    expect(first).toEqual(second);
  });

  test('spreads node ids inside the area envelope', () => {
    const outerRadius = Math.sqrt((100 * 60 * 60) / Math.PI);
    for (const id of ['a', 'b', 'c', 'd']) {
      const position = initialGraphPosition({ id }, 100);
      expect(Math.hypot(position.x, position.y)).toBeLessThanOrEqual(
        outerRadius + 1e-6,
      );
    }
    expect(initialGraphPosition({ id: 'a' }, 100)).not.toEqual(
      initialGraphPosition({ id: 'b' }, 100),
    );
  });

  test('seeds same-directory nodes near their cluster ring', () => {
    const cluster = { index: 0, count: 4 };
    const position = initialGraphPosition({ id: 'a' }, 40, cluster);
    const outerRadius = Math.sqrt((40 * 60 * 60) / Math.PI);
    const clusterRing = outerRadius * 0.72;
    const distance = Math.hypot(position.x, position.y);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(
      clusterRing + Math.sqrt(((40 / 4) * 60 * 60) / Math.PI) * 0.95 + 1e-6,
    );
  });

  test('ignores clusters that hold a single directory', () => {
    expect(initialGraphPosition({ id: 'a' }, 10, { index: 0, count: 1 })).toEqual(
      initialGraphPosition({ id: 'a' }, 10),
    );
  });
});
