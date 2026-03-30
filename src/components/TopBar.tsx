import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/stores/useStore';
import type { ThemeName } from '@/types';
import { ClockWidget } from './ClockWidget';
import { Plus, Search, Bot, Maximize2, Minimize2, Calendar, SunMoon, CloudSun, Loader2, Star, Trash2, Edit2, Check, X } from 'lucide-react';
import { addMonths, eachDayOfInterval, endOfMonth, format, isToday, startOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useWeather } from '@/hooks/use-weather';
import { GMT_TIMEZONES, TZ_PRESETS, CLOCK_SKINS, WATCH_FORMATS, getTimezoneOffset } from '@/utils/timezones';
import { v4 as uuid } from 'uuid';

type ClockTarget = 'primary' | 'secondary';

const normalizeTz = (tz: string) => {
  switch (tz) {
    case 'IST':
      return 'Asia/Kolkata';
    case 'GMT':
      return 'Etc/UTC';
    case 'PST':
      return 'America/Los_Angeles';
    case 'EST':
      return 'America/New_York';
    default:
      return tz;
  }
};

const tzLabel = (tz: string) => {
  const preset = TZ_PRESETS.find((t) => t.code === tz);
  const gmtOption = GMT_TIMEZONES.find((t) => t.code === tz);
  if (preset) return preset.label;
  if (gmtOption) return gmtOption.label;
  return tz;
};

const tzLocation = (tz: string) => {
  const normalized = normalizeTz(tz);
  const preset = TZ_PRESETS.find((t) => t.code === normalized);
  const gmtOption = GMT_TIMEZONES.find((t) => t.code === normalized);
  
  if (preset) return `${preset.label} • ${preset.location}`;
  if (gmtOption) return `${gmtOption.label} • ${gmtOption.location}`;

  const parts = normalized.split('/');
  if (parts.length >= 2) {
    const city = parts[parts.length - 1].split('_').join(' ');
    const region = parts[0].split('_').join(' ');
    return `${city}, ${region}`;
  }
  return normalized;
};

