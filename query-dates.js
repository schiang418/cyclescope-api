import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

async function queryDates() {
  const sql = postgres(DATABASE_URL);
  
  try {
    const snapshots = await sql`
      SELECT 
        id, 
        date::text as date_str,
        created_at::text as created_at_str,
        fusion_asof_date,
        gamma_asof_week,
        delta_asof_date,
        gamma_domains
      FROM daily_snapshots 
      ORDER BY date DESC
    `;
    
    console.log(`Total snapshots in database: ${snapshots.length}\n`);
    
    snapshots.forEach((s, i) => {
      console.log(`${i + 1}. ID: ${s.id}, Date: ${s.date_str}, Created: ${s.created_at_str}`);
      console.log(`   Fusion: ${s.fusion_asof_date || 'null'}, Gamma: ${s.gamma_asof_week || 'null'}, Delta: ${s.delta_asof_date || 'null'}`);
      console.log(`   Gamma Domains: ${s.gamma_domains ? 'YES (' + s.gamma_domains.length + ' domains)' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

queryDates();
