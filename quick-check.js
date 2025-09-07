#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function quickCheck() {
  try {
    const client = await pool.connect();
    
    // Check if reference data exists
    const result = await client.query('SELECT COUNT(*) FROM avetmiss.codes');
    console.log(`📊 Total codes in avetmiss.codes: ${result.rows[0].count}`);
    
    // Check programs
    const programsResult = await client.query('SELECT COUNT(*) FROM core.programs');
    console.log(`📚 Total programs: ${programsResult.rows[0].count}`);
    
    // Check agents
    const agentsResult = await client.query('SELECT COUNT(*) FROM core.agents');
    console.log(`👥 Total agents: ${agentsResult.rows[0].count}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

quickCheck();
