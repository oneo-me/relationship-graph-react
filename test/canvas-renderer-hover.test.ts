import { describe, expect, test } from 'bun:test';
import {
  compensateCameraForGraphCenter,
  computeHoverDepths,
  graphBoundsCenter,
  graphRevealNodeCount,
  graphWheelInteraction,
  hoverEmphasisForDepth,
  hoverEmphasisForEdge,
  hoverMuteForEdge,
  hoverMuteForNode,
} from '../src/canvas-renderer.js';

describe('computeHoverDepths', () => {
  // 0 - 1 - 2    3 (isolated)
  const adjacency = [[1], [0, 2], [1], []];

  test('walks one hop by default', () => {
    const depths = computeHoverDepths(adjacency, 1);
    expect([...depths.entries()].sort()).toEqual([
      [0, 1],
      [1, 0],
      [2, 1],
    ]);
  });

  test('respects the requested depth', () => {
    expect(computeHoverDepths(adjacency, 0, 2).get(2)).toBe(2);
    expect(computeHoverDepths(adjacency, 0, 1).get(2)).toBeUndefined();
  });

  test('returns nothing for an out-of-range root', () => {
    expect(computeHoverDepths(adjacency, -1).size).toBe(0);
    expect(computeHoverDepths(adjacency, 4).size).toBe(0);
  });
});

describe('hover emphasis helpers', () => {
  test('maps depth to emphasis and leaves unrelated nodes flat', () => {
    expect(hoverEmphasisForDepth(0)).toBe(1);
    expect(hoverEmphasisForDepth(1)).toBe(0.8);
    expect(hoverEmphasisForDepth(2)).toBe(0);
    expect(hoverEmphasisForDepth(undefined)).toBe(0);
  });

  test('an edge counts only when both ends are in the neighborhood', () => {
    // 0 - 1 - 2 with 3 isolated, hovering 1.
    const depths = computeHoverDepths([[1], [0, 2], [1], []], 1);
    expect(hoverEmphasisForEdge(depths, 1, 0)).toBe(0.8);
    expect(hoverEmphasisForEdge(depths, 1, 3)).toBe(0);
    expect(hoverEmphasisForEdge(null, 0, 1)).toBe(0);
  });
});

describe('hover mute easing', () => {
  test('a node outside both neighborhoods stays muted', () => {
    const current = new Map([[1, 0]]);
    expect(hoverMuteForNode(current, current, 0, 1)).toBe(1);
    expect(hoverMuteForNode(current, current, 1, 1)).toBe(0);
  });

  test('a node leaves the neighborhood gradually', () => {
    const before = new Map([[1, 0]]);
    const after = new Map([[0, 0]]);
    expect(hoverMuteForNode(before, after, 1, 0)).toBe(0);
    expect(hoverMuteForNode(before, after, 1, 0.5)).toBe(0.5);
    expect(hoverMuteForNode(before, after, 1, 1)).toBe(1);
  });

  test('an edge is muted while either end is outside', () => {
    const current = new Map([
      [0, 0],
      [1, 0],
    ]);
    expect(hoverMuteForEdge(current, current, 0, 1, 1)).toBe(0);
    expect(hoverMuteForEdge(current, current, 0, 2, 1)).toBe(1);
    expect(hoverMuteForEdge(null, current, 0, 2, 1)).toBe(1);
  });
});

describe('graphRevealNodeCount', () => {
  test('reveals nothing before the animation starts', () => {
    expect(graphRevealNodeCount(10, -1)).toBe(0);
    expect(graphRevealNodeCount(0, 10)).toBe(0);
  });

  test('reveals every node when the duration elapses', () => {
    expect(graphRevealNodeCount(10, 1_000)).toBe(10);
    expect(graphRevealNodeCount(10, 5, 0)).toBe(10);
  });

  test('never reveals more than the node count and never zero once running', () => {
    const count = graphRevealNodeCount(10, 1);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(10);
  });
});

describe('graphWheelInteraction', () => {
  const pageHeight = 800;

  test('scales line and page deltas to pixels', () => {
    expect(
      graphWheelInteraction({ ctrlKey: false, deltaMode: 1, deltaY: 3 }, pageHeight)
        .delta,
    ).toBe(48);
    expect(
      graphWheelInteraction({ ctrlKey: false, deltaMode: 2, deltaY: 1 }, pageHeight)
        .delta,
    ).toBe(800);
  });

  test('treats ctrl+wheel as a pinch gesture', () => {
    expect(
      graphWheelInteraction({ ctrlKey: true, deltaMode: 0, deltaY: 10 }, pageHeight)
        .source,
    ).toBe('pinch');
    expect(
      graphWheelInteraction({ ctrlKey: false, deltaMode: 0, deltaY: 10 }, pageHeight)
        .source,
    ).toBe('wheel');
  });
});

describe('graphBoundsCenter', () => {
  test('returns the center of the position envelope', () => {
    expect(graphBoundsCenter(new Float32Array([0, 0, 10, 20]))).toEqual({
      x: 5,
      y: 10,
    });
  });

  test('returns nothing for an empty graph', () => {
    expect(graphBoundsCenter(new Float32Array())).toBeNull();
  });
});

describe('compensateCameraForGraphCenter', () => {
  test('shifts the camera by the zoomed center delta', () => {
    expect(
      compensateCameraForGraphCenter(
        { x: 100, y: 100, zoom: 2 },
        { x: 10, y: 10 },
        { x: 20, y: 5 },
      ),
    ).toEqual({ x: 80, y: 110, zoom: 2 });
  });
});
