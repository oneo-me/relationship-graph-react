import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GraphCanvasRenderer,
  type GraphCanvasEdge,
  type GraphCanvasNode,
  type GraphCanvasPalette,
} from './canvas-renderer.js';
import {
  createDirectoryGraphColorMap,
  createGraphPalette,
  topLevelDirectory,
  type GraphTheme,
} from './colors.js';
import { GraphSettingsControl } from './controls.js';
import { filterDocumentGraph } from './filter.js';
import {
  DEFAULT_RELATIONSHIP_GRAPH_LABELS,
  type RelationshipGraphLabels,
} from './labels.js';
import {
  GRAPH_ATTACHMENT_LINK_DISTANCE,
  GRAPH_HIERARCHY_LINK_DISTANCE,
  GRAPH_REFERENCE_LINK_DISTANCE,
  graphNodeDiameter,
  initialGraphPosition,
} from './layout.js';
import {
  createGraphLayoutTransport,
  type GraphLayoutTransport,
} from './layout-transport.js';
import type {
  GraphLayoutLinkInput,
  GraphLayoutNodeInput,
  GraphLayoutWorkerRequest,
} from './layout-worker.js';
import type { GraphData, GraphNode } from './types.js';
import {
  useResolvedTheme,
  type GraphThemePreference,
} from './use-resolved-theme.js';

export interface RelationshipGraphProps {
  /** Nodes and edges to draw. Updates are applied in place. */
  data: GraphData;
  /** `auto` (default) follows the host page theme. */
  theme?: GraphThemePreference;
  /** Controlled attachment visibility. Omit to let the component own it. */
  showAttachments?: boolean;
  /** Initial attachment visibility while uncontrolled. Defaults to `false`. */
  defaultShowAttachments?: boolean;
  onShowAttachmentsChange?: (showAttachments: boolean) => void;
  /** Called when a document node is double-clicked. */
  onOpenNode?: (node: GraphNode) => void;
  /** Renders the top-right settings button. Defaults to `true`. */
  showSettings?: boolean;
  /** Library root shown in the empty state. */
  rootPath?: string;
  /** Overrides for any visible string. */
  labels?: Partial<RelationshipGraphLabels>;
  className?: string;
  style?: CSSProperties;
}

interface GraphPresentation {
  layoutNodes: GraphLayoutNodeInput[];
  links: GraphLayoutLinkInput[];
  renderNodes: GraphCanvasNode[];
  renderEdges: GraphCanvasEdge[];
}

interface GraphCanvasRuntime {
  appliedRevision: number;
  autoFitRevision: number | null;
  deferInitialGraph: boolean;
  graphSignature: string;
  initialized: boolean;
  pending: (GraphPresentation & { revision: number }) | null;
  ready: boolean;
  reduceMotion: boolean;
  renderer: GraphCanvasRenderer;
  revision: number;
  theme: GraphTheme;
  transport: GraphLayoutTransport;
}

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

function readGraphCanvasPalette(
  canvas: HTMLCanvasElement,
  theme: GraphTheme,
): GraphCanvasPalette {
  const palette = createGraphPalette(theme);

  return {
    background: getComputedStyle(canvas).backgroundColor,
    highlight: palette.highlight,
    highlightEdge: palette.highlightEdge,
    highlightLabel: palette.highlightLabel,
    mutedEdge: palette.document.fill,
    mutedNode: palette.document.fill,
  };
}

/**
 * Interactive force-directed graph. Fills its parent, so give the wrapper an
 * explicit height.
 */
