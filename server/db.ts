import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dailySnapshots, statusChanges, InsertDailySnapshot, InsertStatusChange } from '../drizzle/schema.js';
import { desc, eq, sql } from 'drizzle-orm';

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);

/**
 * Get current market date in US Eastern Time
 */
function getMarketDate(): string {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return etDate.toISOString().split('T')[0];
}

/**
 * Save daily snapshot to database
 */
export async function saveDailySnapshot(data: InsertDailySnapshot & { analysisDate?: string }) {
  const { analysisDate, ...snapshotData } = data;
  
  // Use provided date or current market date (ET)
  const dateStr = analysisDate || getMarketDate();
  const dateObj = new Date(dateStr + 'T00:00:00Z'); // Ensure UTC midnight
  
  // UPSERT: Insert new or update existing for this date
  // This ensures only 1 snapshot per day (latest update wins)
  const [result] = await db
    .insert(dailySnapshots)
    .values({
      ...snapshotData,
      date: dateObj,
    })
    .onConflictDoUpdate({
      target: dailySnapshots.date,
      set: snapshotData, // Replace all fields with latest data
    })
    .returning();
  
  return result;
}

/**
 * Get latest snapshot
 */
export async function getLatestSnapshot() {
  const [result] = await db
    .select()
    .from(dailySnapshots)
    .orderBy(desc(dailySnapshots.createdAt))
    .limit(1);
  return result;
}

/**
 * Get snapshot history (last N days)
 * Returns exactly N entries (one per day), with null values for missing dates
 */
export async function getSnapshotHistory(days: number = 30) {
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD' string
  
  // Get all snapshots within the date range
  const snapshots = await db
    .select()
    .from(dailySnapshots)
    .where(sql`${dailySnapshots.date} >= ${cutoffDateStr}`)
    .orderBy(desc(dailySnapshots.date));
  
  // Create map of existing data by date string
  // Convert Date objects to strings to avoid serialization errors
  const dataMap = new Map(
    snapshots.map(s => {
      const dateStr = s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date;
      const createdAtStr = s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt;
      
      return [
        dateStr,
        {
          ...s,
          date: dateStr,
          createdAt: createdAtStr,
        }
      ];
    })
  );
  
  // Fill all dates in range (newest to oldest)
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    result.push(dataMap.get(dateStr) || {
      id: null,
      date: dateStr,
      // All fields as null for missing dates
      fusionAsofDate: null,
      fusionCycleStage: null,
      fusionFragilityColor: null,
      fusionFragilityLabel: null,
      fusionGuidanceLabel: null,
      fusionHeadlineSummary: null,
      fusionCycleTone: null,
      fusionNarrativeSummary: null,
      fusionGuidanceBullets: null,
      fusionWatchCommentary: null,
      gammaAsofWeek: null,
      gammaCycleStagePrimary: null,
      gammaCycleStageTransition: null,
      gammaMacroPostureLabel: null,
      gammaHeadlineSummary: null,
      gammaDomains: null,
      gammaPhaseConfidence: null,
      gammaCycleTone: null,
      gammaOverallSummary: null,
      gammaDomainDetails: null,
      deltaAsofDate: null,
      deltaFragilityColor: null,
      deltaFragilityLabel: null,
      deltaFragilityScore: null,
      deltaTemplateCode: null,
      deltaTemplateName: null,
      deltaPatternPlain: null,
      deltaPostureCode: null,
      deltaPostureLabel: null,
      deltaHeadlineSummary: null,
      deltaKeyDrivers: null,
      deltaNextWatchDisplay: null,
      deltaPhaseUsed: null,
      deltaPhaseConfidence: null,
      deltaBreadth: null,
      deltaLiquidity: null,
      deltaVolatility: null,
      deltaLeadership: null,
      deltaBreadthText: null,
      deltaLiquidityText: null,
      deltaVolatilityText: null,
      deltaLeadershipText: null,
      deltaRationaleBullets: null,
      deltaPlainEnglishSummary: null,
      deltaNextTriggersDetail: null,
      fullAnalysis: null,
      createdAt: null,
    });
  }
  
  return result; // Newest to oldest
}

/**
 * Track status change
 */
export async function trackStatusChange(data: InsertStatusChange) {
  const [result] = await db.insert(statusChanges).values(data).returning();
  return result;
}

/**
 * Get recent status changes
 */
export async function getRecentChanges(limit: number = 10) {
  const results = await db
    .select()
    .from(statusChanges)
    .orderBy(desc(statusChanges.changedAt))
    .limit(limit);
  return results;
}

/**
 * Get changes for a specific field
 */
export async function getFieldChanges(fieldName: string, limit: number = 10) {
  const results = await db
    .select()
    .from(statusChanges)
    .where(eq(statusChanges.fieldName, fieldName))
    .orderBy(desc(statusChanges.changedAt))
    .limit(limit);
  return results;
}

