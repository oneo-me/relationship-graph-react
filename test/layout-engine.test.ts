import { afterEach, describe, expect, test } from 'bun:test';
import { createGraphLayoutEngine } from '../src/layout-engine.js';
import { createGraphLayoutTransport } from '../src/layout-transport.js';
import type { GraphLayoutWorkerRequest } from '../src/layout-worker.js';

interface Emission {
  revision: number;
  positions: Float32Array;
  settled: boolean;
}

function triGraph(revision: number): GraphLayoutWorkerRequest {
  return {
    type: 'initialize',
    revision,
    reduceMotion: true,
    nodes: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 0, y: 100 },
    ],
    links: [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
    ],
  };
}

describe('createGraphLayoutEngine', () => {
  test('emits one settled snapshot for a reduced-motion initialize', () => {
    const emissions: Emission[] = [];
    const engine = createGraphLayoutEngine({
      emit(emission) {
        emissions.push({ ...emission });
      },
    });
    engine.handle(triGraph(1));

    expect(emissions).toHaveLength(1);
    const emission = emissions[0];
    expect(emission?.revision).toBe(1);
    expect(emission?.settled).toBe(true);
    expect(emission?.positions).toHaveLength(6);
    for (const value of emission?.positions ?? []) {
      expect(Number.isFinite(value)).toBe(true);
    }
    engine.destroy();
  });

  test('places added nodes without dropping existing ones', () => {
    const emissions: Emission[] = [];
    const engine = createGraphLayoutEngine({
      emit(emission) {
        emissions.push({ ...emission });
      },
    });
    engine.handle(triGraph(1));
    emissions.length = 0;
    engine.handle({
      type: 'update',
      revision: 2,
      nodes: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 100, y: 0 },
        { id: 'c', x: 0, y: 100 },
        { id: 'd', x: 200, y: 200 },
      ],
      links: [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' },
        { source: 'b', target: 'd' },
      ],
    });

    expect(emissions).toHaveLength(1);
    expect(emissions[0]?.revision).toBe(2);
    expect(emissions[0]?.positions).toHaveLength(8);
    expect(emissions[0]?.settled).toBe(true);
    engine.destroy();
  });

  test('ignores pin and release before any initialize', () => {
    const engine = createGraphLayoutEngine({ emit() {} });
    expect(() => engine.handle({ type: 'pin', id: 'a', x: 1, y: 2 })).not.toThrow();
    expect(() => engine.handle({ type: 'release', id: 'a' })).not.toThrow();
    engine.destroy();
  });

  test('ignores an update before any initialize', () => {
    const emissions: Emission[] = [];
    const engine = createGraphLayoutEngine({
      emit(emission) {
        emissions.push({ ...emission });
      },
    });
    engine.handle({
      type: 'update',
      revision: 1,
      nodes: [{ id: 'a', x: 0, y: 0 }],
      links: [],
    });
    expect(emissions).toHaveLength(0);
    engine.destroy();
  });
});

describe('createGraphLayoutTransport', () => {
  const originalWorker = Reflect.get(globalThis, 'Worker');

  afterEach(() => {
    Reflect.set(globalThis, 'Worker', originalWorker);
  });

  test('falls back to the main-thread engine without a Worker global', () => {
    Reflect.set(globalThis, 'Worker', undefined);
    const received: Emission[] = [];
    const transport = createGraphLayoutTransport(
      (revision, positions, settled) => {
        received.push({ revision, positions, settled });
      },
    );

    transport.post(triGraph(7));
    expect(received).toHaveLength(1);
    expect(received[0]?.revision).toBe(7);
    expect(received[0]?.positions).toHaveLength(6);

    transport.terminate();
  });

  test('replays the last request when the worker cannot be created', () => {
    Reflect.set(globalThis, 'Worker', function BrokenWorker() {
      throw new Error('worker unavailable');
    });
    const received: Emission[] = [];
    const transport = createGraphLayoutTransport(
      (revision, positions, settled) => {
        received.push({ revision, positions, settled });
      },
    );

    transport.post(triGraph(3));
    expect(received).toHaveLength(1);
    expect(received[0]?.revision).toBe(3);
    transport.terminate();
  });
});
