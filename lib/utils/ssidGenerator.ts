/**
 * Generates a Software Subscription Identifier (SSID) required for
 * MAS-ST Cloud Host Authentication.
 *
 * Format: 9 random digits + 1 check digit (Sum Mod 10)
 * Total length: 10 digits
 *
 * Algorithm:
 * - Generate 9 random digits (0-9)
 * - Sum all 9 digits
 * - Check digit = Sum % 10
 * - Result = 9 digits + check digit
 *
 * @returns A 10-digit SSID string (preserves leading zeros)
 */
export const generateSSID = (): string => {
  // 1. Generate 9 random digits
  let ssidPrefix = '';
  for (let i = 0; i < 9; i++) {
    ssidPrefix += Math.floor(Math.random() * 10).toString();
  }

  // 2. Calculate Checksum (Sum of digits % 10)
  // Note: This is NOT Luhn. It is a simple Sum Modulo 10 per the MAS-ST spec.
  let sum = 0;
  for (let i = 0; i < ssidPrefix.length; i++) {
    sum += parseInt(ssidPrefix[i], 10);
  }

  const remainder = sum % 10;
  const checkDigit = remainder.toString();

  // 3. Concatenate prefix and check digit
  return ssidPrefix + checkDigit;
};

/**
 * Validates if a given SSID string is valid according to the algorithm.
 * Useful for verifying stored SSIDs.
 *
 * @param ssid - The 10-digit SSID string to validate
 * @returns boolean - True if valid, False if invalid format or checksum
 */
export const validateSSID = (ssid: string): boolean => {
  // 1. Basic Format Validation
  if (!ssid || ssid.length !== 10 || !/^\d+$/.test(ssid)) {
    return false;
  }

  // 2. Extract prefix (first 9 digits) and provided check digit (10th digit)
  const prefix = ssid.substring(0, 9);
  const providedCheckDigit = ssid[9];

  // 3. Calculate expected check digit
  let sum = 0;
  for (let i = 0; i < prefix.length; i++) {
    sum += parseInt(prefix[i], 10);
  }

  const calculatedCheckDigit = (sum % 10).toString();

  // 4. Compare provided vs calculated check digit
  return providedCheckDigit === calculatedCheckDigit;
};
