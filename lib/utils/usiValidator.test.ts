import { verifyUSI } from './usiValidator';

/**
 * Simple test runner for USI validator
 * Can be run with: tsx lib/utils/usiValidator.test.ts
 * Or adapted to Vitest/Jest if a testing framework is added
 */

interface TestCase {
  name: string;
  input: string;
  expected: boolean;
  reason: string;
}

const testCases: TestCase[] = [
  {
    name: 'Valid USI - 7QRP3KV395',
    input: '7QRP3KV395',
    expected: true,
    reason: 'Extracted from USI Test Data',
  },
  {
    name: 'Valid USI - UDNM3W6KUS',
    input: 'UDNM3W6KUS',
    expected: true,
    reason: 'Extracted from USI Test Data',
  },
  {
    name: 'Invalid Length - Too Short',
    input: '7QRP3KV39',
    expected: false,
    reason: 'Too short (9 characters instead of 10)',
  },
  {
    name: 'Invalid Length - Too Long',
    input: '7QRP3KV3955',
    expected: false,
    reason: 'Too long (11 characters instead of 10)',
  },
  {
    name: 'Forbidden Char - Contains Zero',
    input: '7QRP3KV390',
    expected: false,
    reason: "Contains '0' (Zero) which is excluded from valid character set",
  },
  {
    name: 'Forbidden Char - Contains One',
    input: '7QRP3KV391',
    expected: false,
    reason: "Contains '1' (One) which is excluded from valid character set",
  },
  {
    name: 'Bad Checksum',
    input: '7QRP3KV39A',
    expected: false,
    reason: 'Valid characters, but checksum is incorrect',
  },
  {
    name: 'Case Sensitivity - Lowercase',
    input: '7qrp3kv395',
    expected: true,
    reason: 'Should handle lowercase input by converting to uppercase',
  },
];

function runTests() {
  let passed = 0;
  let failed = 0;

  console.log('Running USI Validator Tests...\n');

  for (const testCase of testCases) {
    const result = verifyUSI(testCase.input);
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

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed!');
  }
}

// Run tests if this file is executed directly
// Works with both CommonJS and ES modules when run with tsx
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
} else if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testCases, runTests };
