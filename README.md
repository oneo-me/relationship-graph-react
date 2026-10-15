# relationship-graph-react

**English** | [简体中文](README.zh-CN.md)

A force-directed relationship graph for React. It draws documents and attachments on a 2D canvas, colors nodes by top-level directory, and runs the layout in a Web Worker.

## Install

```sh
bun add relationship-graph-react
# npm install relationship-graph-react
# pnpm add relationship-graph-react
```

React 18 or newer is required. The bundler must support module workers; Vite, webpack 5, Rollup and Parcel do.

## Usage

```tsx
import { RelationshipGraph, type GraphData } from 'relationship-graph-react';
import 'relationship-graph-react/styles.css';

const data: GraphData = {
  nodes: [
    {
      id: 'index.md',
      kind: 'document',
      path: 'index.md',
      title: 'Home',
      directory: '',
      inboundCount: 0,
      outboundCount: 1,
      degree: 1,
    },
    {
      id: 'notes/index.md',
      kind: 'document',
      path: 'notes/index.md',
      title: 'Notes',
      directory: 'notes',
      inboundCount: 1,
      outboundCount: 0,
      degree: 1,
    },
  ],
  edges: [
    {
      id: 'hierarchy-0',
      kind: 'hierarchy',
      source: 'index.md',
      target: 'notes/index.md',
      count: 1,
    },
  ],
};

export function GraphPanel() {
  return (
    <div style={{ height: 480 }}>
      <RelationshipGraph
        data={data}
        onOpenNode={(node) => console.log(node.path)}
      />
    </div>
  );
}
```

The component fills its parent, so the wrapper needs a height. Import the stylesheet once; without it the canvas has no background color.

## Interactions

- Double-click a document node to report it through `onOpenNode`.
- Drag a node to pin it, and drag empty canvas to pan.
- Scroll, pinch, or hold Control or Command while scrolling to zoom at the pointer.
- Hover a node to highlight it and its direct neighbors.
- Use the top-right button to show or hide attachment nodes.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `data` | `GraphData` | required | Nodes and edges to draw. Updates animate in place. |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | `auto` follows the host page. |
| `showAttachments` | `boolean` | — | Controlled attachment visibility. |
| `defaultShowAttachments` | `boolean` | `false` | Initial value while uncontrolled. |
| `onShowAttachmentsChange` | `(value: boolean) => void` | — | Fires when the toggle changes. |
| `onOpenNode` | `(node: GraphNode) => void` | — | Receives the double-clicked document node. |
| `showSettings` | `boolean` | `true` | Renders the settings button. |
| `rootPath` | `string` | — | Library root named in the empty state. |
| `labels` | `Partial<RelationshipGraphLabels>` | Chinese defaults | Overrides any visible string. |
| `className`, `style` | `string`, `CSSProperties` | — | Applied to the outer element. |

## Data

Every node needs `id`, `kind`, `path`, `title`, `directory` and `degree`. Nodes with kind `attachment` render small; document nodes are openable. Edges use `source` and `target` node ids, and their `kind` picks the link distance and color.

Structural fields such as `inboundCount` and `outboundCount` are accepted but unused; `count` on an edge is unused too. They are part of the shape the Locus document library emits.

Export types: `GraphData`, `GraphNode`, `GraphEdge`, `GraphNodeKind`, `GraphEdgeKind`, `GraphTheme`, `GraphThemePreference`, `RelationshipGraphLabels` and `GraphPalette`.

## Styling

`styles.css` defines the default light and dark theme on `.rg-root` through `--rg-*` custom properties, including `--rg-card`, `--rg-popover`, `--rg-foreground`, `--rg-muted-foreground`, `--rg-border`, `--rg-secondary` and `--rg-radius`.

Override those variables in your own stylesheet to match a host design system. The canvas reads its background color from `--rg-card`. The package also exports `createGraphPalette`, `createDirectoryGraphColorMap` and `topLevelDirectory` for building custom legends.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build
```

`example/` is a Vite app that consumes the built package, which verifies worker emission and the published exports. It carries a dev toolbar for seeding nodes, resetting the graph, fitting the view and switching theme:

```sh
bun run example:install
bun run example:dev
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the code map and [AGENTS.md](AGENTS.md) for contributor rules.

## License

MIT