export function TopBar() {
  const {
    setCommandPaletteOpen,
    toggleAiPanel,
    aiPanelOpen,
    focusMode,
    toggleFocusMode,
    activeProjectId,
    projects,
    addTask,
    clockSettings,
    setClockSettings,
    tasks,
    theme,
    setTheme,
  } = useStore();

  const project = projects.find((p) => p.id === activeProjectId);
  const [calendarAnchor, setCalendarAnchor] = useState<DOMRect | null>(null);
  const [calendarTz, setCalendarTz] = useState<string>(clockSettings.primaryTimezone || 'UTC');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpMonth, setJumpMonth] = useState<number>(new Date().getMonth());
  const [jumpYear, setJumpYear] = useState<number>(new Date().getFullYear());
  const [clockSettingsAnchor, setClockSettingsAnchor] = useState<DOMRect | null>(null);
  const [clockSettingsTarget, setClockSettingsTarget] = useState<ClockTarget | null>(null);
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  
  // Timezone selector state
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [editingFavorite, setEditingFavorite] = useState<string | null>(null);
  const [favoriteNameInput, setFavoriteNameInput] = useState('');

  const calendarRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const driftNotifiedRef = useRef(false);

  const localTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const primaryTz = normalizeTz(localTz || 'Etc/UTC');
  const secondaryTz = clockSettings.secondaryTimezone ? normalizeTz(clockSettings.secondaryTimezone) : 'Etc/UTC';

  const primaryFormat24h = clockSettings.primaryFormat24h ?? clockSettings.format24h ?? false;
  const secondaryFormat24h = clockSettings.secondaryFormat24h ?? clockSettings.format24h ?? false;
  const primaryDigitalSkin = clockSettings.primaryDigitalSkin ?? clockSettings.digitalSkin ?? 'minimal';
  const secondaryDigitalSkin = clockSettings.secondaryDigitalSkin ?? clockSettings.analogSkin ?? 'minimal';
  const primaryWatchFormat = clockSettings.primaryWatchFormat || 'digital';
  const secondaryWatchFormat = clockSettings.secondaryWatchFormat || 'digital';
  const secondaryEnabled = clockSettings.secondaryEnabled !== false;

  const weather = useWeather(Boolean(clockSettings.weatherEnabled ?? true), clockSettings.weatherUnit ?? 'c', tzLocation(primaryTz));

  const handleOpenCalendar = (anchor: DOMRect, tz: string) => {
    setCalendarAnchor(anchor);
    setCalendarTz(normalizeTz(tz));
  };

  const openClockSettings = (target: ClockTarget) => (anchor: DOMRect) => {
    setClockSettingsTarget(target);
    setClockSettingsAnchor(anchor);
  };

  const monthStart = useMemo(() => startOfMonth(addMonths(new Date(), monthOffset)), [monthOffset]);
  const monthEnd = useMemo(() => endOfMonth(addMonths(new Date(), monthOffset)), [monthOffset]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const monthName = useMemo(() => format(monthStart, 'MMMM yyyy'), [monthStart]);

  const localeRegion = useMemo(() => {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const maybeRegion = locale.split('-')[1];
    if (maybeRegion && maybeRegion.length === 2) return maybeRegion.toUpperCase();
    return 'US';
  }, []);

  useEffect(() => {
    const year = monthStart.getFullYear();
    let cancelled = false;

    const loadHolidays = async () => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${localeRegion}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || cancelled) return;

        const map: Record<string, string> = {};
        data.forEach((entry) => {
          if (entry?.date && entry?.localName) {
            map[String(entry.date)] = String(entry.localName);
          }
        });
        setHolidays(map);
      } catch {
        // Silent fallback when holiday API is unavailable.
      }
    };

    void loadHolidays();
    return () => {
      cancelled = true;
    };
  }, [monthStart, localeRegion]);

  const todaysTasks = useMemo(() => {
    if (!activeProjectId) return [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return tasks.filter((t) => t.projectId === activeProjectId && t.deadline && t.deadline.startsWith(todayStr)).slice(0, 5);
  }, [tasks, activeProjectId]);

  const selectedDateKey = useMemo(() => format(selectedDay, 'yyyy-MM-dd'), [selectedDay]);
  const selectedDateTasks = useMemo(() => {
    if (!activeProjectId) return [];
    return tasks.filter((t) => t.projectId === activeProjectId && t.deadline && t.deadline.startsWith(selectedDateKey)).slice(0, 8);
  }, [tasks, activeProjectId, selectedDateKey]);

  const selectedHoliday = holidays[selectedDateKey] || null;

  const cycleTheme = () => {
    const themes: ThemeName[] = ['terracotta', 'sage', 'ocean', 'midnight'];
    const idx = themes.indexOf(theme);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next);
  };

  const handleQuickAdd = () => {
    if (!activeProjectId) return;
    addTask({ title: '', status: 'todo' });
  };

  const jumpToMonthYear = () => {
    const base = new Date();
    const target = new Date(jumpYear, jumpMonth, 1);
    const diff = (target.getFullYear() - base.getFullYear()) * 12 + (target.getMonth() - base.getMonth());
    setMonthOffset(diff);
    setSelectedDay(target);
    setJumpOpen(false);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarAnchor(null);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setClockSettingsAnchor(null);
        setClockSettingsTarget(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCalendarAnchor(null);
      setClockSettingsAnchor(null);
      setClockSettingsTarget(null);
    };
    const handleScrollClose = (event: Event) => {
      const target = event.target as Node | null;

      // Keep overlays open when scrolling inside their own content (e.g. timezone list).
      if (target && ((calendarRef.current && calendarRef.current.contains(target)) || (settingsRef.current && settingsRef.current.contains(target)))) {
        return;
      }

      setCalendarAnchor(null);
      setClockSettingsAnchor(null);
      setClockSettingsTarget(null);
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScrollClose, true);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScrollClose, true);
    };
  }, []);

  useEffect(() => {
    if (clockSettings.secondaryEnabled === undefined) {
      setClockSettings({ secondaryEnabled: true });
    }
  }, [clockSettings.secondaryEnabled, setClockSettings]);

  useEffect(() => {
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const drift = Math.abs(now - last - 60000);
      if (drift > 1200 && !driftNotifiedRef.current) {
        driftNotifiedRef.current = true;
        toast({
          title: 'Clock drift detected',
          description: 'Your system timer looks off. Consider resyncing time.',
        });
      }
      last = now;
    }, 60000);
    return () => window.clearInterval(interval);
  }, [toast]);

  const calendarLeft = useMemo(() => {
    if (!calendarAnchor) return 0;
    const maxLeft = (window?.innerWidth || 320) - 320 - 12;
    return Math.max(12, Math.min(calendarAnchor.left, maxLeft));
  }, [calendarAnchor]);

  const settingsLeft = useMemo(() => {
    if (!clockSettingsAnchor) return 0;
    const maxLeft = (window?.innerWidth || 320) - 300 - 12;
    return Math.max(12, Math.min(clockSettingsAnchor.left, maxLeft));
  }, [clockSettingsAnchor]);

  const secondaryTime = useMemo(() => {
    if (!secondaryEnabled || !secondaryTz) return null;
    try {
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !secondaryFormat24h,
        timeZone: secondaryTz,
        timeZoneName: 'short',
      }).format(new Date());
      return `${tzLabel(secondaryTz)} ${formatted}`;
    } catch {
      return secondaryTz;
    }
  }, [secondaryEnabled, secondaryTz, secondaryFormat24h]);

  return (
    <header className="min-h-16 px-3 sm:px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 relative z-40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <section className="min-w-0 flex flex-wrap items-center gap-2">
            <ClockWidget
              timezone={primaryTz}
              label="Local time"
              locationLabel={tzLocation(primaryTz)}
              format24h={primaryFormat24h}
              skin={primaryDigitalSkin as any}
              watchFormat={primaryWatchFormat as any}
              secondaryTime={secondaryTime}
              showAnalog={primaryWatchFormat !== 'digital'}
              compact
              onOpenCalendar={handleOpenCalendar}
              onOpenSettings={(anchor) => openClockSettings('primary')(anchor)}
            />

            {secondaryEnabled ? (
              <ClockWidget
                timezone={secondaryTz}
                label="Second time"
                locationLabel={tzLocation(secondaryTz)}
                format24h={secondaryFormat24h}
                skin={secondaryDigitalSkin as any}
                watchFormat={secondaryWatchFormat as any}
                showAnalog={secondaryWatchFormat !== 'digital'}
                compact
                onOpenCalendar={handleOpenCalendar}
                onOpenSettings={(anchor) => openClockSettings('secondary')(anchor)}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface-elevated px-3 py-2 min-w-[160px] flex flex-col justify-center">
                <div className="text-xs font-semibold text-muted-foreground">Secondary clock</div>
                <p className="text-[11px] text-text-tertiary">Enable to pin another timezone.</p>
                <button
                  onClick={() => setClockSettings({ secondaryEnabled: true })}
                  className="mt-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground px-2 py-1 text-[11px]"
                >
                  Show it
                </button>
              </div>
            )}

            {(clockSettings.weatherEnabled ?? true) && (
              <div className="rounded-xl border border-border bg-surface-elevated px-3 py-2 min-w-[160px]">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CloudSun className="w-3.5 h-3.5" /> Weather
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums">
                  {weather.loading ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading</span>
                  ) : weather.displayTemp != null ? (
                    <span>{Math.round(weather.displayTemp)}°{(clockSettings.weatherUnit ?? 'c').toUpperCase()}</span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="text-[11px] text-text-tertiary truncate max-w-[200px]">{weather.error || weather.locationLabel}</div>
              </div>
            )}
          </section>

          {project && (
            <section className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              <span className="text-sm font-medium truncate max-w-[260px]">{project.name}</span>
            </section>
          )}
        </div>

        <section className="shrink-0 flex items-center gap-1 self-start lg:self-center">
          <button
            onClick={handleQuickAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]"
            disabled={!activeProjectId}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 transition-colors active:scale-[0.97]"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-[0.97]"
            title="Toggle theme"
          >
            <SunMoon className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFocusMode}
            className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-[0.97]"
            title={focusMode ? 'Exit focus mode' : 'Focus mode'}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleAiPanel}
            className={`p-2 rounded-lg transition-colors active:scale-[0.97] ${aiPanelOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            title="AI Assistant"
          >
            <Bot className="w-4 h-4" />
          </button>
        </section>
      </div>

      <AnimatePresence>
        {clockSettingsAnchor && clockSettingsTarget && (
          <motion.div
            key="clock-settings"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed z-40 bg-surface-elevated border border-border rounded-xl shadow-popup p-4 w-[300px]"
            style={{ top: (clockSettingsAnchor.bottom ?? 0) + 8, left: settingsLeft }}
            ref={settingsRef}
          >
            <div className="text-sm font-semibold mb-3">{clockSettingsTarget === 'primary' ? 'Primary clock settings' : 'Secondary clock settings'}</div>

            {clockSettingsTarget === 'primary' ? (
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between gap-3">
                  24-hour format
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={primaryFormat24h}
                    onChange={(e) => setClockSettings({ primaryFormat24h: e.target.checked })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-muted-foreground">Digital skin</span>
                  <select
                    className="w-full rounded border border-border bg-background px-2 py-1"
                    value={primaryDigitalSkin}
                    onChange={(e) => setClockSettings({ primaryDigitalSkin: e.target.value })}
                  >
                    {CLOCK_SKINS.map((skin) => (
                      <option key={skin} value={skin}>{skin}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-muted-foreground">Watch format</span>
                  <select
                    className="w-full rounded border border-border bg-background px-2 py-1"
                    value={clockSettings.primaryWatchFormat || 'digital'}
                    onChange={(e) => setClockSettings({ primaryWatchFormat: e.target.value as any })}
                  >
                    {WATCH_FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </label>
                <p className="text-muted-foreground">Timezone is locked to your system local timezone.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between gap-3">
                  Show second clock
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={clockSettings.secondaryEnabled}
                    onChange={(e) => setClockSettings({ secondaryEnabled: e.target.checked })}
                  />
                </label>
                
                <div className="block space-y-2">
                  <span className="text-muted-foreground">Timezone</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-left text-xs hover:bg-muted flex items-center justify-between"
                    >
                      <span>{tzLabel(secondaryTz)}</span>
                      <span className="text-muted-foreground" style={{fontSize: '10px'}}>▼</span>
                    </button>
                    
                    {showTimezoneSelector && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                        <input
                          type="text"
                          placeholder="Search timezone..."
                          className="w-full px-2 py-1 text-xs border-b border-border bg-background focus:outline-none"
                          value={timezoneSearch}
                          onChange={(e) => setTimezoneSearch(e.target.value)}
                        />
                        <div className="max-h-40 overflow-y-auto">
                          {[...TZ_PRESETS, ...GMT_TIMEZONES]
                            .filter(tz => 
                              tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
                              tz.location.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
                              ("offset" in tz && typeof tz.offset === 'string' && tz.offset.includes(timezoneSearch))
                            )
                            .map((tz) => (
                              <button
                                key={tz.code}
                                onClick={() => {
                                  setClockSettings({ secondaryTimezone: tz.code, secondaryEnabled: true });
                                  setShowTimezoneSelector(false);
                                  setTimezoneSearch('');
                                }}
                                className="w-full text-left px-2 py-1 text-xs hover:bg-muted flex items-center justify-between border-b border-border/50"
                              >
                                <div>
                                  <div className="font-medium">{tz.label} • {tz.location}</div>
                                  {"offset" in tz && typeof tz.offset === 'string' && tz.offset ? (
                                    <div className="text-muted-foreground text-[10px]">{tz.offset}</div>
                                  ) : null}
                                </div>
                                {secondaryTz === tz.code && <span className="text-primary">✓</span>}
                              </button>
                            ))}
                        </div>
                        
                        <button
                          onClick={() => {
                            const newFavorite = {
                              id: uuid(),
                              timezone: secondaryTz,
                              customName: tzLabel(secondaryTz),
                              offset: getTimezoneOffset(secondaryTz),
                              createdAt: new Date().toISOString(),
                            };
                            setClockSettings({
                              timezoneFavorites: [...(clockSettings.timezoneFavorites || []), newFavorite]
                            });
                          }}
                          className="w-full text-left px-2 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 border-t border-border"
                        >
                          <Star className="w-3 h-3" /> Add current as favorite
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {clockSettings.timezoneFavorites && clockSettings.timezoneFavorites.length > 0 && (
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="text-muted-foreground mb-1">Favorites:</div>
                    <div className="space-y-1">
                      {clockSettings.timezoneFavorites.map((fav) => (
                        <div key={fav.id} className="flex items-center justify-between gap-1 bg-muted/40 p-1 rounded text-[10px]">
                          {editingFavorite === fav.id ? (
                            <input
                              type="text"
                              value={favoriteNameInput}
                              onChange={(e) => setFavoriteNameInput(e.target.value)}
                              className="flex-1 bg-background border border-border rounded px-1 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1 truncate">{fav.customName} ({fav.offset})</span>
                          )}
                          <div className="flex items-center gap-1">
                            {editingFavorite === fav.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    const updated = clockSettings.timezoneFavorites!.map(f =>
                                      f.id === fav.id ? { ...f, customName: favoriteNameInput } : f
                                    );
                                    setClockSettings({ timezoneFavorites: updated });
                                    setEditingFavorite(null);
                                  }}
                                  className="p-0.5 hover:bg-muted"
                                >
                                  <Check className="w-3 h-3 text-green-600" />
                                </button>
                                <button
                                  onClick={() => setEditingFavorite(null)}
                                  className="p-0.5 hover:bg-muted"
                                >
                                  <X className="w-3 h-3 text-red-600" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setClockSettings({ secondaryTimezone: fav.timezone, secondaryEnabled: true })}
                                  className="px-1.5 py-0.5 bg-primary/20 text-primary rounded hover:bg-primary/30 text-[10px]"
                                >
                                  Use
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingFavorite(fav.id);
                                    setFavoriteNameInput(fav.customName);
                                  }}
                                  className="p-0.5 hover:bg-muted"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = clockSettings.timezoneFavorites!.filter(f => f.id !== fav.id);
                                    setClockSettings({ timezoneFavorites: updated });
                                  }}
                                  className="p-0.5 hover:bg-muted"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <label className="flex items-center justify-between gap-3">
                  24-hour format
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={secondaryFormat24h}
                    onChange={(e) => setClockSettings({ secondaryFormat24h: e.target.checked })}
                  />
                </label>
                
                <label className="block space-y-1">
                  <span className="text-muted-foreground">Digital skin</span>
                  <select
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    value={secondaryDigitalSkin}
                    onChange={(e) => setClockSettings({ secondaryDigitalSkin: e.target.value })}
                  >
                    {CLOCK_SKINS.map((skin) => (
                      <option key={skin} value={skin}>{skin}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-muted-foreground">Watch format</span>
                  <select
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    value={clockSettings.secondaryWatchFormat || 'digital'}
                    onChange={(e) => setClockSettings({ secondaryWatchFormat: e.target.value as any })}
                  >
                    {WATCH_FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {calendarAnchor && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed z-40 bg-surface-elevated border border-border rounded-xl shadow-popup p-4 w-80 max-h-[80vh] overflow-y-auto"
            style={{ top: (calendarAnchor.bottom ?? 0) + 8, left: calendarLeft }}
            ref={calendarRef}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <button
                  type="button"
                  className="text-sm font-semibold hover:text-primary transition-colors"
                  onClick={() => setJumpOpen((v) => !v)}
                >
                  {monthName} • {tzLabel(calendarTz)}
                </button>
                <div className="text-xs text-muted-foreground">Click any day to browse tasks due.</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMonthOffset((m) => m - 1)} className="text-xs px-2 py-1 rounded hover:bg-muted">-</button>
                <button onClick={() => setMonthOffset(0)} className="text-xs px-2 py-1 rounded hover:bg-muted">Today</button>
                <button onClick={() => setMonthOffset((m) => m + 1)} className="text-xs px-2 py-1 rounded hover:bg-muted">+</button>
                <button onClick={() => setCalendarAnchor(null)} className="text-xs px-2 py-1 rounded hover:bg-muted">Close</button>
              </div>
            </div>
            {jumpOpen && (
              <div className="mb-3 rounded-md border border-border p-2 bg-muted/40">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    value={jumpMonth}
                    onChange={(e) => setJumpMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <option key={idx} value={idx}>{format(new Date(2026, idx, 1), 'MMMM')}</option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    value={jumpYear}
                    onChange={(e) => setJumpYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 11 }).map((_, idx) => {
                      const year = new Date().getFullYear() - 5 + idx;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                <button onClick={jumpToMonthYear} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Jump</button>
              </div>
            )}
            <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (<span key={d}>{d}</span>))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {days.map((day) => {
                const isTodayDate = isToday(day);
                const dayKey = format(day, 'yyyy-MM-dd');
                const hasHoliday = Boolean(holidays[dayKey]);
                const isSelected = dayKey === selectedDateKey;
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`py-1 rounded-md hover:bg-muted transition-colors ${isSelected ? 'ring-1 ring-primary' : ''} ${isTodayDate ? 'bg-primary/10 text-primary font-semibold' : 'bg-surface-elevated'}`}
                    title={hasHoliday ? holidays[dayKey] : undefined}
                  >
                    {format(day, 'd')}
                    {hasHoliday && <span className="block text-[8px] leading-none text-primary">●</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold mb-1"><Calendar className="w-3 h-3" /> Events on {format(selectedDay, 'dd MMM yyyy')}</div>
              {selectedHoliday && <p className="text-xs text-primary mb-1">Holiday: {selectedHoliday}</p>}
              {selectedDateTasks.length === 0 && !selectedHoliday && <p className="text-xs text-muted-foreground">No tasks or holidays on this day.</p>}
              <ul className="space-y-1 max-h-24 overflow-y-auto text-xs">
                {selectedDateTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="truncate">{t.title || 'Untitled task'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
