import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkDates() {
  const sql = postgres(DATABASE_URL);
  
  try {
    const snapshots = await sql`
      SELECT 
        id, 
        date,
        date::text as date_str,
        created_at::text as created_at_str
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    
    console.log('Date comparison:\n');
    
    snapshots.forEach((s) => {
      console.log(`ID: ${s.id}`);
      console.log(`  date (raw): ${s.date}`);
      console.log(`  date (string): ${s.date_str}`);
      console.log(`  date (ISO): ${s.date instanceof Date ? s.date.toISOString() : 'N/A'}`);
      console.log(`  created_at: ${s.created_at_str}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkDates();
