# relationship-graph-react architecture

The package renders one interactive graph. React mounts a canvas, a transport carries layout input to a Web Worker, and a d3-force engine streams positions back as a `Float32Array`. React owns the container, the empty state and the settings control; the canvas owns everything inside it.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Public surface: component, labels, types, palette and layout helpers. |
| `src/relationship-graph.tsx` | Props, attachment filtering, presentation building, canvas runtime and theme. |
| `src/canvas-renderer.ts` | `GraphCanvasRenderer` plus pure helpers for color, labels, hover and camera math. |
| `src/layout-engine.ts` | The d3-force simulation and its incremental rewiring. |
| `src/layout.worker.ts` | Worker adapter that pipes the engine through `postMessage`. |
| `src/layout-transport.ts` | Worker-or-main-thread transport with request replay on fallback. |
| `src/layout-worker.ts` | Layout protocol types and pure layout helpers. |
| `src/layout.ts` | Force constants, node sizing, initial node seeding. |
| `src/colors.ts` | Directory color hashing and per-theme palettes. |
| `src/filter.ts` | Attachment filtering. |
| `src/controls.tsx` | Settings button, popover and attachment switch. |
| `src/styles.css` | Default theme and `--rg-*` custom properties. |
| `example/` | Vite app that consumes the built package. |

## Boundaries

- Keep React out of the canvas. `canvas-renderer.ts` never imports React, and `relationship-graph.tsx` never draws.
- Keep `src/` free of application dependencies. No router, settings provider, icon set or UI kit; props and `--rg-*` variables carry everything.
- Keep the renderer's dependencies (d3-selection, d3-zoom) and the engine's (d3-force) hidden behind `src/index.ts`, which exports only the component, types and pure helpers.
- Preserve the Locus visual and interaction behavior. Rendering changes are ported deliberately, not improvised; see [docs/architecture/rendering.md](docs/architecture/rendering.md).
- Keep pure helpers DOM-free and exported, so `bun test` can cover them without a browser.
- Position data crosses every boundary as one flat `Float32Array` of `x, y` pairs, never as objects.
- Layout messages carry a `revision`; the React layer applies only the revision it last requested, and ignores stale frames.
- Theme reaches the canvas through two channels: the `data-rg-theme` attribute for CSS, and `createGraphPalette` for canvas colors. Both derive from the same resolved theme value.

## Core flows

**Mount.** `RelationshipGraph` filters the data, builds a presentation, and `GraphCanvas` creates the renderer and the transport. The first layout request goes out after one `requestAnimationFrame`, so a view switch never shares a frame with graph conversion.

**Layout.** The engine seeds nodes from `initialGraphPosition`, ticks d3-force, and emits throttled snapshots plus one `settled` snapshot. The renderer applies the first snapshot, fits the camera, then recenters on later snapshots until the graph settles or the user interacts.

**Data updates.** A changed `data` prop increments the revision and posts an `update`. Existing nodes keep their positions, new nodes are seeded next to their neighbours, and the simulation reheats. A theme-only change recolors in place and keeps layout, camera and hover.

**Interaction.** Pinning posts `pin` with graph coordinates, and release posts `release`, so dragging never waits on the worker. Zoom, pan, hover, reveal and camera easing all run inside the renderer's own animation frame loop.

## Data and state

Nothing is persisted. Graph data is owned by the consumer and passed in as a prop. Runtime state lives in the renderer instance, in one `GraphCanvasRuntime` ref, and inside the layout engine, and is discarded on unmount.

## Verification

`bun test` covers the pure helpers: colors, filtering, node sizing, seeding, link strength, hover neighborhoods, labels, wheel mapping, camera math and the engine protocol. The `example/` app is the packaging check, because only a real build proves that the worker chunk is emitted and resolvable.

Canvas output, animation smoothness and cross-browser pointer behavior need manual review in a browser. Unit tests cannot see them.

## Subjects

| Document | When to read |
| --- | --- |
| [docs/architecture/rendering.md](docs/architecture/rendering.md) | Changing canvas drawing, hover, camera behavior or the layout protocol. |
