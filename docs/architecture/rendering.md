# Graph rendering and layout

This subject covers the layer between `data` and pixels: how a `GraphData` object becomes layout input and draw calls, how the worker protocol keeps frames in sync, and which visual rules are load-bearing.

## Presentation pipeline

`createGraphPresentation` in `src/relationship-graph.tsx` runs for every data or theme change and returns four arrays:

| Output | Consumer | Contents |
| --- | --- | --- |
| `layoutNodes` | worker | `id` plus a seeded `x, y` position. |
| `links` | worker | Node ids with the per-kind link distance. |
| `renderNodes` | renderer | Fill, label color, diameter and `openable`. |
| `renderEdges` | renderer | Node indexes, color, opacity, line width. |

Top-level directories are sorted, then spread evenly around the hue wheel, so any two directories in one graph stay visually distinct. Root documents and attachments fall back to the neutral or attachment palette entry.

## Worker protocol

`GraphLayoutWorkerRequest` has four messages: `initialize`, `update`, `pin` and `release`. Every layout message carries a monotonically increasing `revision`, and `GraphLayoutWorkerResponse` echoes it with a transferred `ArrayBuffer` of interleaved `x, y` coordinates and a `settled` flag.

- The React layer ignores any frame whose revision is not the pending one, so a slow worker can never repaint stale data.
- `settled` drives auto-fit: the camera keeps recentering while the graph moves, then stops for good once the simulation ends.
- Frame output is throttled by graph complexity, from 60 fps for small graphs down to 20 fps past roughly 4000 nodes and links.
- Pin and release mutate `fx`/`fy` on the worker's nodes and reheat the simulation with a small `alphaTarget`.

Force order is significant. Center, link and charge run first, collision runs last, so nothing reintroduces overlap in the same tick.

## Drawing pipeline

`GraphCanvasRenderer.draw` paints in a fixed order each frame: background, edges, nodes, then labels.

- Edges are grouped by color, opacity, line width and dash, and each group is traced as one path. Grouping is why a theme reload is cheap.
- Node fills use a radial gradient mixed from the palette color, which gives the flat palette a soft spherical look.
- Labels fade in between zoom `0.35` and `0.65`, are truncated with an ellipsis at `132` px, and are skipped once they leave the canvas bounds.
- Every frame repaints the whole canvas. There is no dirty-region tracking, because d3-zoom moves the camera, not the geometry.

## Hover neighborhood

Hover is a breadth-first search of depth one from the hovered node, computed in `computeHoverDepths`. The result is a `Map<node, hop>`; nodes at hop 0 get full emphasis, hop 1 gets `0.8`, and everything else is muted to a neutral color and low opacity.

- The renderer keeps both the previous and current neighborhood, and interpolates over `180` ms, so moving between nodes never snaps.
- Edges count as related only when both ends are inside the neighborhood.
- Hover is suppressed while a camera gesture or a node drag is active.
- `prefers-reduced-motion` collapses all transitions, reveal and camera easing to their final values.

## Camera

d3-zoom owns the transform, and the renderer mirrors it in a `Camera` record for its own drawing and animations. Plain wheel events are removed from d3-zoom and reimplemented as pointer-centered zoom, because trackpad pinch arrives as a `ctrl`-modified wheel event.

- Zoom is clamped to `1/128` … `8`.
- `fitGraph` fits the position envelope with `72` px padding; `fitIfUntouched` skips the fit once the user has interacted.
- While the layout is still moving, the camera is translated by the change in graph center, which keeps the fitted graph anchored instead of drifting.

## Deviations from the Locus feature

The component is a port, not a fork. These differences are intentional and should not be reverted without reason.

- The graph is mounted once. `onOpenNode` is read through a ref, where the original recreated the renderer and worker whenever the callback identity changed.
- `theme` is a prop with an `auto` mode that reads `dark`/`light` on `<html>` and falls back to `prefers-color-scheme`; the original read the app's theme provider.
- Data arrives as a prop instead of a live `EventSource`, and labels are overridable props instead of hardcoded strings.
- The container is a `div` rather than `<main>`, so the component can be embedded anywhere, and the settings control can be hidden.
- The transport falls back to the same engine on the main thread when a worker cannot be constructed or fails to load.
- `parseGraphColor` is exported for testing, and the unsupported-browser error is English while visible copy stays Chinese by default.
