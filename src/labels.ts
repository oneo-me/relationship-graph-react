/**
 * Every user-visible string the component renders. Override any subset with the
 * `labels` prop. Defaults are Simplified Chinese, matching the graph this
 * component was extracted from.
 */
export interface RelationshipGraphLabels {
  /** Accessible description of the canvas, including the interaction help. */
  canvas(nodeCount: number, edgeCount: number): string;
  /** Screen-reader announcement after the graph data changes. */
  liveUpdate(nodeCount: number, edgeCount: number): string;
  emptyTitle: string;
  emptyDescription(rootPath?: string): string;
  settings: string;
  showAttachments: string;
  showAttachmentsDescription: string;
}

export const DEFAULT_RELATIONSHIP_GRAPH_LABELS: RelationshipGraphLabels = {
  canvas: (nodeCount, edgeCount) =>
    `知识图谱，包含 ${nodeCount} 个节点和 ${edgeCount} 条关系。双击文档节点可打开笔记，拖动画布可平移，滚动滚轮、按住 Control 或 Command 滚动及双指捏合可缩放。`,
  liveUpdate: (nodeCount, edgeCount) =>
    `知识图谱已更新，包含 ${nodeCount} 个节点和 ${edgeCount} 条关系。`,
  emptyTitle: '还没有可绘制的文档',
  emptyDescription: (rootPath) =>
    rootPath
      ? `在 ${rootPath} 中加入 index.md 后，知识图谱会自动更新。`
      : '在库中加入 index.md 后，知识图谱会自动更新。',
  settings: '知识图谱设置',
  showAttachments: '显示附件',
  showAttachmentsDescription: '在知识图谱中显示文档同目录附件节点。',
};