export function RelationshipGraph({
  data,
  theme: themePreference = 'auto',
  showAttachments,
  defaultShowAttachments = false,
  onShowAttachmentsChange,
  onOpenNode,
  showSettings = true,
  rootPath,
  labels: labelOverrides,
  className,
  style,
}: RelationshipGraphProps) {
  const theme = useResolvedTheme(themePreference);
  const labels = useMemo(
    () => ({ ...DEFAULT_RELATIONSHIP_GRAPH_LABELS, ...labelOverrides }),
    [labelOverrides],
  );
  const [ownedShowAttachments, setOwnedShowAttachments] = useState(
    defaultShowAttachments,
  );
  const resolvedShowAttachments = showAttachments ?? ownedShowAttachments;
  const handleShowAttachmentsChange = useCallback(
    (next: boolean) => {
      setOwnedShowAttachments(next);
      onShowAttachmentsChange?.(next);
    },
    [onShowAttachmentsChange],
  );

  const visibleGraph = useMemo(
    () => filterDocumentGraph(data, { showAttachments: resolvedShowAttachments }),
    [data, resolvedShowAttachments],
  );
  const documentCount = visibleGraph.nodes.filter(
    (node) => node.kind === 'document',
  ).length;
  const openNode = useCallback(
    (id: string) => {
      const node = visibleGraph.nodes.find((candidate) => candidate.id === id);
      if (node) onOpenNode?.(node);
    },
    [onOpenNode, visibleGraph],
  );

  return (
    <div
      className={joinClassNames('rg-root', className)}
      data-rg-theme={theme}
      style={style}
    >
      <p aria-live="polite" className="rg-sr-only">
        {labels.liveUpdate(
          visibleGraph.nodes.length,
          visibleGraph.edges.length,
        )}
      </p>
      {documentCount === 0 ? (
        <GraphEmptyState labels={labels} rootPath={rootPath} />
      ) : (
        <GraphCanvas
          graph={visibleGraph}
          labels={labels}
          onOpen={openNode}
          theme={theme}
        />
      )}
      {showSettings ? (
        <GraphSettingsControl
          labels={labels}
          onShowAttachmentsChange={handleShowAttachmentsChange}
          showAttachments={resolvedShowAttachments}
        />
      ) : null}
    </div>
  );
}

function GraphCanvas({
  graph,
  labels,
  onOpen,
  theme,
}: {
  graph: GraphData;
  labels: RelationshipGraphLabels;
  onOpen: (id: string) => void;
  theme: GraphTheme;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<GraphCanvasRuntime | null>(null);
  const graphRef = useRef(graph);
  const themeRef = useRef(theme);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    graphRef.current = graph;
    themeRef.current = theme;
  }, [graph, theme]);

  useEffect(() => {
    const host = canvas.current;
    if (!host) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let activeRuntime: GraphCanvasRuntime | null = null;
    const transport = createGraphLayoutTransport(
      (revision, positions, settled) => {
        if (!activeRuntime) return;
        applyLayoutPositions(activeRuntime, revision, positions, settled);
      },
    );
    const renderer = new GraphCanvasRenderer({
      canvas: host,
      nodes: [],
      edges: [],
      positions: new Float32Array(),
      palette: readGraphCanvasPalette(host, themeRef.current),
      reduceMotion,
      onPin: (id, x, y) => {
        const message: GraphLayoutWorkerRequest = { type: 'pin', id, x, y };
        transport.post(message);
      },
      onRelease: (id) => {
        transport.post({ type: 'release', id });
      },
      onOpen: (id) => onOpenRef.current(id),
    });
    const nextRuntime: GraphCanvasRuntime = {
      appliedRevision: 0,
      autoFitRevision: null,
      deferInitialGraph: true,
      graphSignature: '',
      initialized: false,
      pending: null,
      ready: false,
      reduceMotion,
      renderer,
      revision: 0,
      theme: themeRef.current,
      transport,
    };
    activeRuntime = nextRuntime;
    runtime.current = nextRuntime;

    const resizeObserver = new ResizeObserver(() => {
      renderer.resize();
    });
    resizeObserver.observe(host);

    // Let the browser paint the empty canvas surface first, then start graph
    // conversion and worker layout. Switching views this way never shares a
    // frame with the synchronous preparation of a large graph.
    const initialGraphFrame = requestAnimationFrame(() => {
      nextRuntime.deferInitialGraph = false;
      updateGraphCanvas(nextRuntime, graphRef.current, themeRef.current, host);
    });

    return () => {
      runtime.current = null;
      activeRuntime = null;
      cancelAnimationFrame(initialGraphFrame);
      transport.terminate();
      resizeObserver.disconnect();
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (
      canvas.current &&
      runtime.current &&
      !runtime.current.deferInitialGraph
    ) {
      updateGraphCanvas(runtime.current, graph, theme, canvas.current);
    }
  }, [graph, theme]);

  return (
    <canvas
      aria-label={labels.canvas(graph.nodes.length, graph.edges.length)}
      className="rg-canvas"
      ref={canvas}
      role="img"
    />
  );
}

