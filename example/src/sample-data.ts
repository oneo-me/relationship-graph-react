import type { GraphData, GraphEdge, GraphNode } from 'relationship-graph-react';

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

export { createSampleGraph };
