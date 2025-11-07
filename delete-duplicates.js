import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

async function deleteDuplicates() {
  const sql = postgres(DATABASE_URL);
  
  try {
    // Delete ID: 1 (older Nov 5 record with timestamp)
    const result = await sql`
      DELETE FROM daily_snapshots 
      WHERE id = 1
      RETURNING id, date::text as date_str
    `;
    
    console.log('Deleted record:');
    result.forEach(r => {
      console.log(`  ID: ${r.id}, Date: ${r.date_str}`);
    });
    
    // Show remaining records
    const remaining = await sql`
      SELECT id, date::text as date_str, created_at::text as created_at_str
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    
    console.log('\nRemaining records:');
    remaining.forEach(r => {
      console.log(`  ID: ${r.id}, Date: ${r.date_str}, Created: ${r.created_at_str}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

deleteDuplicates();
