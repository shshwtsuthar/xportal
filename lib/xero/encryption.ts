/**
 * Xero Token Encryption Utility
 *
 * Encrypts and decrypts Xero OAuth tokens for secure storage in the database.
 * Uses AES-256-CBC encryption with a key derived from environment variables.
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.XERO_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for AES

if (!ENCRYPTION_KEY) {
  console.warn(
    'XERO_ENCRYPTION_KEY not set. Token encryption will fail. Set a 32-byte key in environment variables.'
  );
}

/**
 * Encrypts a token string for secure storage.
 * @param token - The plaintext token to encrypt
 * @returns Encrypted token in format: iv:encryptedData (hex encoded)
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('XERO_ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure key is exactly 32 bytes (256 bits)
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an encrypted token string.
 * @param encryptedToken - The encrypted token in format: iv:encryptedData (hex encoded)
 * @returns Decrypted plaintext token
 */
export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('XERO_ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure key is exactly 32 bytes (256 bits)
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'), 'utf8');

  const parts = encryptedToken.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
