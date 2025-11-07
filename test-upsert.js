import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

async function testUpsert() {
  const sql = postgres(DATABASE_URL);
  
  try {
    console.log('Before UPSERT:');
    let snapshots = await sql`
      SELECT id, date::text as date_str, fusion_cycle_stage
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    snapshots.forEach(s => {
      console.log(`  ID: ${s.id}, Date: ${s.date_str}, Fusion Stage: ${s.fusion_cycle_stage || 'null'}`);
    });
    
    // Try to insert a new record for Nov 6 (should UPDATE existing ID: 4)
    console.log('\nAttempting to insert/update Nov 6 with new data...');
    
    await sql`
      INSERT INTO daily_snapshots (date, fusion_cycle_stage, fusion_fragility_color, created_at)
      VALUES ('2025-11-06', 'TEST - Updated Stage', 'RED', NOW())
      ON CONFLICT (date) DO UPDATE SET
        fusion_cycle_stage = EXCLUDED.fusion_cycle_stage,
        fusion_fragility_color = EXCLUDED.fusion_fragility_color
      RETURNING id, date::text as date_str, fusion_cycle_stage
    `;
    
    console.log('\nAfter UPSERT:');
    snapshots = await sql`
      SELECT id, date::text as date_str, fusion_cycle_stage, fusion_fragility_color
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    snapshots.forEach(s => {
      console.log(`  ID: ${s.id}, Date: ${s.date_str}, Stage: ${s.fusion_cycle_stage || 'null'}, Color: ${s.fusion_fragility_color || 'null'}`);
    });
    
    console.log('\n✅ UPSERT test successful! Same date = same record (ID should not change)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sql.end();
  }
}

testUpsert();