function applyLayoutPositions(
  runtime: GraphCanvasRuntime,
  revision: number,
  positions: Float32Array,
  settled: boolean,
) {
  const pending = runtime.pending;
  if (!pending || revision !== pending.revision) return;
  if (runtime.appliedRevision !== revision) {
    runtime.appliedRevision = revision;
    runtime.renderer.updateGraph(pending.renderNodes, pending.renderEdges, positions);
  } else {
    runtime.renderer.setPositions(positions, runtime.autoFitRevision !== null);
  }
  if (!runtime.ready) {
    runtime.ready = true;
    runtime.renderer.fitGraph(true);
    runtime.renderer.setReady(true);
    runtime.autoFitRevision = settled ? null : revision;
  } else if (runtime.autoFitRevision !== null) {
    runtime.autoFitRevision = revision;
    if (settled) {
      runtime.renderer.fitIfUntouched();
      runtime.autoFitRevision = null;
    }
  }
  runtime.renderer.setLayoutSettled(settled);
}

function updateGraphCanvas(
  runtime: GraphCanvasRuntime,
  graph: GraphData,
  theme: GraphTheme,
  canvas: HTMLCanvasElement,
) {
  const signature = JSON.stringify(graph);
  if (signature === runtime.graphSignature) {
    // Graph unchanged, only the theme switched: recolor in place and keep
    // layout, camera and hover state.
    if (theme === runtime.theme) return;
    runtime.theme = theme;
    const presentation = createGraphPresentation(graph, theme);
    if (runtime.pending) {
      runtime.pending = {
        ...runtime.pending,
        renderNodes: presentation.renderNodes,
        renderEdges: presentation.renderEdges,
      };
    }
    runtime.renderer.setPalette(readGraphCanvasPalette(canvas, theme));
    runtime.renderer.updateColors(
      presentation.renderNodes,
      presentation.renderEdges,
    );
    return;
  }
  runtime.graphSignature = signature;
  runtime.theme = theme;
  runtime.revision += 1;
  const presentation = createGraphPresentation(graph, theme);
  runtime.pending = { ...presentation, revision: runtime.revision };
  const message: GraphLayoutWorkerRequest = runtime.initialized
    ? {
        type: 'update',
        revision: runtime.revision,
        nodes: presentation.layoutNodes,
        links: presentation.links,
      }
    : {
        type: 'initialize',
        revision: runtime.revision,
        nodes: presentation.layoutNodes,
        links: presentation.links,
        reduceMotion: runtime.reduceMotion,
      };
  runtime.initialized = true;
  runtime.transport.post(message);
}

