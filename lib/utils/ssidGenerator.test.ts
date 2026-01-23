import { generateSSID, validateSSID } from './ssidGenerator';

/**
 * Simple test runner for SSID generator
 * Can be run with: tsx lib/utils/ssidGenerator.test.ts
 * Or adapted to Vitest/Jest if a testing framework is added
 */

interface ValidationTestCase {
  name: string;
  input: string;
  expected: boolean;
  reason: string;
}

const validationTestCases: ValidationTestCase[] = [
  {
    name: 'Spec Example 1 - Valid SSID',
    input: '0000000011',
    expected: true,
    reason: 'Prefix: 000000001, Sum: 1, Mod 10: 1, SSID: 0000000011',
  },
  {
    name: 'Spec Example 2 - Valid SSID',
    input: '0004785936',
    expected: true,
    reason: 'Prefix: 000478593, Sum: 36, Mod 10: 6, SSID: 0004785936',
  },
  {
    name: 'Spec Example 3 - Valid SSID',
    input: '0000000022',
    expected: true,
    reason: 'Prefix: 000000002, Sum: 2, Mod 10: 2, SSID: 0000000022',
  },
  {
    name: 'Invalid Checksum - Tampered',
    input: '0004785937',
    expected: false,
    reason: 'Valid format but checksum digit changed from 6 to 7',
  },
  {
    name: 'Invalid Checksum - Another Tampered',
    input: '0000000019',
    expected: false,
    reason: 'Valid format but checksum digit changed from 1 to 9',
  },
  {
    name: 'Invalid Length - Too Short (9 digits)',
    input: '000478593',
    expected: false,
    reason: 'Too short (9 digits instead of 10)',
  },
  {
    name: 'Invalid Length - Too Long (11 digits)',
    input: '00047859361',
    expected: false,
    reason: 'Too long (11 digits instead of 10)',
  },
  {
    name: 'Invalid Format - Non-numeric',
    input: '000478593a',
    expected: false,
    reason: 'Contains non-numeric character',
  },
  {
    name: 'Invalid Format - Empty string',
    input: '',
    expected: false,
    reason: 'Empty string is invalid',
  },
  {
    name: 'Invalid Format - All zeros',
    input: '0000000000',
    expected: true,
    reason: 'Valid: Prefix 000000000, Sum: 0, Mod 10: 0',
  },
  {
    name: 'Valid Format - All nines',
    input: '9999999991',
    expected: true,
    reason: 'Valid: Prefix 999999999, Sum: 81, Mod 10: 1, SSID: 9999999991',
  },
];

/**
 * Test generation function
 */
function testGeneration() {
  console.log('\nTesting SSID Generation...\n');

  const generatedSSIDs: string[] = [];
  let passed = 0;
  let failed = 0;

  // Generate 10 SSIDs and validate each
  for (let i = 0; i < 10; i++) {
    const ssid = generateSSID();

    // Test 1: Length must be exactly 10
    if (ssid.length !== 10) {
      failed++;
      console.error(`✗ Generation Test ${i + 1} - Length`);
      console.error(`  Generated: "${ssid}"`);
      console.error(`  Expected length: 10, Got: ${ssid.length}`);
      continue;
    }

    // Test 2: All characters must be numeric
    if (!/^\d+$/.test(ssid)) {
      failed++;
      console.error(`✗ Generation Test ${i + 1} - Numeric`);
      console.error(`  Generated: "${ssid}"`);
      console.error(`  Contains non-numeric characters`);
      continue;
    }

    // Test 3: Checksum must be valid
    if (!validateSSID(ssid)) {
      failed++;
      console.error(`✗ Generation Test ${i + 1} - Checksum`);
      console.error(`  Generated: "${ssid}"`);
      console.error(`  Checksum validation failed`);
      continue;
    }

    // Test 4: Should be unique (very unlikely to have duplicates in 10 tries, but check anyway)
    if (generatedSSIDs.includes(ssid)) {
      failed++;
      console.error(`✗ Generation Test ${i + 1} - Uniqueness`);
      console.error(`  Generated: "${ssid}"`);
      console.error(`  Duplicate detected (unlikely but possible)`);
      continue;
    }

    generatedSSIDs.push(ssid);
    passed++;
    console.log(`✓ Generation Test ${i + 1} - Valid SSID: ${ssid}`);
  }

  console.log(`\nGeneration Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

function runValidationTests() {
  let passed = 0;
  let failed = 0;

  console.log('Running SSID Validation Tests...\n');

  for (const testCase of validationTestCases) {
    const result = validateSSID(testCase.input);
    const success = result === testCase.expected;

    if (success) {
      passed++;
      console.log(`✓ ${testCase.name}`);
    } else {
      failed++;
      console.error(`✗ ${testCase.name}`);
      console.error(`  Input: "${testCase.input}"`);
      console.error(`  Expected: ${testCase.expected}, Got: ${result}`);
      console.error(`  Reason: ${testCase.reason}`);
    }
  }

  console.log(`\nValidation Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

function runTests() {
  console.log('========================================');
  console.log('SSID Generator Test Suite');
  console.log('========================================\n');

  const validationResults = runValidationTests();
  const generationResults = testGeneration();

  const totalPassed = validationResults.passed + generationResults.passed;
  const totalFailed = validationResults.failed + generationResults.failed;

  console.log('\n========================================');
  console.log(`Total Results: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('========================================');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
  }
}

// Run tests if this file is executed directly
// Works with both CommonJS and ES modules when run with tsx
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
} else if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { validationTestCases, testGeneration, runValidationTests, runTests };
