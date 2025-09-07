#!/usr/bin/env node

/**
 * Test database connection and basic queries
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test if programs table exists and has data
    const programsResult = await client.query('SELECT COUNT(*) FROM core.programs');
    console.log(`📊 Programs table has ${programsResult.rows[0].count} records`);
    
    // Test if agents table exists and has data
    const agentsResult = await client.query('SELECT COUNT(*) FROM core.agents');
    console.log(`👥 Agents table has ${agentsResult.rows[0].count} records`);
    
    // Test if reference data exists
    const refResult = await client.query('SELECT COUNT(*) FROM avetmiss.reference_codes');
    console.log(`📋 Reference codes table has ${refResult.rows[0].count} records`);
    
    client.release();
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
