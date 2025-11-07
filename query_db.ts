import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { dailySnapshots } from './drizzle/schema';
import { desc } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

const result = await db.select({
  date: dailySnapshots.date,
  createdAt: dailySnapshots.createdAt,
  updatedAt: dailySnapshots.updatedAt,
  deltaFragilityScore: dailySnapshots.deltaFragilityScore,
  deltaFragilityLabel: dailySnapshots.deltaFragilityLabel,
  deltaTemplateCode: dailySnapshots.deltaTemplateCode,
  deltaBreadth: dailySnapshots.deltaBreadth,
  deltaLiquidity: dailySnapshots.deltaLiquidity,
  deltaVolatility: dailySnapshots.deltaVolatility,
  deltaLeadership: dailySnapshots.deltaLeadership,
})
.from(dailySnapshots)
.orderBy(desc(dailySnapshots.updatedAt))
.limit(1);

console.log('Latest snapshot in database:');
console.log(JSON.stringify(result[0], null, 2));

await client.end();
