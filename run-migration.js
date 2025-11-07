import postgres from 'postgres';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
  const sql = postgres(DATABASE_URL);
  
  try {
    const migrationSQL = readFileSync('/home/ubuntu/cyclescope-api-github/drizzle/migrations/0001_alter_date_column.sql', 'utf8');
    
    console.log('Running migration...\n');
    console.log(migrationSQL);
    console.log('\n---\n');
    
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the result
    const snapshots = await sql`
      SELECT id, date::text as date_str, created_at::text as created_at_str
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    
    console.log('\nCurrent snapshots:');
    snapshots.forEach(s => {
      console.log(`  ID: ${s.id}, Date: ${s.date_str}, Created: ${s.created_at_str}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await sql.end();
  }
}

runMigration();
