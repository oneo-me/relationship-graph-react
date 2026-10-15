/// <reference lib="webworker" />

import { createGraphLayoutEngine } from './layout-engine.js';
import type {
  GraphLayoutWorkerRequest,
  GraphLayoutWorkerResponse,
} from './layout-worker.js';

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope;

const engine = createGraphLayoutEngine({
  emit({ revision, positions, settled }) {
    const response: GraphLayoutWorkerResponse = {
      type: 'positions',
      revision,
      positions: positions.buffer as ArrayBuffer,
      settled,
    };
    workerScope.postMessage(response, [positions.buffer as ArrayBuffer]);
  },
});

workerScope.onmessage = (event: MessageEvent<GraphLayoutWorkerRequest>) => {
  engine.handle(event.data);
};
