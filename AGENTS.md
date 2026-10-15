# relationship-graph-react

A React canvas component for the Locus knowledge graph. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing code, then the matching subject.

## Principles

- Keep the visual and interaction behavior identical to the Locus graph; follow [docs/architecture/rendering.md](docs/architecture/rendering.md) for what is load-bearing.
- Keep React out of the renderer and the renderer out of React.
- Keep `src/` free of application dependencies. Props and `--rg-*` variables carry configuration, never imports of a host app.
- Keep pure helpers exported and DOM-free, so they stay unit-testable.
- Never import app code from the Locus repository. Port changes by hand and record them in the deviations section of the rendering subject.

## Working with the user

- Ask before changing the public API: props, exports, CSS variable names and class names.
- Do not commit, tag or publish unless asked.
- Treat the Locus graph as the reference. If a change would visibly differ from it, ask first.

## Verification

- Run `bun run typecheck`, `bun test` and `bun run build`; see the [README Development section](README.md#development).
- Rebuild before touching `example/`, which consumes `dist` rather than `src`.
- For rendering changes, check the graph in a browser through `example/`. Unit tests cannot see canvas output, animation or pointer behavior.

## Documentation

- Update a document only when a fact its reader needs changes.
- Keep each document within its budget and written for its reader.
- Record user-visible outcomes as short `Unreleased` bullets in [CHANGELOG.md](CHANGELOG.md), merging related ones.
- Repair documents you touch instead of only appending to them.
- Keep [README.md](README.md) and [README.zh-CN.md](README.zh-CN.md) equivalent. Everything else, including code comments, is English.
- Keep documentation on the code branch and reconcile it during merges.
