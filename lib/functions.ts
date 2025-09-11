// lib/functions.ts
// Centralized configuration for Supabase Edge Function calls

export const FUNCTIONS_URL: string =
  (process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : 'http://127.0.0.1:54321/functions/v1');

type HeadersRecord = Record<string, string>;

export const getFunctionHeaders = (overrides?: HeadersRecord): HeadersRecord => {
  const headers: HeadersRecord = {
  };

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anon) headers['apikey'] = anon;

  // If the application wires in a session token elsewhere, it can be merged via overrides
  return { ...headers, ...(overrides ?? {}) };
};


