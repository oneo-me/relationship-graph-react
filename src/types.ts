/** Node kinds the graph knows how to render. */
export type GraphNodeKind = 'attachment' | 'document';

/** Edge kinds the graph knows how to render. */
export type GraphEdgeKind = 'attachment' | 'hierarchy' | 'reference';

export interface GraphNode {
  /** Stable identity. Also the value passed back through `onOpenNode`. */
  id: string;
  kind: GraphNodeKind;
  /** Document path, for example `projects/foo/index.md`. */
  path: string;
  /** Label drawn below the node once zoomed in. */
  title: string;
  /** Directory that owns the document, for example `projects`. */
  directory: string;
  inboundCount: number;
  outboundCount: number;
  /** Node weight used to size the circle. */
  degree: number;
}

export interface GraphEdge {
  id: string;
  kind: GraphEdgeKind;
  /** Source node id. */
  source: string;
  /** Target node id. */
  target: string;
  count: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
