import crypto from 'crypto';

const IV_LENGTH_BYTES = 12; // AES-GCM recommended 96-bit IV

export function encryptSecret(plainText: string, key: string): string {
  if (!key || key.length < 32) {
    throw new Error('Encryption key missing or too short (min 32 chars)');
  }
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(key).digest(),
    iv
  );
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plainText, 'utf8')),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]);
  return payload.toString('base64');
}

export function decryptSecret(payloadB64: string, key: string): string {
  if (!key || key.length < 32) {
    throw new Error('Encryption key missing or too short (min 32 chars)');
  }
  const payload = Buffer.from(payloadB64, 'base64');
  const iv = payload.subarray(0, IV_LENGTH_BYTES);
  const tag = payload.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
  const ciphertext = payload.subarray(IV_LENGTH_BYTES + 16);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    crypto.createHash('sha256').update(key).digest(),
    iv
  );
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskToken(value: string): string {
  const last4 = value.slice(-4);
  return `**** **** **** ${last4}`;
}
