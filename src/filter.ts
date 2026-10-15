import type { GraphData } from './types.js';

export function filterDocumentGraph(
  graph: GraphData,
  options: {
    showAttachments: boolean;
  },
): GraphData {
  if (options.showAttachments) {
    return graph;
  }

  const nodes = graph.nodes.filter((node) => node.kind !== 'attachment');
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) =>
      edge.kind !== 'attachment' &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target),
  );

  return {
    nodes,
    edges,
  };
}
