const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = 'postgresql://neondb_owner:npg_gQuvcXbjp4C8@ep-royal-tree-amxoj5u0-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('Testing Neon connection...');

const sql = neon(DATABASE_URL);

async function test() {
  try {
    console.log('Attempting query...');
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Failed:', error);
    console.error('Error code:', error.code);
  }
}

test();