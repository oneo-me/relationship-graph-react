import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RelationshipGraph,
  type GraphData,
  type GraphThemePreference,
} from 'relationship-graph-react';
import 'relationship-graph-react/styles.css';
import './example.css';
import { appendGeneratedNodes, createSampleGraph } from './sample-data';

const ROOT_PATH = '/Users/locus/notes';

const THEME_CYCLE: GraphThemePreference[] = ['auto', 'light', 'dark'];
const THEME_LABELS: Record<GraphThemePreference, string> = {
  auto: '跟随系统主题',
  light: '浅色主题',
  dark: '深色主题',
};

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <rect height="14" rx="2" width="20" x="2" y="3" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: GraphThemePreference }) {
  if (theme === 'light') return <SunIcon />;
  if (theme === 'dark') return <MoonIcon />;
  return <MonitorIcon />;
}

function App() {
  const [data, setData] = useState<GraphData>(() => createSampleGraph());
  const [theme, setTheme] = useState<GraphThemePreference>('auto');
  // Remounting refits the camera. The package has no imperative fit API yet.
  const [graphKey, setGraphKey] = useState(0);

  const addNodes = useCallback((count: number) => {
    setData((current) => appendGeneratedNodes(current, count));
  }, []);

  const resetNodes = useCallback(() => {
    setData(createSampleGraph());
    setGraphKey((key) => key + 1);
  }, []);

  const fitView = useCallback(() => {
    setGraphKey((key) => key + 1);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((current) => {
      const index = THEME_CYCLE.indexOf(current);
      return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'auto';
    });
  }, []);

  return (
    <div className="example-root">
      <div className="example-graph">
        <RelationshipGraph
          data={data}
          key={graphKey}
          rootPath={ROOT_PATH}
          theme={theme}
        />
        <div className="example-toolbar" data-theme={theme}>
          <div className="example-cluster">
            <button
              className="example-button"
              onClick={() => addNodes(100)}
              type="button"
            >
              添加 100 节点
            </button>
            <button
              className="example-button"
              onClick={() => addNodes(1000)}
              type="button"
            >
              添加 1000 节点
            </button>
            <button className="example-button" onClick={resetNodes} type="button">
              重置节点
            </button>
            <button className="example-button" onClick={fitView} type="button">
              适应视图
            </button>
            <span className="example-count">
              {data.nodes.length} 节点 · {data.edges.length} 关系
            </span>
          </div>
          <div className="example-cluster">
            <button
              aria-label={THEME_LABELS[theme]}
              className="example-button example-button-icon"
              onClick={cycleTheme}
              title={THEME_LABELS[theme]}
              type="button"
            >
              <ThemeIcon theme={theme} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
