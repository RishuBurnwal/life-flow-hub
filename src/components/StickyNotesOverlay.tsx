import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote as StickyNoteIcon, Plus, Trash2, Edit3, Link2, X, Settings2 } from 'lucide-react';
import { useStore } from '@/stores/useStore';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function StickyNotesOverlay() {
  const {
    activeProjectId,
    stickyNotes,
    mindmapNodes,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [iconPos, setIconPos] = useState({ x: 16, y: Math.max(80, window.innerHeight - 110) });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: 'New note',
    content: '',
    color: '#FFE59A',
    linkedNodeId: '',
  });

  const projectNotes = useMemo(
    () => stickyNotes.filter((n) => n.projectId === activeProjectId),
    [stickyNotes, activeProjectId]
  );
  const projectNodes = useMemo(
    () => mindmapNodes.filter((n) => n.projectId === activeProjectId),
    [mindmapNodes, activeProjectId]
  );

  if (!activeProjectId) return null;

  useEffect(() => {
    const saved = window.localStorage.getItem('sticky-launcher-pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setIconPos({ x: parsed.x, y: parsed.y });
          return;
        }
      } catch {
        // Ignore malformed launcher position.
      }
    }
    setIconPos({ x: 16, y: Math.max(80, window.innerHeight - 110) });
  }, []);

  const addQuickNote = () => {
    const noteId = addStickyNote({
      title: 'Quick note',
      content: '',
      color: '#FFE59A',
      linkedNodeId: null,
      x: clamp(iconPos.x + 70, 8, Math.max(24, window.innerWidth - 260)),
      y: clamp(iconPos.y - 20, 56, Math.max(80, window.innerHeight - 180)),
    });
    onEdit(noteId);
    setQuickOpen(false);
  };

  const resetDraft = () => {
    setDraft({ title: 'New note', content: '', color: '#FFE59A', linkedNodeId: '' });
    setEditingId(null);
  };

  const onSave = () => {
    if (!draft.title.trim()) return;
    const payload = {
      title: draft.title.trim(),
      content: draft.content,
      color: draft.color,
      linkedNodeId: draft.linkedNodeId || null,
    };
    if (editingId) {
      updateStickyNote(editingId, payload);
    } else {
      addStickyNote(payload);
    }
    resetDraft();
  };

  const onEdit = (id: string) => {
    const note = projectNotes.find((n) => n.id === id);
    if (!note) return;
    setEditingId(id);
    setDraft({
      title: note.title,
      content: note.content,
      color: note.color,
      linkedNodeId: note.linkedNodeId || '',
    });
    setOpen(true);
  };

  const onDragEnd = (id: string, deltaX: number, deltaY: number, currentX: number, currentY: number) => {
    const maxX = Math.max(24, window.innerWidth - 260);
    const maxY = Math.max(80, window.innerHeight - 180);
    const nextX = clamp(currentX + deltaX, 8, maxX);
    const nextY = clamp(currentY + deltaY, 56, maxY);
    updateStickyNote(id, { x: nextX, y: nextY });
  };

  return (
    <>
      <div>
        <motion.div
          drag
          dragMomentum={false}
          onHoverStart={() => setQuickOpen(true)}
          onHoverEnd={() => setQuickOpen(false)}
          onDragEnd={(_, info) => {
            const next = {
              x: clamp(iconPos.x + info.offset.x, 8, Math.max(24, window.innerWidth - 56)),
              y: clamp(iconPos.y + info.offset.y, 56, Math.max(80, window.innerHeight - 56)),
            };
            setIconPos(next);
            window.localStorage.setItem('sticky-launcher-pos', JSON.stringify(next));
          }}
          className="fixed z-[80]"
          style={{ left: iconPos.x, top: iconPos.y }}
        >
          <button
            onClick={() => setOpen((v) => !v)}
            className="group relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface-elevated shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-grab active:cursor-grabbing"
            title="Sticky notes"
            aria-label="Sticky notes"
          >
            <StickyNoteIcon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
            <span className="absolute -top-1 -right-1 text-[10px] min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
              {projectNotes.length}
            </span>
          </button>

          <AnimatePresence>
            {quickOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                className="absolute left-14 top-0 w-44 rounded-lg border border-border bg-card p-1.5 shadow-xl"
              >
                <button
                  onClick={() => {
                    setOpen((v) => !v);
                    setQuickOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted"
                >
                  Open notes panel
                </button>
                <button
                  onClick={addQuickNote}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted"
                >
                  Create quick note
                </button>
                <button
                  onClick={() => {
                    if (projectNotes[0]) onEdit(projectNotes[0].id);
                    setQuickOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted inline-flex items-center gap-1"
                  disabled={!projectNotes[0]}
                >
                  <Settings2 className="w-3 h-3" /> Edit latest note
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className="fixed w-[310px] max-h-[65vh] overflow-hidden rounded-xl border border-border bg-card shadow-xl z-[70]"
            style={{
              left: clamp(iconPos.x, 8, Math.max(8, window.innerWidth - 330)),
              top: clamp(iconPos.y + 56, 56, Math.max(56, window.innerHeight - 420)),
            }}
          >
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="text-sm font-semibold">Sticky Notes</div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 border-b border-border">
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                placeholder="Title"
              />
              <textarea
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs resize-none"
                placeholder="Write note..."
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                  className="h-9 rounded border border-border bg-background"
                />
                <select
                  value={draft.linkedNodeId}
                  onChange={(e) => setDraft((d) => ({ ...d, linkedNodeId: e.target.value }))}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">No linked node</option>
                  {projectNodes.map((node) => (
                    <option key={node.id} value={node.id}>{node.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={onSave}
                className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" /> {editingId ? 'Update note' : 'Add note'}
              </button>
            </div>

            <div className="max-h-[34vh] overflow-y-auto p-2 space-y-2">
              {projectNotes.length === 0 && <p className="text-xs text-muted-foreground p-2">No notes yet.</p>}
              {projectNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-border px-3 py-2 text-xs hover:shadow-md transition-shadow"
                  style={{ backgroundColor: `${note.color}33` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold truncate">{note.title}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(note.id)} className="p-1 rounded hover:bg-muted" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteStickyNote(note.id)} className="p-1 rounded hover:bg-muted" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-muted-foreground line-clamp-2">{note.content || 'No content'}</p>
                  {note.linkedNodeId && (
                    <div className="mt-1 inline-flex items-center gap-1 text-primary text-[11px]">
                      <Link2 className="w-3 h-3" /> Linked to node
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {projectNotes.map((note) => (
        <motion.div
          key={`float-${note.id}`}
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => onDragEnd(note.id, info.offset.x, info.offset.y, note.x, note.y)}
          whileHover={{ scale: 1.02, boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}
          className="fixed w-[220px] rounded-xl border border-border p-3 text-xs shadow-md cursor-grab active:cursor-grabbing z-[55]"
          style={{ left: note.x, top: note.y, backgroundColor: note.color }}
          title="Drag me"
        >
          <div className="font-semibold truncate">{note.title}</div>
          <p className="mt-1 text-black/80 line-clamp-4 whitespace-pre-wrap">{note.content || 'No content'}</p>
        </motion.div>
      ))}
    </>
  );
}
