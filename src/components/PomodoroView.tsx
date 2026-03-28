import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { Play, Pause, RotateCcw, SkipForward, Settings, Coffee, Zap, Volume2, SkipBack, Music, Trash2 } from 'lucide-react';

type TimerEventOption = {
  id: string;
  name: string;
  duration: number;
  type: 'work' | 'break';
};

const TIMER_OPTIONS_KEY = 'lifeflow-pomodoro-timer-options';
const defaultTimerOptions: TimerEventOption[] = [
  { id: 'event-focus-25', name: 'Focus Session', duration: 25, type: 'work' },
  { id: 'event-break-5', name: 'Short Break', duration: 5, type: 'break' },
  { id: 'event-tea-10', name: 'Tea Time', duration: 10, type: 'break' },
];

export function PomodoroView() {
  const {
    pomodoro, setPomodoroRunning, setPomodoroTimeLeft, setPomodoroSessionType,
    setPomodoroActiveTask, setPomodoroSettings, completePomodoroSession, resetPomodoro,
    activeProjectId, tasks, pomodoroSessions,
  } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showTimingManager, setShowTimingManager] = useState(false);
  const [workMins, setWorkMins] = useState(pomodoro.workDuration);
  const [breakMins, setBreakMins] = useState(pomodoro.breakDuration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<{ id: string; title: string; url: string; fromLocal?: boolean }[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [loopTrack, setLoopTrack] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timingPresets, setTimingPresets] = useState([
    { id: 'preset-25-5', label: 'Classic', work: 25, break: 5 },
    { id: 'preset-50-10', label: 'Deep Focus', work: 50, break: 10 },
    { id: 'preset-90-20', label: 'Flow', work: 90, break: 20 },
  ]);
  const [presetDraft, setPresetDraft] = useState({ label: '', work: 30, break: 5 });
  const [timerOptions, setTimerOptions] = useState<TimerEventOption[]>(defaultTimerOptions);
  const [timerOptionDraft, setTimerOptionDraft] = useState({ name: '', duration: 15, type: 'break' as 'work' | 'break' });
  const [selectedTimerOptionId, setSelectedTimerOptionId] = useState(defaultTimerOptions[0]?.id || '');
  const [musicError, setMusicError] = useState<string | null>(null);
  const sessionCountRef = useRef(pomodoro.sessionsCompleted);

  const projectTasks = tasks.filter((t) => t.projectId === activeProjectId && t.status !== 'done');
  const todaySessions = pomodoroSessions.filter(
    (s) => s.projectId === activeProjectId && s.type === 'work' && s.completed && s.startedAt.startsWith(new Date().toISOString().slice(0, 10))
  );
  const discSpinClass = isAudioPlaying ? 'animate-[spin_10s_linear_infinite]' : '';

  const applyTimerOption = useCallback((optionId: string) => {
    const selected = timerOptions.find((opt) => opt.id === optionId);
    if (!selected) return;

    if (selected.type === 'work') {
      setPomodoroSettings(selected.duration, pomodoro.breakDuration);
    } else {
      setPomodoroSettings(pomodoro.workDuration, selected.duration);
    }
    setPomodoroSessionType(selected.type);
    setPomodoroTimeLeft(selected.duration * 60);
    setPomodoroRunning(false);
  }, [timerOptions, setPomodoroSettings, pomodoro.breakDuration, pomodoro.workDuration, setPomodoroSessionType, setPomodoroTimeLeft, setPomodoroRunning]);

  const tick = useCallback(() => {
    const { pomodoro: p } = useStore.getState();
    if (p.timeLeft <= 1) {
      completePomodoroSession();
    } else {
      setPomodoroTimeLeft(p.timeLeft - 1);
    }
  }, [completePomodoroSession, setPomodoroTimeLeft]);

  useEffect(() => {
    if (pomodoro.isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pomodoro.isRunning, tick]);

  const mins = Math.floor(pomodoro.timeLeft / 60);
  const secs = pomodoro.timeLeft % 60;
  const totalTime = pomodoro.sessionType === 'work' ? pomodoro.workDuration * 60 : pomodoro.breakDuration * 60;
  const progress = ((totalTime - pomodoro.timeLeft) / totalTime) * 100;

  const handleSaveSettings = () => {
    setPomodoroSettings(workMins, breakMins);
    setShowSettings(false);
  };

  const applyPreset = (work: number, brk: number) => {
    setWorkMins(work);
    setBreakMins(brk);
    setPomodoroSettings(work, brk);
  };

  useEffect(() => {
    const savedOptions = window.localStorage.getItem(TIMER_OPTIONS_KEY);
    if (!savedOptions) return;
    try {
      const parsed = JSON.parse(savedOptions) as TimerEventOption[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTimerOptions(parsed);
        setSelectedTimerOptionId(parsed[0].id);
      }
    } catch {
      // Ignore malformed saved timer options.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(TIMER_OPTIONS_KEY, JSON.stringify(timerOptions));
    if (!timerOptions.find((opt) => opt.id === selectedTimerOptionId)) {
      setSelectedTimerOptionId(timerOptions[0]?.id || '');
    }
  }, [timerOptions, selectedTimerOptionId]);

  const playChime = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  };

  const loadProjectMusicFolder = useCallback(async (replace = false) => {
    try {
      setMusicError(null);
      const res = await fetch('/music/manifest.json', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('missing_manifest');
      }
      const manifest = await res.json();
      if (!Array.isArray(manifest) || manifest.length === 0) {
        throw new Error('empty_manifest');
      }

      const normalized = (manifest as string[])
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .map((item) => ({
          id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${item}`),
          title: item,
          url: `/music/${encodeURIComponent(item)}`,
          fromLocal: false,
        }));

      setPlaylist((prev) => {
        if (replace) return normalized;
        const existing = new Set(prev.map((p) => p.title));
        const incoming = normalized.filter((item) => !existing.has(item.title));
        return incoming.length ? [...prev, ...incoming] : prev;
      });
      setCurrentTrack(0);
    } catch {
      setMusicError('Add /public/music/manifest.json with a JSON array of filenames to load folder tracks.');
    }
  }, []);

  useEffect(() => {
    void loadProjectMusicFolder(true);
  }, [loadProjectMusicFolder]);

  useEffect(() => {
    if (pomodoro.sessionsCompleted > sessionCountRef.current) {
      playChime();
    }
    sessionCountRef.current = pomodoro.sessionsCompleted;
  }, [pomodoro.sessionsCompleted]);

  useEffect(() => {
    if (!playlist.length) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const track = playlist[currentTrack];
    if (!track) return;
    audio.src = track.url;
    audio.loop = loopTrack;
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    const handleEnded = () => {
      if (loopTrack) {
        audio.play().catch(() => {});
      } else {
        setCurrentTrack((idx) => (idx + 1) % playlist.length);
      }
    };
    audio.onended = handleEnded;
    if (isAudioPlaying) {
      audio.play().catch(() => setIsAudioPlaying(false));
    }
    return () => {
      audio.onended = null;
    };
  }, [playlist, currentTrack, isAudioPlaying, loopTrack, volume, playbackRate]);

  useEffect(() => {
    return () => {
      playlist.filter((t) => t.fromLocal).forEach((t) => URL.revokeObjectURL(t.url));
      audioRef.current?.pause();
    };
  }, [playlist]);

  const toggleAudio = () => {
    if (!playlist.length) return;
    setIsAudioPlaying((p) => !p);
    const audio = audioRef.current;
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsAudioPlaying(false));
    }
  };

  const handleNextTrack = () => {
    if (!playlist.length) return;
    setCurrentTrack((idx) => (idx + 1) % playlist.length);
  };

  const handlePrevTrack = () => {
    if (!playlist.length) return;
    setCurrentTrack((idx) => (idx - 1 + playlist.length) % playlist.length);
  };

  const handleAddTracks = (files: FileList | null) => {
    if (!files) return;
    setMusicError(null);
    const items = Array.from(files).map((file) => ({
      id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${file.name}`),
      title: file.name,
      url: URL.createObjectURL(file),
      fromLocal: true,
    }));
    setPlaylist((prev) => [...prev, ...items]);
    if (!playlist.length && items.length > 0) {
      setCurrentTrack(0);
    }
  };

  const seekAudioBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  };

  const handleCreateOrUpdateTimerOption = () => {
    const name = timerOptionDraft.name.trim() || `${timerOptionDraft.type === 'work' ? 'Focus' : 'Break'} ${timerOptionDraft.duration}m`;
    const newOption: TimerEventOption = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${name}`,
      name,
      duration: Math.max(1, timerOptionDraft.duration),
      type: timerOptionDraft.type,
    };
    setTimerOptions((prev) => [...prev, newOption]);
    setSelectedTimerOptionId(newOption.id);
    setTimerOptionDraft({ name: '', duration: 15, type: 'break' });
  };

  const handleDeleteTimerOption = (id: string) => {
    setTimerOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl mx-auto"
      >
        {/* Session Type Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {pomodoro.sessionType === 'work' ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Zap className="w-4 h-4" /> Focus Session
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
              <Coffee className="w-4 h-4" /> Break Time
            </span>
          )}
        </div>

        {/* Timer Circle */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-border"
            />
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              className={pomodoro.sessionType === 'work' ? 'text-primary' : 'text-accent'}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-light tabular-nums tracking-tight">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Session {pomodoro.sessionsCompleted + 1}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={resetPomodoro}
            className="p-3 rounded-xl hover:bg-muted transition-colors active:scale-95"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => setPomodoroRunning(!pomodoro.isRunning)}
            className={`p-4 rounded-2xl transition-all active:scale-95 ${
              pomodoro.isRunning
                ? 'bg-secondary text-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {pomodoro.isRunning
              ? <Pause className="w-6 h-6" />
              : <Play className="w-6 h-6 ml-0.5" />
            }
          </button>

          <button
            onClick={() => {
              const next = pomodoro.sessionType === 'work' ? 'break' : 'work';
              setPomodoroSessionType(next);
            }}
            className="p-3 rounded-xl hover:bg-muted transition-colors active:scale-95"
            title="Skip"
          >
            <SkipForward className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Task Selector */}
        {projectTasks.length > 0 && (
          <div className="mb-6">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Working on
            </label>
            <select
              value={pomodoro.activeTaskId || ''}
              onChange={(e) => setPomodoroActiveTask(e.target.value || null)}
              className="w-full text-sm px-3 py-2 rounded-lg bg-secondary border-none outline-none cursor-pointer"
            >
              <option value="">No task selected</option>
              {projectTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Today's Stats */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="text-center">
            <span className="block text-lg font-medium text-foreground tabular-nums">{todaySessions.length}</span>
            <span className="text-[10px] uppercase tracking-wider">Sessions</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <span className="block text-lg font-medium text-foreground tabular-nums">
              {todaySessions.reduce((sum, s) => sum + s.duration, 0)}
            </span>
            <span className="text-[10px] uppercase tracking-wider">Minutes</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <span className="block text-lg font-medium text-foreground tabular-nums">{pomodoro.sessionsCompleted}</span>
            <span className="text-[10px] uppercase tracking-wider">Streak</span>
          </div>
        </div>

        {/* Settings Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            Settings
          </button>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-card rounded-xl border border-border space-y-3">
                <div className="flex items-center gap-4">
                  <label className="text-xs text-muted-foreground w-20">Work</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={workMins}
                    onChange={(e) => setWorkMins(Number(e.target.value))}
                    className="flex-1 text-sm px-3 py-1.5 rounded-md bg-secondary outline-none tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-xs text-muted-foreground w-20">Break</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={breakMins}
                    onChange={(e) => setBreakMins(Number(e.target.value))}
                    className="flex-1 text-sm px-3 py-1.5 rounded-md bg-secondary outline-none tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="w-full text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Save
                </button>

                <button
                  onClick={() => setShowTimingManager((v) => !v)}
                  className="w-full text-xs py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  {showTimingManager ? 'Hide timing presets' : 'Manage timing presets'}
                </button>

                {showTimingManager && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      {timingPresets.map((preset) => (
                        <div key={preset.id} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px]">
                          <button
                            onClick={() => applyPreset(preset.work, preset.break)}
                            className="hover:text-primary"
                            title="Apply preset"
                          >
                            {preset.label} ({preset.work}/{preset.break})
                          </button>
                          <button
                            onClick={() => setTimingPresets((prev) => prev.filter((p) => p.id !== preset.id))}
                            className="text-muted-foreground hover:text-foreground"
                            title="Delete preset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
                      <input
                        value={presetDraft.label}
                        onChange={(e) => setPresetDraft((d) => ({ ...d, label: e.target.value }))}
                        placeholder="Preset name"
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={presetDraft.work}
                        onChange={(e) => setPresetDraft((d) => ({ ...d, work: Number(e.target.value) || 1 }))}
                        className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
                        title="Work minutes"
                      />
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={presetDraft.break}
                        onChange={(e) => setPresetDraft((d) => ({ ...d, break: Number(e.target.value) || 1 }))}
                        className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
                        title="Break minutes"
                      />
                      <button
                        onClick={() => {
                          const label = presetDraft.label.trim() || `Custom ${presetDraft.work}/${presetDraft.break}`;
                          setTimingPresets((prev) => [...prev, {
                            id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${label}`),
                            label,
                            work: presetDraft.work,
                            break: presetDraft.break,
                          }]);
                          setPresetDraft({ label: '', work: 30, break: 5 });
                        }}
                        className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs"
                      >
                        Add
                      </button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">Quick timer events can now be added/deleted directly from the Quick Timer Events card below.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 w-full max-w-md border border-border rounded-xl bg-card p-3 space-y-2">
          <div className="text-xs font-semibold">Quick Timer Events</div>
          <div className="flex items-center gap-2">
            <select
              value={selectedTimerOptionId}
              onChange={(e) => setSelectedTimerOptionId(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            >
              {timerOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name} ({opt.duration}m {opt.type})</option>
              ))}
            </select>
            <button
              onClick={() => applyTimerOption(selectedTimerOptionId)}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs"
              disabled={!selectedTimerOptionId}
            >
              Apply
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 pt-1">
            <input
              value={timerOptionDraft.name}
              onChange={(e) => setTimerOptionDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Custom event name"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
            <input
              type="number"
              min={1}
              max={180}
              value={timerOptionDraft.duration}
              onChange={(e) => setTimerOptionDraft((d) => ({ ...d, duration: Number(e.target.value) || 1 }))}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
            <select
              value={timerOptionDraft.type}
              onChange={(e) => setTimerOptionDraft((d) => ({ ...d, type: e.target.value as 'work' | 'break' }))}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="work">Work</option>
              <option value="break">Break</option>
            </select>
            <button
              onClick={handleCreateOrUpdateTimerOption}
              className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs"
            >
              Add
            </button>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
            {timerOptions.map((opt) => (
              <div key={opt.id} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-xs">
                <button
                  onClick={() => {
                    setSelectedTimerOptionId(opt.id);
                    applyTimerOption(opt.id);
                  }}
                  className="text-left hover:text-primary"
                >
                  {opt.name} ({opt.duration}m {opt.type})
                </button>
                <button
                  onClick={() => handleDeleteTimerOption(opt.id)}
                  className="px-1 py-0.5 rounded hover:bg-muted text-muted-foreground"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 w-full max-w-md border border-border rounded-xl bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <div className={`relative w-11 h-11 rounded-full bg-gradient-to-br from-primary/70 via-primary to-primary/60 border border-primary/40 shadow-inner ${discSpinClass}`}>
                <div className="absolute inset-2 rounded-full bg-background/90" />
                <div className="absolute inset-[38%] rounded-full bg-primary/80" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Focus playlist
                </div>
                <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{playlist[currentTrack]?.title || 'Add tracks to start'}</p>
              </div>
            </div>
            <label className="text-[11px] text-muted-foreground cursor-pointer px-2 py-1 rounded-md border border-border hover:bg-muted">
              Add files
              <input
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleAddTracks(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadProjectMusicFolder(true)}
              className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted"
            >
              Load from /music folder
            </button>
            <span className="text-[11px] text-muted-foreground">Reads /public/music/manifest.json</span>
          </div>
          {musicError && <p className="text-[11px] text-amber-600">{musicError}</p>}
          {playlist.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add local audio files to build a playlist for your sessions.</p>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">
                Select music from folder
                <select
                  value={playlist[currentTrack]?.id || ''}
                  onChange={(e) => {
                    const idx = playlist.findIndex((track) => track.id === e.target.value);
                    if (idx >= 0) setCurrentTrack(idx);
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  {playlist.map((track) => (
                    <option key={track.id} value={track.id}>{track.title}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Now playing</span>
                <span className="font-medium text-foreground">{playlist[currentTrack]?.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevTrack}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={!playlist.length}
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleAudio}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  disabled={!playlist.length}
                >
                  {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isAudioPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={handleNextTrack}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={!playlist.length}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={() => seekAudioBy(-10)}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={!playlist.length}
                  title="Rewind 10s"
                >
                  -10s
                </button>
                <button
                  onClick={() => seekAudioBy(10)}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={!playlist.length}
                  title="Forward 10s"
                >
                  +10s
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1"
                />
                <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={loopTrack}
                    onChange={(e) => setLoopTrack(e.target.checked)}
                    className="accent-primary"
                  />
                  Loop
                </label>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Speed</span>
                <button
                  onClick={() => setPlaybackRate((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                  className="px-2 py-1 rounded border border-border hover:bg-muted"
                  disabled={!playlist.length}
                >
                  -
                </button>
                <span className="w-10 text-center tabular-nums">{playbackRate.toFixed(1)}x</span>
                <button
                  onClick={() => setPlaybackRate((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))))}
                  className="px-2 py-1 rounded border border-border hover:bg-muted"
                  disabled={!playlist.length}
                >
                  +
                </button>
              </div>
              <div className="max-h-24 overflow-y-auto border border-border rounded-md divide-y divide-border text-xs">
                {playlist.map((track, idx) => (
                  <div
                    key={track.id}
                    className={`px-3 py-2 flex items-center justify-between ${idx === currentTrack ? 'bg-muted/60' : ''}`}
                  >
                    <span className="truncate">{track.title}</span>
                    <button
                      className="text-[11px] text-primary hover:underline"
                      onClick={() => {
                        setCurrentTrack(idx);
                        setIsAudioPlaying(true);
                      }}
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>


      </motion.div>
    </div>
  );
}
