import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { HABIT_COLORS } from '@/types';
import {
  Plus, Trash2, Check, Flame, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  format, startOfWeek, addDays, subDays, addWeeks, subWeeks,
  isSameDay, differenceInCalendarDays, startOfDay,
} from 'date-fns';

export function HabitsView() {
  const { activeProjectId, habits, habitLogs, addHabit, deleteHabit, toggleHabitLog } = useStore();
  const [newName, setNewName] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = format(new Date(), 'yyyy-MM-dd');

  const projectHabits = habits.filter((h) => h.projectId === activeProjectId);

  const handleAdd = () => {
    if (!newName.trim() || !activeProjectId) return;
    addHabit({ name: newName.trim() });
    setNewName('');
  };

  const isCompleted = (habitId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return habitLogs.some((l) => l.habitId === habitId && l.date === dateStr);
  };

  const getStreak = (habitId: string) => {
    let streak = 0;
    let date = new Date();
    // Check if today is complete, if not start from yesterday
    if (!isCompleted(habitId, date)) {
      date = subDays(date, 1);
    }
    while (isCompleted(habitId, date)) {
      streak++;
      date = subDays(date, 1);
    }
    return streak;
  };

  const getBestStreak = (habitId: string) => {
    const logs = habitLogs
      .filter((l) => l.habitId === habitId)
      .map((l) => l.date)
      .sort();
    if (logs.length === 0) return 0;

    let best = 1;
    let current = 1;
    for (let i = 1; i < logs.length; i++) {
      const diff = differenceInCalendarDays(new Date(logs[i]), new Date(logs[i - 1]));
      if (diff === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  };

  // Heatmap - last 90 days
  const heatmapDays = useMemo(() => {
    return Array.from({ length: 91 }, (_, i) => {
      const date = subDays(new Date(), 90 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = projectHabits.filter((h) =>
        habitLogs.some((l) => l.habitId === h.id && l.date === dateStr)
      ).length;
      return { date, dateStr, count };
    });
  }, [projectHabits, habitLogs]);

  const maxCount = Math.max(projectHabits.length, 1);

  if (!activeProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Select or create a project</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Add Habit */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a habit… (Enter to create)"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
        {/* Week View */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Tracker</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-2">
                {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
              </span>
              <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {projectHabits.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Add your first habit above
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-[1fr_repeat(7,40px)_80px] gap-0 px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Habit</span>
                {days.map((d) => (
                  <span
                    key={d.toISOString()}
                    className={`text-[10px] font-medium text-center ${
                      format(d, 'yyyy-MM-dd') === today ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {format(d, 'EEE')}
                  </span>
                ))}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Streak</span>
              </div>

              {/* Habit Rows */}
              {projectHabits.map((habit) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-[1fr_repeat(7,40px)_80px] gap-0 px-3 py-2 border-b border-border last:border-0 items-center group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                    <span className="text-xs truncate">{habit.name}</span>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {days.map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const done = isCompleted(habit.id, d);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleHabitLog(habit.id, dateStr)}
                        className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center transition-all active:scale-90 ${
                          done
                            ? 'text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        style={done ? { backgroundColor: habit.color } : {}}
                      >
                        {done && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 text-priority-high" />
                    <span className="text-xs font-medium tabular-nums">{getStreak(habit.id)}</span>
                    <span className="text-[9px] text-muted-foreground">/ {getBestStreak(habit.id)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Heatmap */}
        {projectHabits.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              90-Day Activity
            </h3>
            <div className="bg-card rounded-xl border border-border p-3">
              <div className="flex flex-wrap gap-[3px]">
                {heatmapDays.map(({ dateStr, count }) => {
                  const intensity = count / maxCount;
                  return (
                    <div
                      key={dateStr}
                      className="w-3 h-3 rounded-sm transition-colors"
                      style={{
                        backgroundColor: intensity > 0
                          ? `hsl(var(--primary) / ${0.2 + intensity * 0.8})`
                          : 'hsl(var(--muted))',
                      }}
                      title={`${dateStr}: ${count}/${projectHabits.length}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
