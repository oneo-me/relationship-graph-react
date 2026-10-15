# relationship-graph-react

[English](README.md) | **简体中文**

面向 React 的力导向关系图谱组件。它在 2D 画布上绘制文档与附件节点，按顶层目录着色，并把布局计算放进 Web Worker。

## 安装

```sh
bun add relationship-graph-react
# npm install relationship-graph-react
# pnpm add relationship-graph-react
```

需要 React 18 或更高版本。打包器需支持 module worker；Vite、webpack 5、Rollup 与 Parcel 均支持。

## 用法

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

组件会填满父容器，因此外层容器需要给定高度。样式表只需导入一次；缺少它时画布没有背景色。

## 交互

- 双击文档节点，组件通过 `onOpenNode` 回调该节点。
- 拖动节点可将其固定，拖动空白画布可平移。
- 滚轮、双指捏合，或按住 Control/Command 滚动，可围绕指针位置缩放。
- 悬停节点会高亮它和它的直接邻居。
- 右上角按钮用于显示或隐藏附件节点。

## 属性

| 属性 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `data` | `GraphData` | 必填 | 要绘制的节点与连线，更新时原位动画过渡。 |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | `auto` 跟随宿主页面。 |
| `showAttachments` | `boolean` | — | 受控的附件显示状态。 |
| `defaultShowAttachments` | `boolean` | `false` | 非受控时的初始值。 |
| `onShowAttachmentsChange` | `(value: boolean) => void` | — | 开关变化时触发。 |
| `onOpenNode` | `(node: GraphNode) => void` | — | 回传被双击的文档节点。 |
| `showSettings` | `boolean` | `true` | 是否渲染设置按钮。 |
| `rootPath` | `string` | — | 空状态文案中提到的知识库根目录。 |
| `labels` | `Partial<RelationshipGraphLabels>` | 中文默认值 | 覆盖任意界面文案。 |
| `className`、`style` | `string`、`CSSProperties` | — | 应用到最外层元素。 |

## 数据

每个节点需要 `id`、`kind`、`path`、`title`、`directory` 与 `degree`。`kind` 为 `attachment` 的节点绘制得较小，文档节点可被打开。连线通过 `source`、`target` 指向节点 id，其 `kind` 决定连线的距离与颜色。

`inboundCount`、`outboundCount` 以及连线上的 `count` 会被接受但未使用，它们属于 Locus 文档库输出的数据形状。

导出的类型包括 `GraphData`、`GraphNode`、`GraphEdge`、`GraphNodeKind`、`GraphEdgeKind`、`GraphTheme`、`GraphThemePreference`、`RelationshipGraphLabels` 与 `GraphPalette`。

## 样式

`styles.css` 通过 `.rg-root` 上的 `--rg-*` 自定义属性定义默认明暗主题，包括 `--rg-card`、`--rg-popover`、`--rg-foreground`、`--rg-muted-foreground`、`--rg-border`、`--rg-secondary` 与 `--rg-radius`。

在自己的样式表中覆盖这些变量即可贴合宿主设计系统。画布背景色取自 `--rg-card`。组件还导出 `createGraphPalette`、`createDirectoryGraphColorMap` 与 `topLevelDirectory`，便于自定义图例。

## 开发

```sh
bun install
bun run typecheck
bun test
bun run build
```

`example/` 是一个消费构建产物的 Vite 应用，用于验证 worker 产物与发布导出。它带有一个开发工具栏，用于批量生成节点、重置图谱、适应视图和切换主题：

```sh
bun run example:install
bun run example:dev
```

代码结构与边界见 [ARCHITECTURE.md](ARCHITECTURE.md)，协作规则见 [AGENTS.md](AGENTS.md)。

## 许可证

MIT