function createGraphPresentation(
  graph: GraphData,
  theme: GraphTheme,
): GraphPresentation {
  const palette = createGraphPalette(theme);
  const directoryColorMap = createDirectoryGraphColorMap(
    graph.nodes
      .filter((node) => node.kind === 'document')
      .map((node) => topLevelDirectory(node.path)),
    theme,
  );
  const directoryClusters = [
    ...new Set(
      graph.nodes.map((node) => topLevelDirectory(node.path)).filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
  const directoryClusterIndex = new Map(
    directoryClusters.map((directory, index) => [directory, index]),
  );
  const layoutNodes = graph.nodes.map((node) => {
    const directory = topLevelDirectory(node.path);
    const clusterIndex = directory
      ? directoryClusterIndex.get(directory)
      : undefined;
    return {
      id: node.id,
      ...initialGraphPosition(
        node,
        graph.nodes.length,
        clusterIndex === undefined
          ? undefined
          : {
              index: clusterIndex,
              count: directoryClusters.length,
            },
      ),
    };
  });
  const renderNodes: GraphCanvasNode[] = graph.nodes.map((node) => {
    if (node.kind === 'attachment') {
      return {
        id: node.id,
        label: node.title,
        fill: palette.attachment.fill,
        labelColor: palette.attachment.label,
        diameter: 8,
      };
    }
    const directory = topLevelDirectory(node.path);
    const directoryColor = directory
      ? directoryColorMap.get(directory)
      : undefined;
    if (directoryColor) {
      return {
        id: node.id,
        label: node.title,
        fill: directoryColor.fill,
        labelColor: directoryColor.label,
        diameter: graphNodeDiameter(node.degree),
        openable: true,
      };
    }
    return {
      id: node.id,
      label: node.title,
      fill:
        node.degree === 0
          ? palette.documentIsolated.fill
          : palette.document.fill,
      labelColor:
        node.degree === 0
          ? palette.documentIsolated.label
          : palette.document.label,
      diameter: graphNodeDiameter(node.degree),
      openable: true,
    };
  });
  const nodeIndexes = new Map(
    graph.nodes.map((node, index) => [node.id, index]),
  );
  const renderEdges: GraphCanvasEdge[] = graph.edges.flatMap((edge) => {
    const source = nodeIndexes.get(edge.source);
    const target = nodeIndexes.get(edge.target);
    if (source === undefined || target === undefined) return [];
    if (edge.kind === 'attachment') {
      return [
        {
          source,
          target,
          color: palette.attachment.fill,
          opacity: palette.attachmentEdgeOpacity,
          lineWidth: 0.8,
        },
      ];
    }
    const sourceNode = graph.nodes[source];
    const sourceDirectory = sourceNode
      ? topLevelDirectory(sourceNode.path)
      : '';
    const sourceColor = sourceDirectory
      ? directoryColorMap.get(sourceDirectory)
      : undefined;
    if (edge.kind === 'reference') {
      return [
        {
          source,
          target,
          color: sourceColor?.fill ?? palette.document.fill,
          opacity: palette.referenceEdgeOpacity,
          lineWidth: 0.85,
          hoverOpacity: 0.35,
        },
      ];
    }
    return [
      {
        source,
        target,
        color: sourceColor?.fill ?? palette.document.fill,
        opacity: palette.hierarchyEdgeOpacity,
        lineWidth: 1,
        hoverOpacity: 0.4,
      },
    ];
  });

  return {
    layoutNodes,
    links: graph.edges.map((edge) => ({
      source: edge.source,
      distance:
        edge.kind === 'attachment'
          ? GRAPH_ATTACHMENT_LINK_DISTANCE
          : edge.kind === 'reference'
            ? GRAPH_REFERENCE_LINK_DISTANCE
            : GRAPH_HIERARCHY_LINK_DISTANCE,
      target: edge.target,
    })),
    renderNodes,
    renderEdges,
  };
}

function GraphEmptyState({
  labels,
  rootPath,
}: {
  labels: RelationshipGraphLabels;
  rootPath?: string;
}) {
  return (
    <div className="rg-empty" role="status">
      <p className="rg-empty-title">{labels.emptyTitle}</p>
      <p className="rg-empty-description">
        {labels.emptyDescription(rootPath)}
      </p>
    </div>
  );
}
