import { describe, expect, test } from 'bun:test';
import { filterDocumentGraph } from '../src/filter.js';
import type { GraphData } from '../src/types.js';

function graph(): GraphData {
  return {
    nodes: [
      {
        id: 'projects/index.md',
        kind: 'document',
        path: 'projects/index.md',
        title: 'Projects',
        directory: 'projects',
        inboundCount: 1,
        outboundCount: 1,
        degree: 2,
      },
      {
        id: 'projects/attachments/a.png',
        kind: 'attachment',
        path: 'projects/attachments/a.png',
        title: 'a.png',
        directory: 'projects/attachments',
        inboundCount: 1,
        outboundCount: 0,
        degree: 1,
      },
    ],
    edges: [
      {
        id: 'hierarchy-0',
        kind: 'hierarchy',
        source: 'projects/index.md',
        target: 'projects/index.md',
        count: 1,
      },
      {
        id: 'attachment-0',
        kind: 'attachment',
        source: 'projects/index.md',
        target: 'projects/attachments/a.png',
        count: 1,
      },
    ],
  };
}

describe('filterDocumentGraph', () => {
  test('returns the input untouched when attachments are visible', () => {
    const input = graph();
    expect(filterDocumentGraph(input, { showAttachments: true })).toBe(input);
  });

  test('drops attachment nodes and their edges', () => {
    const filtered = filterDocumentGraph(graph(), { showAttachments: false });
    expect(filtered.nodes.map((node) => node.id)).toEqual([
      'projects/index.md',
    ]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(['hierarchy-0']);
  });

  test('drops edges that point at a removed node', () => {
    const input: GraphData = {
      nodes: [],
      edges: [
        {
          id: 'dangling',
          kind: 'reference',
          source: 'missing',
          target: 'projects/index.md',
          count: 1,
        },
      ],
    };
    expect(filterDocumentGraph(input, { showAttachments: false }).edges).toEqual(
      [],
    );
  });
});
