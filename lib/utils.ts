import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Lightweight client-side telemetry for UX signals
type TelemetryEvent = {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
};

const TELEMETRY_KEY = 'telemetry-buffer';

export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(TELEMETRY_KEY);
  const list: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
  list.push({ name, properties, timestamp: Date.now() });
  const capped = list.slice(-200);
  window.localStorage.setItem(TELEMETRY_KEY, JSON.stringify(capped));
};

export const flushTelemetry = () => {
  if (typeof window === 'undefined') return [] as TelemetryEvent[];
  const raw = window.localStorage.getItem(TELEMETRY_KEY);
  if (!raw) return [] as TelemetryEvent[];
  const events = JSON.parse(raw) as TelemetryEvent[];
  window.localStorage.removeItem(TELEMETRY_KEY);
  return events;
};

// Supabase Edge Function headers (browser-safe)
export const getFunctionHeaders = () => {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (anon) {
    headers['Authorization'] = `Bearer ${anon}`;
    headers['apikey'] = anon;
  }
  return headers;
};
