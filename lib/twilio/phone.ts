export function normalizeE164(raw: string): string {
  const s = (raw || '').trim();
  const withoutPrefix = s.startsWith('whatsapp:')
    ? s.replace('whatsapp:', '')
    : s;
  if (!/^\+\d{6,15}$/.test(withoutPrefix)) {
    throw new Error('Invalid E.164 phone number');
  }
  return withoutPrefix;
}
