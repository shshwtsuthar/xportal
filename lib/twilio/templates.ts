export function isValidTemplateSid(sid: string): boolean {
  // Twilio template identifiers vary; basic sanity check for non-empty and allowed chars
  return /^[A-Za-z0-9_\-:.]{6,}$/.test((sid || '').trim());
}
