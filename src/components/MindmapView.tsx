import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { Plus, Trash2, Edit3, Network, LayoutGrid, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TREE_X_STEP = 240;
const TREE_Y_STEP = 42;
const TREE_MARGIN_X = 120;
const TREE_MARGIN_Y = 36;

export function MindmapView() {
  const {
    activeProjectId,
    mindmapNodes,
    addMindmapNode,
    updateMindmapNode,
    deleteMindmapNode,
  } = useStore();

  const [mode, setMode] = useState<'2d' | 'visualize'>('visualize');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const projectNodes = useMemo(
    () => mindmapNodes.filter((n) => n.projectId === activeProjectId),
    [mindmapNodes, activeProjectId]
  );
  const nodesById = useMemo(() => Object.fromEntries(projectNodes.map((n) => [n.id, n])), [projectNodes]);
  const roots = useMemo(() => projectNodes.filter((n) => !n.parentId), [projectNodes]);

  const childrenByParent = useMemo(() => {
    const map: Record<string, typeof projectNodes> = {};
    projectNodes.forEach((node) => {
      const key = node.parentId || 'root';
      if (!map[key]) map[key] = [];
      map[key].push(node);
    });
    return map;
  }, [projectNodes]);

  useEffect(() => {
    if (!focusedId && roots[0]) setFocusedId(roots[0].id);
    if (!selectedNodeId && roots[0]) setSelectedNodeId(roots[0].id);
  }, [roots, focusedId, selectedNodeId]);

  const selectedRoot = useMemo(
    () => projectNodes.find((n) => n.id === focusedId) || roots[0] || null,
    [projectNodes, roots, focusedId]
  );

  const addRoot = () => addMindmapNode({ label: 'Idea', description: '', parentId: null });
  const addChild = (parentId: string) => {
    const parent = nodesById[parentId];
    const siblings = (childrenByParent[parentId] || []).length;
    const inheritedLabel = parent
      ? `${parent.label} > Child ${siblings + 1}`
      : `Child ${siblings + 1}`;
    addMindmapNode({ label: inheritedLabel, description: '', parentId });
  };

  const treeLayout = useMemo(() => {
    if (!selectedRoot) return null;

    const positions: Record<string, { x: number; y: number; depth: number }> = {};
    const edges: { id: string; from: string; to: string }[] = [];
    let leafCursor = 0;
    let maxDepth = 0;

    const layoutNode = (nodeId: string, depth: number): number => {
      const node = nodesById[nodeId];
      if (!node) return 0;
      maxDepth = Math.max(maxDepth, depth);

      const visibleChildren = node.expanded === false ? [] : (childrenByParent[nodeId] || []);
      if (visibleChildren.length === 0) {
        const y = TREE_MARGIN_Y + leafCursor * TREE_Y_STEP;
        leafCursor += 1;
        positions[nodeId] = {
          x: TREE_MARGIN_X + depth * TREE_X_STEP,
          y,
          depth,
        };
        return y;
      }

      const childYs = visibleChildren.map((child) => {
        edges.push({ id: `${nodeId}-${child.id}`, from: nodeId, to: child.id });
        return layoutNode(child.id, depth + 1);
      });

      const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
      positions[nodeId] = {
        x: TREE_MARGIN_X + depth * TREE_X_STEP,
        y,
        depth,
      };
      return y;
    };

    layoutNode(selectedRoot.id, 0);
    return {
      positions,
      edges,
      width: Math.max(900, TREE_MARGIN_X + (maxDepth + 1) * TREE_X_STEP + 360),
      height: Math.max(520, TREE_MARGIN_Y * 2 + Math.max(1, leafCursor) * TREE_Y_STEP + 80),
      visibleNodeIds: Object.keys(positions),
    };
  }, [selectedRoot, childrenByParent, nodesById]);

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null;

  const render2D = () => (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {projectNodes.map((node) => (
          <motion.div
            key={node.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <input
                  value={node.label}
                  onChange={(e) => updateMindmapNode(node.id, { label: e.target.value })}
                  className="w-full bg-transparent text-sm font-semibold outline-none focus:ring-1 focus:ring-primary rounded px-1"
                />
                {node.parentId && (
                  <div className="inline-flex items-center gap-1 text-[10px] text-primary/90 bg-primary/10 rounded-full px-2 py-0.5">
                    <Link2 className="w-3 h-3" />
                    Inherited from {nodesById[node.parentId]?.label || 'Parent'}
                  </div>
                )}
                <textarea
                  value={node.description}
                  onChange={(e) => updateMindmapNode(node.id, { description: e.target.value })}
                  placeholder="Details"
                  className="w-full text-sm bg-transparent outline-none resize-none"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => addChild(node.id)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Add child">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => deleteMindmapNode(node.id)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Edit3 className="w-3 h-3" /> Parent: {node.parentId ? 'Linked' : 'Root'}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const renderTree = () => {
    if (!treeLayout || !selectedRoot) {
      return <div className="text-sm text-muted-foreground">No nodes to visualize yet.</div>;
    }

    const visibleNodes = treeLayout.visibleNodeIds.map((id) => nodesById[id]).filter(Boolean);

    return (
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-elevated via-background to-surface-elevated/70 overflow-auto">
        <div className="relative" style={{ width: treeLayout.width, height: treeLayout.height }}>
          <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
            {treeLayout.edges.map((edge) => {
              const from = treeLayout.positions[edge.from];
              const to = treeLayout.positions[edge.to];
              if (!from || !to) return null;
              const x1 = from.x;
              const y1 = from.y;
              const x2 = to.x;
              const y2 = to.y;
              const midX = x1 + (x2 - x1) / 2;
              return (
                <motion.path
                  key={edge.id}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  stroke="var(--primary)"
                  strokeOpacity={0.5}
                  strokeWidth={2}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              );
            })}

            {visibleNodes.map((node) => {
              const pos = treeLayout.positions[node.id];
              const hasChildren = (childrenByParent[node.id] || []).length > 0;
              const isSelected = node.id === selectedNodeId;
              const isRoot = node.id === selectedRoot.id;
              const inheritedFrom = node.parentId ? nodesById[node.parentId]?.label : null;
              return (
                <motion.g
                  key={`svg-node-${node.id}`}
                  transform={`translate(${pos.x},${pos.y})`}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    if (hasChildren) {
                      updateMindmapNode(node.id, { expanded: node.expanded === false });
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={isSelected ? 7 : 6}
                    fill={isRoot ? '#ffffff' : 'rgb(176, 196, 222)'}
                    stroke={isSelected ? 'var(--primary)' : 'rgba(120,120,120,0.65)'}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  <text
                    x={10}
                    dy=".35em"
                    textAnchor="start"
                    fill="currentColor"
                    fontSize={13}
                    style={{ userSelect: 'none' }}
                  >
                    {node.label || 'Untitled'}
                  </text>
                  {inheritedFrom && (
                    <text
                      x={10}
                      y={15}
                      textAnchor="start"
                      fill="var(--muted-foreground)"
                      fontSize={10}
                      style={{ userSelect: 'none' }}
                    >
                      from {inheritedFrom}
                    </text>
                  )}
                  {hasChildren && node.expanded === false && (
                    <text x={10} y={4} fontSize={11} fill="var(--muted-foreground)">+</text>
                  )}
                  <title>{node.description || node.label}</title>
                </motion.g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mind Map</h2>
          <p className="text-sm text-muted-foreground">Tree view expands node-by-node from left to right.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('2d')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md ${mode === '2d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            <LayoutGrid className="w-4 h-4" /> 2D
          </button>
          <button
            onClick={() => setMode('visualize')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md ${mode === 'visualize' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            <Network className="w-4 h-4" /> Visualize
          </button>
          <button
            onClick={addRoot}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Node
          </button>
        </div>
      </div>

      {projectNodes.length === 0 && <div className="text-sm text-muted-foreground">No nodes yet. Add your first idea.</div>}

      <div className="space-y-3 min-h-0">
        {mode === 'visualize' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold">Root node:</span>
            <select
              value={selectedRoot?.id || ''}
              onChange={(e) => setFocusedId(e.target.value || null)}
              className="rounded-md border border-border bg-background px-2 py-1"
            >
              {roots.map((root) => (
                <option key={root.id} value={root.id}>{root.label}</option>
              ))}
            </select>
            <button
              onClick={() => selectedNode && addChild(selectedNode.id)}
              className="px-2 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-50"
              disabled={!selectedNode}
            >
              Add child to selected
            </button>
            <button
              onClick={() => selectedNode && deleteMindmapNode(selectedNode.id)}
              className="px-2 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-50"
              disabled={!selectedNode}
            >
              Delete selected
            </button>
            <span className="text-muted-foreground">Click a node to select and expand/collapse like the OSINT-style tree.</span>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-3 max-w-full overflow-hidden">
          {mode === '2d' ? render2D() : renderTree()}
        </div>
      </div>
    </div>
  );
}
