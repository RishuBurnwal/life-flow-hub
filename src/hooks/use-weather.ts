import { useEffect, useMemo, useState } from 'react';

type WeatherUnit = 'c' | 'f';

export interface WeatherState {
  loading: boolean;
  error: string | null;
  tempC: number | null;
  tempF: number | null;
  locationLabel: string;
}

const DEFAULT_COORDS = { latitude: 28.6139, longitude: 77.209 }; // New Delhi fallback

const toF = (c: number) => (c * 9) / 5 + 32;

export function useWeather(enabled: boolean, unit: WeatherUnit, locationHint?: string) {
  const [state, setState] = useState<WeatherState>({
    loading: false,
    error: null,
    tempC: null,
    tempF: null,
    locationLabel: locationHint || 'Local',
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetchWeather = async (latitude: number, longitude: number, label: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null, locationLabel: label }));
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather service unavailable');
        const data = await res.json();
        const c = Number(data?.current?.temperature_2m);
        if (!Number.isFinite(c)) throw new Error('Weather data missing');

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            tempC: c,
            tempF: toF(c),
            locationLabel: label,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Weather error',
          }));
        }
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const label = locationHint || 'Current location';
          void fetchWeather(pos.coords.latitude, pos.coords.longitude, label);
        },
        () => {
          const label = locationHint || 'Fallback weather';
          void fetchWeather(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, label);
        },
        { timeout: 3500 }
      );
    } else {
      const label = locationHint || 'Fallback weather';
      void fetchWeather(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, label);
    }

    return () => {
      cancelled = true;
    };
  }, [enabled, locationHint]);

  const displayTemp = useMemo(() => {
    if (unit === 'f') return state.tempF;
    return state.tempC;
  }, [state.tempC, state.tempF, unit]);

  return {
    ...state,
    displayTemp,
  };
}
