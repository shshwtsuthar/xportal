#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function checkTables() {
  try {
    const client = await pool.connect();
    
    // Check all schemas and tables
    const result = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname IN ('core', 'avetmiss', 'sms_op', 'cricos', 'security')
      ORDER BY schemaname, tablename
    `);
    
    console.log('📋 Available tables:');
    result.rows.forEach(row => {
      console.log(`  ${row.schemaname}.${row.tablename}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
