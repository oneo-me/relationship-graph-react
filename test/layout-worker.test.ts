import { describe, expect, test } from 'bun:test';
import {
  graphLayoutOutputInterval,
  positionNewGraphNode,
  resolveGraphLayoutLinks,
} from '../src/layout-worker.js';

describe('graphLayoutOutputInterval', () => {
  test('emits every frame for small graphs', () => {
    expect(graphLayoutOutputInterval(10, 10)).toBe(1_000 / 60);
  });

  test('throttles medium and large graphs', () => {
    expect(graphLayoutOutputInterval(1_000, 200)).toBe(1_000 / 30);
    expect(graphLayoutOutputInterval(3_000, 1_000)).toBe(1_000 / 20);
  });

  test('treats negative counts as empty', () => {
    expect(graphLayoutOutputInterval(-5, -5)).toBe(1_000 / 60);
  });
});

describe('resolveGraphLayoutLinks', () => {
  test('derives strength from the lower degree of both ends', () => {
    const resolved = resolveGraphLayoutLinks([
      { source: 'hub', target: 'leaf' },
      { source: 'hub', target: 'other' },
    ]);
    expect(resolved[0]?.strength).toBe(1);
    expect(resolved[1]?.strength).toBe(1);
  });

  test('lowers strength when both ends have many links', () => {
    const resolved = resolveGraphLayoutLinks([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ]);
    for (const link of resolved) {
      expect(link.strength).toBeCloseTo(0.5, 10);
    }
  });

  test('keeps explicit strength and excludes it from the degree tally', () => {
    const resolved = resolveGraphLayoutLinks([
      { source: 'a', target: 'b', strength: 0.9 },
      { source: 'a', target: 'c' },
      { source: 'a', target: 'd' },
    ]);
    expect(resolved[0]?.strength).toBe(0.9);
    // Only the two implicit links count toward `a`, so min(2, 1) is still 1.
    expect(resolved[1]?.strength).toBe(1);
  });
});

describe('positionNewGraphNode', () => {
  const node = { id: 'new', x: 10, y: 0 };

  test('keeps the seed when there are no known neighbours', () => {
    expect(positionNewGraphNode(node, [], new Map())).toEqual({
      x: 10,
      y: 0,
    });
  });

  test('offsets the node from its neighbour centroid', () => {
    const positions = new Map([['a', { x: 100, y: 100 }]]);
    const placed = positionNewGraphNode(
      node,
      [{ source: 'new', target: 'a' }],
      positions,
    );
    expect(Math.hypot(placed.x - 100, placed.y - 100)).toBeCloseTo(24, 10);
  });

  test('averages several neighbours', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 100, y: 100 }],
    ]);
    const placed = positionNewGraphNode(
      node,
      [
        { source: 'a', target: 'new' },
        { source: 'b', target: 'new' },
      ],
      positions,
    );
    expect(Math.hypot(placed.x - 50, placed.y - 50)).toBeCloseTo(24, 10);
  });
});
