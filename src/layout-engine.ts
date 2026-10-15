import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { GRAPH_FORCE_DEFAULTS } from './layout.js';
import {
  graphLayoutOutputInterval,
  positionNewGraphNode,
  resolveGraphLayoutLinks,
  type GraphLayoutLinkInput,
  type GraphLayoutNodeInput,
  type GraphLayoutWorkerRequest,
} from './layout-worker.js';

interface EngineNode extends SimulationNodeDatum {
  id: string;
}

interface EngineLink extends SimulationLinkDatum<EngineNode> {
  distance?: number;
  strength: number;
}

const SIMULATION_TICK_COUNT = 300;
const INITIAL_TICK_COUNT = 80;
const UPDATE_ALPHA = 0.35;

export interface GraphLayoutEmission {
  revision: number;
  positions: Float32Array;
  settled: boolean;
}

export interface GraphLayoutEngineOptions {
  /** Receives every position snapshot the simulation produces. */
  emit(emission: GraphLayoutEmission): void;
}

export interface GraphLayoutEngine {
  handle(request: GraphLayoutWorkerRequest): void;
  /** Stops the simulation and releases its timer. */
  destroy(): void;
}

/**
 * Owns one d3-force simulation and its incremental rewiring. It runs unchanged
 * inside the layout worker and, as a fallback, on the main thread.
 */
export function createGraphLayoutEngine({
  emit,
}: GraphLayoutEngineOptions): GraphLayoutEngine {
  let nodes: EngineNode[] = [];
  let nodeById = new Map<string, EngineNode>();
  let simulation: Simulation<EngineNode, EngineLink> | null = null;
  let linkForce: ReturnType<typeof forceLink<EngineNode, EngineLink>> | null =
    null;
  let lastOutputTime = 0;
  let outputInterval = 1_000 / 60;
  let reduceMotion = false;
  let revision = 0;

  function sendPositions(settled: boolean) {
    const positions = new Float32Array(nodes.length * 2);
    for (const [index, node] of nodes.entries()) {
      positions[index * 2] = node.x ?? 0;
      positions[index * 2 + 1] = node.y ?? 0;
    }
    emit({ revision, positions, settled });
  }

  function sendCurrentPositions() {
    const now = performance.now();
    if (now - lastOutputTime < outputInterval) return;
    lastOutputTime = now;
    sendPositions(false);
  }

  function initialize(
    request: Extract<GraphLayoutWorkerRequest, { type: 'initialize' }>,
  ) {
    simulation?.stop();
    revision = request.revision;
    reduceMotion = request.reduceMotion;
    outputInterval = graphLayoutOutputInterval(
      request.nodes.length,
      request.links.length,
    );
    nodes = request.nodes.map((node) => ({ ...node }));
    nodeById = new Map(nodes.map((node) => [node.id, node]));
    const links: EngineLink[] = resolveGraphLayoutLinks(request.links).map(
      (link) => ({
        distance: link.distance,
        source: link.source,
        strength: link.strength,
        target: link.target,
      }),
    );
    linkForce = forceLink<EngineNode, EngineLink>(links)
      .id((node) => node.id)
      .distance((link) => link.distance ?? GRAPH_FORCE_DEFAULTS.linkDistance)
      .strength((link) => link.strength);

    simulation = forceSimulation(nodes)
      .alpha(1)
      .alphaDecay(1 - 0.001 ** (1 / SIMULATION_TICK_COUNT))
      .velocityDecay(0.4)
      // Force order is significant: run collision last so no later force can
      // reintroduce overlap during the same frame. This mirrors Locus.
      .force(
        'center-x',
        forceX<EngineNode>(0).strength(GRAPH_FORCE_DEFAULTS.centerStrength),
      )
      .force(
        'center-y',
        forceY<EngineNode>(0).strength(GRAPH_FORCE_DEFAULTS.centerStrength),
      )
      .force('link', linkForce)
      .force(
        'charge',
        forceManyBody<EngineNode>()
          .strength(GRAPH_FORCE_DEFAULTS.repelStrength)
          .distanceMin(30),
      )
      .force(
        'collide',
        forceCollide<EngineNode>()
          .radius(GRAPH_FORCE_DEFAULTS.collisionRadius)
          .strength(GRAPH_FORCE_DEFAULTS.collisionStrength),
      )
      .stop();

    if (reduceMotion) {
      simulation.tick(SIMULATION_TICK_COUNT);
      sendPositions(true);
      return;
    }

    simulation.tick(INITIAL_TICK_COUNT);
    sendPositions(false);
    simulation
      .on('tick', sendCurrentPositions)
      .on('end', () => sendPositions(true))
      .restart();
  }

  function reconcileNodes(
    nodeInputs: GraphLayoutNodeInput[],
    links: GraphLayoutLinkInput[],
  ) {
    const previousPositions = new Map(
      nodes.map((node) => [
        node.id,
        {
          x: node.x ?? 0,
          y: node.y ?? 0,
        },
      ]),
    );
    return nodeInputs.map((node) => {
      const current = nodeById.get(node.id);
      if (current) return current;
      return {
        id: node.id,
        ...positionNewGraphNode(node, links, previousPositions),
      };
    });
  }

  function updateGraph(
    request: Extract<GraphLayoutWorkerRequest, { type: 'update' }>,
  ) {
    if (!simulation || !linkForce) return;
    simulation.stop();
    revision = request.revision;
    outputInterval = graphLayoutOutputInterval(
      request.nodes.length,
      request.links.length,
    );
    nodes = reconcileNodes(request.nodes, request.links);
    nodeById = new Map(nodes.map((node) => [node.id, node]));
    const links: EngineLink[] = resolveGraphLayoutLinks(request.links).map(
      (link) => ({
        distance: link.distance,
        source: link.source,
        strength: link.strength,
        target: link.target,
      }),
    );
    simulation.nodes(nodes);
    linkForce.links(links);
    simulation.alpha(Math.max(UPDATE_ALPHA, simulation.alpha())).alphaTarget(0);
    lastOutputTime = 0;

    if (reduceMotion) {
      simulation.tick(SIMULATION_TICK_COUNT);
      sendPositions(true);
      return;
    }

    simulation.tick();
    sendPositions(false);
    simulation.restart();
  }

  function handle(request: GraphLayoutWorkerRequest) {
    if (request.type === 'initialize') {
      initialize(request);
      return;
    }
    if (request.type === 'update') {
      updateGraph(request);
      return;
    }

    const node = nodeById.get(request.id);
    if (!node || !simulation) return;
    if (request.type === 'pin') {
      node.fx = request.x;
      node.fy = request.y;
      simulation.alpha(Math.max(0.4, simulation.alpha()));
      simulation.alphaTarget(0.25).restart();
      return;
    }

    node.fx = undefined;
    node.fy = undefined;
    simulation.alphaTarget(0);
  }

  return {
    handle,
    destroy() {
      simulation?.stop();
      simulation = null;
    },
  };
}
