#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function checkReferenceData() {
  try {
    const client = await pool.connect();
    
    // Check what code types exist
    const result = await client.query(`
      SELECT DISTINCT code_type, COUNT(*) as count
      FROM avetmiss.codes 
      WHERE is_active = true
      GROUP BY code_type
      ORDER BY code_type
    `);
    
    console.log('📋 Available reference code types:');
    result.rows.forEach(row => {
      console.log(`  ${row.code_type}: ${row.count} codes`);
    });
    
    // Check if we have the expected code types
    const expectedTypes = ['COUNTRY', 'LANGUAGE', 'DisabilityType', 'PriorEducationalAchievement', 'FundingSourceNational', 'StudyReason'];
    console.log('\n🔍 Checking for expected code types:');
    expectedTypes.forEach(type => {
      const found = result.rows.find(row => row.code_type === type);
      if (found) {
        console.log(`  ✅ ${type}: ${found.count} codes`);
      } else {
        console.log(`  ❌ ${type}: NOT FOUND`);
      }
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkReferenceData();
