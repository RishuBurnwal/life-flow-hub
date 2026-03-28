import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { addSeconds, format } from 'date-fns';
import { Calendar, Settings2 } from 'lucide-react';
import { useStore } from '@/stores/useStore';

type ClockSkin = 'minimal' | 'retro' | 'glass' | 'neon' | 'bold' | 'dots';

const digitalVariants = {
  initial: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' },
  hover: { scale: 1.08, boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.12)' },
  tap: { scale: 0.98 },
};

const analogVariants = {
  initial: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' },
  hover: { scale: 1.1, boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.12)' },
  tap: { scale: 0.98 },
};

const formatTime = (date: Date, format24h: boolean) =>
  format(date, format24h ? 'HH:mm:ss' : 'hh:mm:ss a');

const formatDate = (date: Date) => format(date, 'EEEE, MMM d, yyyy');

const getZonedDate = (now: Date, tz: string) =>
  new Date(now.toLocaleString('en-US', { timeZone: tz }));

const getZoneAbbrev = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
  } catch (e) {
    return timezone;
  }
};

interface ClockWidgetProps {
  timezone: string;
  label: string;
  format24h: boolean;
  skin: ClockSkin;
  secondaryTime?: string | null;
  showAnalog?: boolean;
  compact?: boolean;
  locationLabel?: string;
  onOpenCalendar: (anchor: DOMRect, tz: string) => void;
  onOpenSettings?: (anchor: DOMRect, tz: string) => void;
}

export function ClockWidget({
  timezone,
  label,
  format24h,
  skin,
  secondaryTime,
  showAnalog,
  compact,
  locationLabel,
  onOpenCalendar,
  onOpenSettings,
}: ClockWidgetProps) {
  const [now, setNow] = useState(new Date());
  const zoneAbbrev = useMemo(() => getZoneAbbrev(timezone), [timezone]);

  useEffect(() => {
    const interval = setInterval(() => setNow((prev) => addSeconds(prev, 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const zoned = getZonedDate(now, timezone);
  const hours = zoned.getHours() % 12;
  const minutes = zoned.getMinutes();
  const seconds = zoned.getSeconds();
  const hourDeg = hours * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    onOpenCalendar(rect, timezone);
  };

  const handleOpenSettings = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onOpenSettings) return;
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    onOpenSettings(rect, timezone);
  };

  const digitalClass = (() => {
    switch (skin) {
      case 'retro':
        return 'bg-neutral-900 text-green-400 border border-green-500/30 shadow-md';
      case 'glass':
        return 'bg-white/30 backdrop-blur-lg text-foreground border border-white/40 shadow-md';
      case 'neon':
        return 'bg-neutral-950 text-primary border border-primary/40 shadow-[0_0_12px_rgba(212,149,106,0.35)]';
      case 'bold':
        return 'bg-surface-elevated text-foreground border border-border shadow-lg';
      default:
        return 'bg-surface-elevated text-foreground border border-border shadow-sm';
    }
  })();

  const analogFace = (() => {
    switch (skin) {
      case 'retro':
        return 'bg-neutral-900 text-green-400';
      case 'glass':
        return 'bg-white/40 backdrop-blur';
      case 'neon':
        return 'bg-neutral-950 text-primary drop-shadow-[0_0_12px_rgba(212,149,106,0.35)]';
      case 'bold':
        return 'bg-surface-elevated text-foreground';
      case 'dots':
        return 'bg-surface-elevated text-foreground';
      default:
        return 'bg-surface-elevated text-foreground';
    }
  })();

  return (
    <div className="relative">
      <motion.button
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        variants={showAnalog ? analogVariants : digitalVariants}
        onClick={handleClick}
        className={`relative flex items-center gap-2.5 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} rounded-xl transition-all cursor-pointer select-none ${showAnalog ? 'bg-surface-elevated' : digitalClass}`}
        aria-label={`Clock ${label}`}
      >
        {showAnalog ? (
          <div className={`${compact ? 'w-12 h-12' : 'w-14 h-14'} relative rounded-full border border-border shadow-md ${analogFace}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {[...Array(12)].map((_, idx) => (
              <line
                key={idx}
                x1="50"
                y1="10"
                x2="50"
                y2={idx % 3 === 0 ? '18' : '15'}
                stroke="currentColor"
                strokeWidth={idx % 3 === 0 ? 2.5 : 1}
                transform={`rotate(${idx * 30} 50 50)`}
                className="text-border"
              />
            ))}
            <line x1="50" y1="50" x2="50" y2="24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-foreground" transform={`rotate(${hourDeg} 50 50)`} />
            <line x1="50" y1="50" x2="50" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-foreground" transform={`rotate(${minuteDeg} 50 50)`} />
            <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary" transform={`rotate(${secondDeg} 50 50)`} />
            <circle cx="50" cy="50" r="3" fill="currentColor" className="text-primary" />
          </svg>
          </div>
        ) : (
          <div className="flex flex-col items-start min-w-[140px]">
            <div className={`${compact ? 'text-base' : 'text-lg'} font-semibold tabular-nums leading-tight flex items-baseline gap-1`}>
              <span>{formatTime(zoned, format24h)}</span>
              <span className="text-[11px] text-muted-foreground font-medium">{zoneAbbrev}</span>
            </div>
            {secondaryTime && (
              <div className="text-[11px] text-text-tertiary tabular-nums">{secondaryTime}</div>
            )}
            <div className="text-[11px] text-text-tertiary">{formatDate(zoned)}</div>
          </div>
        )}
        <div className="flex flex-col items-start gap-0.5 min-w-[120px]">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-[11px] text-text-tertiary truncate max-w-[180px]">{locationLabel || timezone}</span>
          <span className="text-[11px] text-text-tertiary flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Click to open calendar
          </span>
        </div>
      </motion.button>
      {onOpenSettings && (
        <button
          type="button"
          onClick={handleOpenSettings}
          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-background/75 hover:bg-muted text-muted-foreground"
          title={`Settings for ${label}`}
          aria-label={`Settings for ${label}`}
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
