#!/usr/bin/env node

/**
 * XPortal SMS API - Endpoint Testing Script
 * 
 * This script provides a quick way to test all API endpoints
 * without using Postman. Run with: node test-endpoints.js
 */

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const headers = {
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Utility function to make HTTP requests
async function makeRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { response, data, success: response.ok };
  } catch (error) {
    return { error: error.message, success: false };
  }
}

// Test function wrapper
async function test(name, testFn) {
  results.total++;
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`✅ PASSED: ${name}`);
      results.passed++;
    } else {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      results.failed++;
      results.errors.push({ name, error: result.error });
    }
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.errors.push({ name, error: error.message });
  }
}

// Individual test functions
async function testSmokeTest() {
  const result = await makeRequest('GET', '/smoke-test');
  if (!result.success) return result;
  
  if (result.data.message && result.data.message.includes('healthy')) {
    return { success: true };
  }
  return { success: false, error: 'Health check failed' };
}

async function testListPrograms() {
  const result = await makeRequest('GET', '/programs');
  if (!result.success) return result;
  
  if (Array.isArray(result.data) && result.data.length > 0) {
    const program = result.data[0];
    if (program.id && program.program_name && program.program_code) {
      return { success: true, data: program };
    }
  }
  return { success: false, error: 'Invalid program data structure' };
}

async function testListAgents() {
  const result = await makeRequest('GET', '/agents');
  if (!result.success) return result;
  
  if (Array.isArray(result.data)) {
    return { success: true };
  }
  return { success: false, error: 'Invalid agents data structure' };
}

async function testReferenceData() {
  const codeTypes = ['COUNTRY', 'LANGUAGE', 'DISABILITY_TYPE', 'PRIOR_EDUCATION', 'FUNDING_SOURCE', 'STUDY_REASON'];
  
  for (const codeType of codeTypes) {
    const result = await makeRequest('GET', `/reference-data/${codeType}`);
    if (!result.success) {
      return { success: false, error: `Failed to get ${codeType} data` };
    }
    
    if (!Array.isArray(result.data)) {
      return { success: false, error: `Invalid ${codeType} data structure` };
    }
  }
  
  return { success: true };
}

async function testListClients() {
  const result = await makeRequest('GET', '/clients');
  if (!result.success) return result;
  
  if (Array.isArray(result.data)) {
    return { success: true };
  }
  return { success: false, error: 'Invalid clients data structure' };
}

async function testListApplications() {
  const result = await makeRequest('GET', '/applications');
  if (!result.success) return result;
  
  if (Array.isArray(result.data)) {
    return { success: true };
  }
  return { success: false, error: 'Invalid applications data structure' };
}

async function testListCourseOfferings() {
  const result = await makeRequest('GET', '/course-offerings');
  if (!result.success) return result;
  
  if (Array.isArray(result.data)) {
    return { success: true };
  }
  return { success: false, error: 'Invalid course offerings data structure' };
}

async function testErrorHandling() {
  // Test invalid UUID
  const result = await makeRequest('GET', '/programs/invalid-uuid');
  if (result.success) {
    return { success: false, error: 'Should have failed with invalid UUID' };
  }
  
  if (result.response && result.response.status === 400) {
    return { success: true };
  }
  
  return { success: false, error: 'Invalid error response for bad UUID' };
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting XPortal SMS API Endpoint Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('=' .repeat(50));

  // Run all tests
  await test('Smoke Test', testSmokeTest);
  await test('List Programs', testListPrograms);
  await test('List Agents', testListAgents);
  await test('Reference Data (All Types)', testReferenceData);
  await test('List Clients', testListClients);
  await test('List Applications', testListApplications);
  await test('List Course Offerings', testListCourseOfferings);
  await test('Error Handling', testErrorHandling);

  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.total}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.errors.forEach(({ name, error }) => {
      console.log(`   • ${name}: ${error}`);
    });
  }

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Your API is ready for the New Application Wizard!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check your Supabase setup.');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ or a fetch polyfill');
  process.exit(1);
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});
