import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Calendar, CheckSquare, Target, Plus, Trash2, Edit3, Clock, MapPin } from 'lucide-react';

export function CalendarView() {
  const {
    tasks,
    goals,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    activeProjectId,
  } = useStore();

  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: 'New event',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    location: '',
    color: '#6B7DB3',
  });

  useEffect(() => {
    setDraft((d) => ({ ...d, date: format(selectedDate, 'yyyy-MM-dd') }));
  }, [selectedDate]);

  const monthStart = useMemo(() => startOfMonth(addMonths(new Date(), monthOffset)), [monthOffset]);
  const monthEnd = useMemo(() => endOfMonth(addMonths(new Date(), monthOffset)), [monthOffset]);
  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart, monthEnd]);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === activeProjectId && t.deadline),
    [tasks, activeProjectId]
  );

  const projectGoals = useMemo(
    () => goals.filter((g) => g.projectId === activeProjectId && g.targetDate),
    [goals, activeProjectId]
  );

  const projectEvents = useMemo(
    () => calendarEvents.filter((e) => e.projectId === activeProjectId),
    [calendarEvents, activeProjectId]
  );

  const combinedEvents = useMemo(() => {
    const custom = projectEvents.map((evt) => ({
      id: evt.id,
      date: evt.date,
      type: 'custom' as const,
      title: evt.title,
      color: evt.color,
    }));
    const taskEvents = projectTasks.map((t) => ({
      id: t.id,
      date: t.deadline!.slice(0, 10),
      type: 'task' as const,
      title: t.title || 'Untitled task',
      status: t.status,
    }));
    const goalEvents = projectGoals.map((g) => ({
      id: g.id,
      date: g.targetDate!.slice(0, 10),
      type: 'goal' as const,
      title: g.title || 'Untitled goal',
    }));
    return [...custom, ...taskEvents, ...goalEvents];
  }, [projectEvents, projectTasks, projectGoals]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, (typeof combinedEvents)[number][]> = {};
    combinedEvents.forEach((evt) => {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });
    return map;
  }, [combinedEvents]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedCustomEvents = projectEvents.filter((evt) => evt.date === selectedKey);
  const selectedTasks = projectTasks.filter((t) => t.deadline?.startsWith(selectedKey));
  const selectedGoals = projectGoals.filter((g) => g.targetDate?.startsWith(selectedKey));

  const resetDraft = () => {
    setDraft({
      title: 'New event',
      description: '',
      date: selectedKey,
      time: '',
      location: '',
      color: '#6B7DB3',
    });
    setEditingId(null);
  };

  const handleSave = () => {
    if (!draft.title.trim() || !draft.date) return;
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      date: draft.date,
      time: draft.time ? draft.time : null,
      location: draft.location?.trim() || null,
      color: draft.color || null,
      allDay: !draft.time,
    };
    if (editingId) {
      updateCalendarEvent(editingId, payload);
    } else {
      addCalendarEvent(payload);
    }
    resetDraft();
  };

  const handleEdit = (id: string) => {
    const evt = projectEvents.find((e) => e.id === id);
    if (!evt) return;
    setEditingId(id);
    setDraft({
      title: evt.title,
      description: evt.description,
      date: evt.date,
      time: evt.time ?? '',
      location: evt.location ?? '',
      color: evt.color ?? '#6B7DB3',
    });
    setSelectedDate(new Date(evt.date));
  };

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
        <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Select or create a project to view its calendar.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Calendar</h2>
          <p className="text-xs text-muted-foreground">Custom events plus task/goal dates for this project.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => setMonthOffset((m) => m - 1)} className="px-2 py-1 rounded-md border border-border hover:bg-muted">Prev</button>
          <button onClick={() => { setMonthOffset(0); setSelectedDate(new Date()); }} className="px-2 py-1 rounded-md border border-border hover:bg-muted">Today</button>
          <button onClick={() => setMonthOffset((m) => m + 1)} className="px-2 py-1 rounded-md border border-border hover:bg-muted">Next</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3 text-sm font-semibold">
            <span>{format(monthStart, 'MMMM yyyy')}</span>
            <span className="text-xs text-muted-foreground">Click a day to add/view events</span>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (<span key={d}>{d}</span>))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isSelected = isSameDay(day, selectedDate);
              const events = eventsByDate[key] || [];
              const customCount = events.filter((e) => e.type === 'custom').length;
              const taskCount = events.filter((e) => e.type === 'task').length;
              const goalCount = events.filter((e) => e.type === 'goal').length;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted/60'
                  } ${!isCurrentMonth ? 'opacity-60' : ''}`}
                >
                  <span className="font-medium tabular-nums">{format(day, 'd')}</span>
                  <div className="flex items-center gap-1">
                    {customCount > 0 && <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6B7DB3' }} />}
                    {taskCount > 0 && <span className="inline-block w-2 h-2 rounded-full bg-primary" />}
                    {goalCount > 0 && <span className="inline-block w-2 h-2 rounded-full bg-accent" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <Calendar className="w-4 h-4" />
              {format(selectedDate, 'EEEE, MMM d yyyy')}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>Custom events</span>
                  {selectedCustomEvents.length > 0 && (
                    <span className="text-muted-foreground">{selectedCustomEvents.length} on this day</span>
                  )}
                </div>
                {selectedCustomEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No custom events yet for this date.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedCustomEvents.map((evt) => (
                      <li key={evt.id} className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <span className="mt-1 w-2 h-2 rounded-full" style={{ background: evt.color || '#6B7DB3' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate">{evt.title}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <button onClick={() => handleEdit(evt.id)} className="p-1 rounded hover:bg-muted" title="Edit event">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteCalendarEvent(evt.id)} className="p-1 rounded hover:bg-muted" title="Delete event">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{evt.description || 'No description'}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                            {evt.time && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {evt.time}</span>}
                            {evt.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.location}</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <div className="text-xs font-semibold flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-primary" /> Tasks due ({selectedTasks.length})
                </div>
                {selectedTasks.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No tasks on this date.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {selectedTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="truncate">{t.title}</span>
                        <span className="text-[11px] text-muted-foreground capitalize">{t.status.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <div className="text-xs font-semibold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-accent" /> Goals due ({selectedGoals.length})
                </div>
                {selectedGoals.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No goals on this date.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {selectedGoals.map((g) => (
                      <li key={g.id} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span className="truncate">{g.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" /> {editingId ? 'Edit event' : 'Add event'}
              </div>
              {editingId && (
                <button onClick={resetDraft} className="text-xs text-muted-foreground hover:text-foreground">Cancel edit</button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                placeholder="Event title"
              />
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                placeholder="Description"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-muted-foreground">Date</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-2 py-1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Time (optional)</span>
                  <input
                    type="time"
                    value={draft.time}
                    onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-2 py-1"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-muted-foreground">Location</span>
                  <input
                    value={draft.location}
                    onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-2 py-1"
                    placeholder="Optional"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Color</span>
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 h-10"
                  />
                </label>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold hover:opacity-90"
            >
              {editingId ? 'Update event' : 'Add event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
