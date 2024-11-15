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

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDatabase) return;

      try {
        const data = await fetchLinksAndBacklinks(selectedDatabase);
        console.log('Fetched data:', data);

        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid data format received from API');
        }

        // Filter pages to only include those with links or backlinks
        const pagesWithConnections = data.results.filter(
          page => page.links.length > 0 || page.backlinks.length > 0
        );

        // Create nodes with circle layout
        const nodeRadius = Math.min(window.innerWidth, window.innerHeight) * 0.4;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const nodes = pagesWithConnections.map((page, index) => {
          const angle = (index / pagesWithConnections.length) * 2 * Math.PI;
          return {
            id: page.id,
            type: 'default',
            data: {
              label: `${page.title}\n(out: ${page.links.length}, in: ${page.backlinks.length})`,
              outgoingLinks: page.links.length,
              incomingLinks: page.backlinks.length
            },
            position: {
              x: centerX + nodeRadius * Math.cos(angle),
              y: centerY + nodeRadius * Math.sin(angle)
            },
            style: {
              background: '#fff',
              border: '1px solid #999',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              width: 'auto',
              minWidth: '150px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
          };
        });

        // Create edges only between filtered nodes
        const edges = [];
        pagesWithConnections.forEach(page => {
          page.links.forEach(targetId => {
            // Only create edge if target exists in filtered nodes
            if (pagesWithConnections.some(p => p.id === targetId)) {
              edges.push({
                id: `${page.id}-${targetId}`,
                source: page.id,
                target: targetId,
                type: 'smoothstep',
                animated: true,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#555'
                },
                style: {
                  stroke: '#555',
                  strokeWidth: 2
                }
              });
            }
          });
        });

        setNodes(nodes);
        setEdges(edges);
      } catch (error) {
        console.error('Error in GraphView:', error);
        setError(error.message);
      }
    };

    fetchData();
  }, [selectedDatabase, setNodes, setEdges]);

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed
      }
    }, eds));
  }, [setEdges]);

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative">
      <ReactFlowProvider>
        <DatabaseSelector onDatabaseSelect={setSelectedDatabase} />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed
            }
          }}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap
            nodeStrokeColor={(n) => n.style?.border || '#555'}
            nodeColor={(n) => n.style?.background || '#fff'}
            nodeBorderRadius={3}
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default GraphView;