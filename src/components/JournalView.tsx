import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import type { MoodType } from '@/types';
import { MOOD_EMOJI } from '@/types';
import {
  Plus, Trash2, Search, X, BookOpen, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

export function JournalView() {
  const { activeProjectId, journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useStore();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagInput, setTagInput] = useState('');

  const entries = journalEntries
    .filter((e) => e.projectId === activeProjectId)
    .filter((e) =>
      search === '' ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeEntry = activeEntryId ? entries.find((e) => e.id === activeEntryId) : null;

  const handleCreate = () => {
    if (!activeProjectId) return;
    const id = addJournalEntry({
      title: format(new Date(), 'EEEE, MMMM d'),
      content: '',
    });
    setActiveEntryId(id);
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Select or create a project</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Entry List */}
      <div className="w-72 border-r border-border flex flex-col shrink-0 bg-surface-sunken">
        <div className="p-3 space-y-2 border-b border-border">
          <button
            onClick={handleCreate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Entry
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-muted border-none outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setActiveEntryId(entry.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${
                activeEntryId === entry.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{entry.title || 'Untitled'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {entry.content || 'Empty entry…'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {entry.mood && <span className="text-sm">{MOOD_EMOJI[entry.mood]}</span>}
                  <span className="text-[9px] text-text-tertiary">
                    {format(new Date(entry.createdAt), 'MMM d')}
                  </span>
                </div>
              </div>
              {entry.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[9px] bg-muted px-1 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs">No entries yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {activeEntry ? (
        <motion.div
          key={activeEntry.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Entry Header */}
          <div className="px-6 py-3 border-b border-border flex items-center justify-between">
            <div className="flex-1">
              <input
                value={activeEntry.title}
                onChange={(e) => updateJournalEntry(activeEntry.id, { title: e.target.value })}
                className="text-lg font-medium bg-transparent outline-none w-full"
                placeholder="Entry title…"
              />
              <span className="text-[10px] text-text-tertiary">
                {format(new Date(activeEntry.createdAt), 'EEEE, MMMM d, yyyy · h:mm a')}
              </span>
            </div>
            <button
              onClick={() => { deleteJournalEntry(activeEntry.id); setActiveEntryId(null); }}
              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Mood + Tags Bar */}
          <div className="px-6 py-2 border-b border-border flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground mr-1">Mood:</span>
              {(Object.keys(MOOD_EMOJI) as MoodType[]).map((mood) => (
                <button
                  key={mood}
                  onClick={() => updateJournalEntry(activeEntry.id, {
                    mood: activeEntry.mood === mood ? null : mood
                  })}
                  className={`text-lg p-0.5 rounded transition-all ${
                    activeEntry.mood === mood ? 'scale-125 bg-muted' : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  {MOOD_EMOJI[mood]}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {activeEntry.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                  {tag}
                  <button onClick={() => updateJournalEntry(activeEntry.id, { tags: activeEntry.tags.filter((t) => t !== tag) })}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    updateJournalEntry(activeEntry.id, { tags: [...activeEntry.tags, tagInput.trim()] });
                    setTagInput('');
                  }
                }}
                placeholder="+ tag"
                className="text-[10px] bg-transparent outline-none w-16 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <textarea
              value={activeEntry.content}
              onChange={(e) => updateJournalEntry(activeEntry.id, { content: e.target.value })}
              placeholder="Write your thoughts…"
              className="w-full h-full p-6 text-sm leading-relaxed bg-transparent outline-none resize-none placeholder:text-muted-foreground text-pretty"
              style={{ minHeight: '100%' }}
            />
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select an entry or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}
