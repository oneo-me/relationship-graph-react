import { createGraphLayoutEngine } from './layout-engine.js';
import type {
  GraphLayoutWorkerRequest,
  GraphLayoutWorkerResponse,
} from './layout-worker.js';

/** Receives one position snapshot from whichever layout runtime is active. */
export type GraphPositionsHandler = (
  revision: number,
  positions: Float32Array,
  settled: boolean,
) => void;

export interface GraphLayoutTransport {
  post(request: GraphLayoutWorkerRequest): void;
  terminate(): void;
}

/**
 * Runs the layout in a worker when the environment supports one and falls back
 * to the same engine on the main thread when it does not. The fallback replays
 * the last request, so callers only ever post requests.
 */
export function createGraphLayoutTransport(
  onPositions: GraphPositionsHandler,
): GraphLayoutTransport {
  let lastRequest: GraphLayoutWorkerRequest | null = null;
  let worker: Worker | null = null;
  let engine: ReturnType<typeof createGraphLayoutEngine> | null = null;

  const startInline = () => {
    if (engine) return;
    worker?.terminate();
    worker = null;
    engine = createGraphLayoutEngine({
      emit({ revision, positions, settled }) {
        onPositions(revision, positions, settled);
      },
    });
    if (lastRequest) engine.handle(lastRequest);
  };

  if (typeof Worker === 'function') {
    try {
      const candidate = new Worker(
        new URL('./layout.worker.ts', import.meta.url),
        {
          name: 'relationship-graph layout',
          type: 'module',
        },
      );
      candidate.onmessage = (
        event: MessageEvent<GraphLayoutWorkerResponse>,
      ) => {
        if (event.data.type !== 'positions') return;
        onPositions(
          event.data.revision,
          new Float32Array(event.data.positions),
          event.data.settled,
        );
      };
      // A worker that cannot load reports through `error` instead of throwing.
      candidate.onerror = () => startInline();
      worker = candidate;
    } catch {
      worker = null;
    }
  }
  if (!worker) startInline();

  return {
    post(request) {
      lastRequest = request;
      if (worker) worker.postMessage(request);
      else engine?.handle(request);
    },
    terminate() {
      worker?.terminate();
      worker = null;
      engine?.destroy();
      engine = null;
    },
  };
}
