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
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchLinksAndBacklinks(databaseId);
        console.log('Fetched data:', data);

        // Create nodes with circle layout
        const radius = 500; // Increased radius for better spacing
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const angle = (2 * Math.PI) / data.results.length;

        const nodes = data.results.map((page, index) => ({
          id: page.id,
          type: 'default',
          data: {
            label: `${page.title}\n(out: ${page.links.length}, in: ${page.backlinks.length})`,
            outgoingLinks: page.links.length,
            incomingLinks: page.backlinks.length
          },
          position: {
            x: centerX + radius * Math.cos(index * angle),
            y: centerY + radius * Math.sin(index * angle)
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
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            whiteSpace: 'pre-wrap'
          }
        }));

        // Create edges with arrows and labels
        const edges = [];
        data.results.forEach(page => {
          page.links.forEach(targetId => {
            edges.push({
              id: `${page.id}-${targetId}`,
              source: page.id,
              target: targetId,
              type: 'smoothstep',
              animated: true,
              label: 'links to',
              labelStyle: { fill: '#666', fontSize: 12 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#555',
              },
              style: {
                stroke: '#555',
                strokeWidth: 2
              }
            });
          });
        });

        console.log('Created nodes:', nodes);
        console.log('Created edges:', edges);

        setNodes(nodes);
        setEdges(edges);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (databaseId) {
      fetchData();
    }
  }, [databaseId]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    console.log('Clicked node:', node);
    setSelectedNode(node);
    // Open Notion page in new tab
    window.open(`https://notion.so/${node.id}`, '_blank');
  }, []);

  return (
    <div style={{ width: '100%', height: '80vh', position: 'relative' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
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

      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '300px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>{selectedNode.data.label.split('\n')[0]}</h3>
          <p style={{ margin: '5px 0' }}>Outgoing links: {selectedNode.data.outgoingLinks}</p>
          <p style={{ margin: '5px 0' }}>Incoming links: {selectedNode.data.incomingLinks}</p>
        </div>
      )}
    </div>
  );
}

export default GraphView;