import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchLinksAndBacklinks } from '../utils/notionApi';
import DatabaseSelector from './DatabaseSelector';

function GraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [loading, setLoading] = useState(false);

  const style = {
    container: {
      width: '100vw',
      height: '100vh',
      position: 'relative',
      backgroundColor: '#f0f0f0'
    },
    loadingOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 999
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDatabase) return;

      try {
        console.log('Fetching data for database:', selectedDatabase);
        setLoading(true);
        setError(null);

        const data = await fetchLinksAndBacklinks(selectedDatabase);
        console.log('Received data:', data);

        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid data format received from API');
        }

        // Filter pages to only include those with links or backlinks
        const pagesWithConnections = data.results.filter(
          page => page.links.length > 0 || page.backlinks.length > 0
        );
        console.log('Filtered pages:', pagesWithConnections.length);

        // Create nodes with circle layout
        const nodeRadius = Math.min(window.innerWidth, window.innerHeight) * 0.3;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const nodes = pagesWithConnections.map((page, index) => {
          const angle = (index / pagesWithConnections.length) * 2 * Math.PI;
          const x = centerX + nodeRadius * Math.cos(angle);
          const y = centerY + nodeRadius * Math.sin(angle);

          console.log(`Creating node for ${page.title} at (${x}, ${y})`);

          return {
            id: page.id,
            data: {
              label: `${page.title}\n(out: ${page.links.length}, in: ${page.backlinks.length})`
            },
            position: { x, y },
            style: {
              background: '#fff',
              border: '1px solid #999',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              width: 'auto',
              minWidth: '150px',
              textAlign: 'center'
            }
          };
        });

        // Create edges
        const edges = [];
        pagesWithConnections.forEach(page => {
          page.links.forEach(targetId => {
            if (pagesWithConnections.some(p => p.id === targetId)) {
              edges.push({
                id: `${page.id}-${targetId}`,
                source: page.id,
                target: targetId,
                type: 'smoothstep',
                animated: true,
                markerEnd: {
                  type: MarkerType.ArrowClosed
                }
              });
            }
          });
        });

        console.log(`Created ${nodes.length} nodes and ${edges.length} edges`);

        setNodes(nodes);
        setEdges(edges);
      } catch (error) {
        console.error('Error in GraphView:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDatabase, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (error) {
    return (
      <div style={{
        padding: '20px',
        color: 'red',
        textAlign: 'center'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={style.container}>
      <DatabaseSelector onDatabaseSelect={setSelectedDatabase} />
      {loading ? (
        <div style={style.loadingOverlay}>Loading graph data...</div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
const GraphViewWrapper = () => (
  <ReactFlowProvider>
    <GraphView />
  </ReactFlowProvider>
);

export default GraphViewWrapper;