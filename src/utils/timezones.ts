export interface TimezoneOption {
  code: string;
  label: string;
  location: string;
  offset: string; // e.g., "+05:30"
  offsetMinutes: number;
}

// Comprehensive GMT/UTC offset timezones
export const GMT_TIMEZONES: TimezoneOption[] = [
  { code: 'Etc/GMT+12', label: 'GMT-12:00', location: 'Baker Island', offset: '-12:00', offsetMinutes: -720 },
  { code: 'Etc/GMT+11', label: 'GMT-11:00', location: 'American Samoa', offset: '-11:00', offsetMinutes: -660 },
  { code: 'Etc/GMT+10', label: 'GMT-10:00', location: 'Hawaii', offset: '-10:00', offsetMinutes: -600 },
  { code: 'Etc/GMT+9', label: 'GMT-09:00', location: 'Alaska', offset: '-09:00', offsetMinutes: -540 },
  { code: 'America/Los_Angeles', label: 'GMT-08:00', location: 'Pacific Time (US & Canada)', offset: '-08:00', offsetMinutes: -480 },
  { code: 'America/Denver', label: 'GMT-07:00', location: 'Mountain Time (US & Canada)', offset: '-07:00', offsetMinutes: -420 },
  { code: 'America/Chicago', label: 'GMT-06:00', location: 'Central Time (US & Canada)', offset: '-06:00', offsetMinutes: -360 },
  { code: 'America/New_York', label: 'GMT-05:00', location: 'Eastern Time (US & Canada)', offset: '-05:00', offsetMinutes: -300 },
  { code: 'America/Caracas', label: 'GMT-04:30', location: 'Venezuela', offset: '-04:30', offsetMinutes: -270 },
  { code: 'America/Halifax', label: 'GMT-04:00', location: 'Atlantic Time', offset: '-04:00', offsetMinutes: -240 },
  { code: 'America/St_Johns', label: 'GMT-03:30', location: 'Newfoundland', offset: '-03:30', offsetMinutes: -210 },
  { code: 'America/Sao_Paulo', label: 'GMT-03:00', location: 'Brasília Time', offset: '-03:00', offsetMinutes: -180 },
  { code: 'Atlantic/South_Georgia', label: 'GMT-02:00', location: 'South Georgia', offset: '-02:00', offsetMinutes: -120 },
  { code: 'Atlantic/Azores', label: 'GMT-01:00', location: 'Azores', offset: '-01:00', offsetMinutes: -60 },
  { code: 'Etc/UTC', label: 'GMT+00:00', location: 'Greenwich, UTC', offset: '+00:00', offsetMinutes: 0 },
  { code: 'Europe/London', label: 'GMT+00:00', location: 'United Kingdom', offset: '+00:00', offsetMinutes: 0 },
  { code: 'Europe/Paris', label: 'GMT+01:00', location: 'Central European Time', offset: '+01:00', offsetMinutes: 60 },
  { code: 'Europe/Berlin', label: 'GMT+01:00', location: 'Berlin', offset: '+01:00', offsetMinutes: 60 },
  { code: 'Africa/Cairo', label: 'GMT+02:00', location: 'Cairo', offset: '+02:00', offsetMinutes: 120 },
  { code: 'Africa/Johannesburg', label: 'GMT+02:00', location: 'Johannesburg', offset: '+02:00', offsetMinutes: 120 },
  { code: 'Europe/Moscow', label: 'GMT+03:00', location: 'Moscow', offset: '+03:00', offsetMinutes: 180 },
  { code: 'Asia/Dubai', label: 'GMT+04:00', location: 'Dubai', offset: '+04:00', offsetMinutes: 240 },
  { code: 'Asia/Kabul', label: 'GMT+04:30', location: 'Afghanistan', offset: '+04:30', offsetMinutes: 270 },
  { code: 'Asia/Kolkata', label: 'GMT+05:30', location: 'India Standard Time', offset: '+05:30', offsetMinutes: 330 },
  { code: 'Asia/Kathmandu', label: 'GMT+05:45', location: 'Nepal', offset: '+05:45', offsetMinutes: 345 },
  { code: 'Asia/Bangkok', label: 'GMT+07:00', location: 'Bangkok', offset: '+07:00', offsetMinutes: 420 },
  { code: 'Asia/Singapore', label: 'GMT+08:00', location: 'Singapore', offset: '+08:00', offsetMinutes: 480 },
  { code: 'Asia/Shanghai', label: 'GMT+08:00', location: 'China', offset: '+08:00', offsetMinutes: 480 },
  { code: 'Asia/Manila', label: 'GMT+08:00', location: 'Philippines', offset: '+08:00', offsetMinutes: 480 },
  { code: 'Asia/Tokyo', label: 'GMT+09:00', location: 'Japan', offset: '+09:00', offsetMinutes: 540 },
  { code: 'Australia/Sydney', label: 'GMT+10:00', location: 'Sydney', offset: '+10:00', offsetMinutes: 600 },
  { code: 'Pacific/Auckland', label: 'GMT+12:00', location: 'New Zealand', offset: '+12:00', offsetMinutes: 720 },
];

// Preset timezones
export const TZ_PRESETS = [
  { code: 'Etc/UTC', label: 'GMT', location: 'Greenwich, United Kingdom' },
  { code: 'Asia/Kolkata', label: 'IST', location: 'India, Kolkata' },
  { code: 'America/Los_Angeles', label: 'PST', location: 'United States, Los Angeles' },
  { code: 'America/New_York', label: 'EST', location: 'United States, New York' },
];

export const CLOCK_SKINS = ['minimal', 'retro', 'glass', 'neon', 'bold', 'dots'] as const;
export const WATCH_FORMATS: Array<'digital' | 'analog' | 'hybrid'> = ['digital', 'analog', 'hybrid'];

export const getTimezoneOffset = (timezone: string): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const localParts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    
    const tzTime = parts.filter(p => ['hour', 'minute', 'second'].includes(p.type))
      .map(p => p.value).join(':');
    const localTime = localParts.filter(p => ['hour', 'minute', 'second'].includes(p.type))
      .map(p => p.value).join(':');
    
    const [tzH, tzM] = tzTime.split(':').map(Number);
    const [lH, lM] = localTime.split(':').map(Number);
    
    let diffMins = (tzH - lH) * 60 + (tzM - lM);
    if (diffMins > 12 * 60) diffMins -= 24 * 60;
    if (diffMins < -12 * 60) diffMins += 24 * 60;
    
    const sign = diffMins >= 0 ? '+' : '-';
    const absMin = Math.abs(diffMins);
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  } catch {
    return '+00:00';
  }
};
