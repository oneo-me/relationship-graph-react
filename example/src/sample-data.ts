import {
  topLevelDirectory,
  type GraphData,
  type GraphEdge,
  type GraphNode,
} from 'relationship-graph-react';

interface Draft {
  path: string;
  references: string[];
  attachments: string[];
}

const DRAFTS: Draft[] = [
  { path: 'index.md', references: ['projects/index.md'], attachments: [] },
  {
    path: 'projects/index.md',
    references: ['notes/graph.md'],
    attachments: ['diagram.png'],
  },
  { path: 'projects/graph-engine.md', references: ['notes/graph.md'], attachments: ['sketch.svg'] },
  { path: 'projects/roadmap.md', references: [], attachments: [] },
  { path: 'notes/index.md', references: [], attachments: [] },
  { path: 'notes/graph.md', references: ['reading/index.md'], attachments: ['paper.pdf'] },
  { path: 'notes/tooling.md', references: ['notes/graph.md'], attachments: [] },
  { path: 'reading/index.md', references: [], attachments: [] },
  { path: 'reading/force-layout.md', references: ['notes/graph.md'], attachments: [] },
  { path: 'archive/index.md', references: [], attachments: [] },
  { path: 'archive/old-graph.md', references: ['projects/graph-engine.md'], attachments: [] },
];

function titleOf(path: string) {
  const name = path.split('/').pop() ?? path;
  return name
    .replace(/\.[^.]+$/, '')
    .replaceAll('-', ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function parentOf(path: string) {
  const segments = path.split('/');
  if (segments.length === 1) return null;
  if (segments.length === 2) return 'index.md';
  return `${segments.slice(0, -1).join('/')}/index.md`;
}

function createSampleGraph(): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const draft of DRAFTS) {
    const segments = draft.path.split('/');
    nodes.push({
      id: draft.path,
      kind: 'document',
      path: draft.path,
      title: titleOf(draft.path),
      directory: segments.length > 1 ? (segments[0] ?? '') : '',
      inboundCount: 0,
      outboundCount: 0,
      degree: 0,
    });

    const parent = parentOf(draft.path);
    if (parent) {
      edges.push({
        id: `hierarchy:${parent}:${draft.path}`,
        kind: 'hierarchy',
        source: parent,
        target: draft.path,
        count: 1,
      });
    }
    for (const target of draft.references) {
      edges.push({
        id: `reference:${draft.path}:${target}`,
        kind: 'reference',
        source: draft.path,
        target,
        count: 1,
      });
    }
    for (const attachment of draft.attachments) {
      const directory = segments.slice(0, -1).join('/');
      const attachmentPath = `${directory}/attachments/${attachment}`;
      nodes.push({
        id: `attachment:${draft.path}:${attachmentPath}`,
        kind: 'attachment',
        path: attachmentPath,
        title: attachment,
        directory: `${directory}/attachments`,
        inboundCount: 1,
        outboundCount: 0,
        degree: 1,
      });
      edges.push({
        id: `attachment:${draft.path}:${attachmentPath}`,
        kind: 'attachment',
        source: draft.path,
        target: `attachment:${draft.path}:${attachmentPath}`,
        count: 1,
      });
    }
  }

  for (const node of nodes) {
    const related = edges.filter(
      (edge) => edge.source === node.id || edge.target === node.id,
    );
    node.degree = related.length;
    node.inboundCount = edges.filter((edge) => edge.target === node.id).length;
    node.outboundCount = edges.filter((edge) => edge.source === node.id).length;
  }

  return { nodes, edges };
}

/**
 * Deterministic pseudo-random integer, so a run looks varied but is repeatable
 * for the same node ordinal.
 */
function pseudoRandom(seed: number): number {
  let value = (seed + 0x9e3779b9) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function shuffled<T>(values: T[], seed: number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = pseudoRandom(seed * 31 + index * 7) % (index + 1);
    const current = result[index]!;
    result[index] = result[swap]!;
    result[swap] = current;
  }
  return result;
}

/** Next free `node-<n>.md` ordinal, so batches never reuse a path. */
function nextGeneratedOrdinal(nodes: GraphNode[]): number {
  let maximum = -1;
  for (const node of nodes) {
    const match = /\/node-(\d+)\.md$/.exec(node.path);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  }
  return maximum + 1;
}

/**
 * Appends `count` generated documents to the graph. Each new document takes the
 * top-level directory of its first (primary) parent, so it inherits that
 * parent's color and clusters with it. Its remaining links are drawn from other
 * top-level directories, so a batch never hangs off a single type. Used by the
 * example's stress-test buttons.
 */
export function appendGeneratedNodes(data: GraphData, count: number): GraphData {
  const nodes = data.nodes.map((node) => ({ ...node }));
  const edges = [...data.edges];
  const edgeKeys = new Set(
    edges.map((edge) => `${edge.source}\u0000${edge.target}`),
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const startOrdinal = nextGeneratedOrdinal(data.nodes);

  for (let index = 0; index < count; index += 1) {
    const ordinal = startOrdinal + index;

    const parentsByType = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.kind !== 'document') continue;
      const type = topLevelDirectory(node.path);
      const group = parentsByType.get(type);
      if (group) group.push(node.id);
      else parentsByType.set(type, [node.id]);
    }

    const types = shuffled([...parentsByType.keys()], ordinal);
    // Colored parents come first, so the node inherits a hue whenever one is
    // available instead of falling back to the "generated" color.
    const orderedTypes = [
      ...types.filter((type) => type !== ''),
      ...types.filter((type) => type === ''),
    ];
    const linkCount = Math.min(
      1 + (pseudoRandom(ordinal * 7 + 3) % 3),
      orderedTypes.length,
    );

    const targets: string[] = [];
    for (
      let step = 0;
      step < orderedTypes.length && targets.length < linkCount;
      step += 1
    ) {
      const candidates = parentsByType.get(orderedTypes[step]!) ?? [];
      if (candidates.length === 0) continue;
      targets.push(
        candidates[pseudoRandom(ordinal * 977 + step * 31) % candidates.length]!,
      );
    }

    const primaryParent = targets[0] ? nodeById.get(targets[0]) : undefined;
    const inheritedType = primaryParent
      ? topLevelDirectory(primaryParent.path)
      : '';
    const directory = inheritedType || 'generated';
    const path = `${directory}/node-${ordinal}.md`;
    const node: GraphNode = {
      id: path,
      kind: 'document',
      path,
      title: `Node ${ordinal}`,
      directory,
      inboundCount: 0,
      outboundCount: 0,
      degree: 0,
    };
    nodes.push(node);
    nodeById.set(path, node);

    for (const target of targets) {
      const key = `${path}\u0000${target}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({
        id: `reference:${path}:${target}`,
        kind: 'reference',
        source: path,
        target,
        count: 1,
      });
    }
  }

  for (const node of nodes) {
    node.degree = 0;
    node.inboundCount = 0;
    node.outboundCount = 0;
  }
  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (source) {
      source.degree += 1;
      source.outboundCount += 1;
    }
    if (target) {
      target.degree += 1;
      target.inboundCount += 1;
    }
  }

  return { nodes, edges };
}

export { createSampleGraph };
