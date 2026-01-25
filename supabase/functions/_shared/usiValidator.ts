/**
 * The specific character set allowed in a USI.
 * Note: 0, 1, I, and O are intentionally excluded.
 */
const validChars = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

/**
 * Internal helper to calculate the expected check digit.
 */
function generateCheckCharacter(input: string): string {
  let factor = 2;
  let sum = 0;
  const n = validChars.length;

  // Work from right to left
  for (let i = input.length - 1; i >= 0; i--) {
    const codePoint = validChars.indexOf(input[i]);

    // Immediate fail if character is not in the allowed set (e.g., '0' or '1')
    if (codePoint === -1) throw new Error('Invalid character in USI');

    let addend = factor * codePoint;

    // Alternate factor between 2 and 1
    factor = factor === 2 ? 1 : 2;

    // Sum digits of addend expressed in base n
    addend = Math.floor(addend / n) + (addend % n);
    sum += addend;
  }

  const remainder = sum % n;
  const checkCodePoint = (n - remainder) % n;

  return validChars[checkCodePoint];
}

/**
 * Validates a USI string against the Luhn Mod N Checksum Algorithm.
 * @param usi - The 10-character USI string to validate.
 * @returns boolean - True if valid, False if invalid format or checksum.
 */
export function verifyUSI(usi: string): boolean {
  // 1. Basic Format Validation
  if (!usi || usi.length !== 10) return false;

  // 2. Checksum Validation
  try {
    const inputUpper = usi.toUpperCase();
    const checkDigit = generateCheckCharacter(inputUpper.substring(0, 9));
    return inputUpper[9] === checkDigit;
  } catch (e) {
    // Catches "Invalid character" errors from the generator
    return false;
  }
}
