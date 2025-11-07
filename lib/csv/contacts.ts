import { normalizeE164 } from '@/lib/twilio/phone';

export type CsvContact = { name: string; phone: string };
export type CsvParseResult = { rows: CsvContact[]; errors: string[] };

export function parseNamePhoneCsv(text: string): CsvParseResult {
  const lines = (text || '').split(/\r?\n/).filter(Boolean);
  const rows: CsvContact[] = [];
  const errors: string[] = [];
  lines.forEach((line, idx) => {
    const parts = line.split(',');
    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: Expected "Name,Phone"`);
      return;
    }
    const name = parts[0].trim();
    const phoneRaw = parts.slice(1).join(',').trim();
    try {
      const phone = normalizeE164(phoneRaw);
      rows.push({ name, phone });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Line ${idx + 1}: ${msg}`);
    }
  });
  return { rows, errors };
}
