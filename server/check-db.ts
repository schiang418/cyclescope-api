import postgres from 'postgres';

async function checkDatabase() {
  console.log('='.repeat(60));
  console.log('Checking Database Content');
  console.log('='.repeat(60));
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }
  
  console.log(`\nDatabase URL: ${databaseUrl.substring(0, 30)}...`);
  
  try {
    const sql = postgres(databaseUrl);
    
    // Check if table exists
    console.log('\n1. Checking if daily_snapshots table exists...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'daily_snapshots'
    `;
    
    if (tables.length === 0) {
      console.log('   ❌ Table daily_snapshots does not exist!');
      await sql.end();
      process.exit(1);
    }
    
    console.log('   ✓ Table daily_snapshots exists');
    
    // Count total rows
    console.log('\n2. Counting total rows...');
    const countResult = await sql`SELECT COUNT(*) as count FROM daily_snapshots`;
    const totalRows = parseInt(countResult[0].count);
    console.log(`   Total rows: ${totalRows}`);
    
    if (totalRows === 0) {
      console.log('\n   ❌ No data in database!');
      await sql.end();
      process.exit(0);
    }
    
    // Get latest entry
    console.log('\n3. Fetching latest entry...');
    const latest = await sql`
      SELECT 
        id,
        date,
        gamma_asof_week,
        gamma_cycle_stage_primary,
        gamma_headline_summary,
        delta_fragility_label,
        fusion_cycle_stage,
        created_at,
        updated_at
      FROM daily_snapshots 
      ORDER BY date DESC 
      LIMIT 1
    `;
    
    if (latest.length > 0) {
      const entry = latest[0];
      console.log('\n   ✓ Latest entry found:');
      console.log(`   ID: ${entry.id}`);
      console.log(`   Date: ${entry.date}`);
      console.log(`   Gamma As-of Week: ${entry.gamma_asof_week || 'NULL'}`);
      console.log(`   Gamma Cycle Stage: ${entry.gamma_cycle_stage_primary || 'NULL'}`);
      console.log(`   Gamma Summary: ${entry.gamma_headline_summary ? entry.gamma_headline_summary.substring(0, 100) + '...' : 'NULL'}`);
      console.log(`   Delta Fragility: ${entry.delta_fragility_label || 'NULL'}`);
      console.log(`   Fusion Cycle Stage: ${entry.fusion_cycle_stage || 'NULL'}`);
      console.log(`   Created At: ${entry.created_at}`);
      console.log(`   Updated At: ${entry.updated_at}`);
    }
    
    // Get all dates
    console.log('\n4. All dates in database:');
    const allDates = await sql`
      SELECT date, created_at, updated_at 
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    
    allDates.forEach((row, index) => {
      console.log(`   ${index + 1}. Date: ${row.date}, Created: ${row.created_at}, Updated: ${row.updated_at}`);
    });
    
    await sql.end();
    
    console.log('\n' + '='.repeat(60));
    console.log('Database Check Complete');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack:`, error.stack);
    process.exit(1);
  }
}

checkDatabase();

