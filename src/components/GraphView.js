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

function GraphView({ databaseId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchLinksAndBacklinks(databaseId);
        console.log('Fetched data:', data);

        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid data format received from API');
        }

        // Create nodes with circle layout
        const nodeRadius = Math.min(window.innerWidth, window.innerHeight) * 0.4;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const nodes = data.results.map((page, index) => {
          const angle = (index / data.results.length) * 2 * Math.PI;
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

        // Create edges
        const edges = [];
        data.results.forEach(page => {
          page.links.forEach(targetId => {
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
          });
        });

        console.log('Setting nodes:', nodes.length);
        console.log('Setting edges:', edges.length);

        setNodes(nodes);
        setEdges(edges);
      } catch (error) {
        console.error('Error in GraphView:', error);
        setError(error.message);
      }
    };

    if (databaseId) {
      fetchData();
    }
  }, [databaseId, setNodes, setEdges]);

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
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
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