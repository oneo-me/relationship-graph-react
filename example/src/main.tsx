import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RelationshipGraph, type GraphData } from 'relationship-graph-react';
import 'relationship-graph-react/styles.css';
import { createSampleGraph } from './sample-data';

const ROOT_PATH = '/Users/locus/notes';

const data: GraphData = createSampleGraph();

function App() {
  const [showAttachments, setShowAttachments] = useState(true);
  const [opened, setOpened] = useState('');

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <RelationshipGraph
          data={data}
          onOpenNode={(node) => setOpened(node.path)}
          onShowAttachmentsChange={setShowAttachments}
          rootPath={ROOT_PATH}
          showAttachments={showAttachments}
          theme="auto"
        />
      </div>
      <aside style={{ width: 240, padding: 12, fontSize: 13 }}>
        <p>opened: {opened || '—'}</p>
        <p>attachments: {showAttachments ? 'visible' : 'hidden'}</p>
      </aside>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
