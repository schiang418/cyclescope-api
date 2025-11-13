import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dailySnapshots, statusChanges, InsertDailySnapshot, InsertStatusChange } from '../drizzle/schema.js';
import { desc, eq, sql, and, lt, isNotNull } from 'drizzle-orm';

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
export async function saveDailySnapshot(data: Omit<InsertDailySnapshot, 'date'> & { analysisDate?: string }) {
  const { analysisDate, ...snapshotData } = data;
  
  // Use provided date or current market date (ET)
  const dateStr = analysisDate || getMarketDate();
  
  // IMPORTANT: Store as date string (YYYY-MM-DD) only, no time component
  // This ensures UPSERT works correctly - same date = same record
  const datePart = dateStr.split('T')[0]; // Extract YYYY-MM-DD part
  
  // UPSERT: Insert new or update existing for this date
  // This ensures only 1 snapshot per day (latest update wins)
  const [result] = await db
    .insert(dailySnapshots)
    .values({
      ...snapshotData,
      date: datePart, // Store as date string
    })
    .onConflictDoUpdate({
      target: dailySnapshots.date,
      set: {
        ...snapshotData, // Replace all fields with latest data
        updatedAt: new Date(), // Update timestamp on every update
      },
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
  // date is now a string (YYYY-MM-DD), createdAt is a Date object
  const dataMap = new Map(
    snapshots.map(s => {
      // date field is already a string (YYYY-MM-DD) from database
      const dateStr = typeof s.date === 'string' ? s.date : (s.date as any).toISOString().split('T')[0];
      // createdAt and updatedAt are timestamps, convert to ISO strings
      const createdAtStr = s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt);
      const updatedAtStr = s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt);
      
      return [
        dateStr,
        {
          ...s,
          date: dateStr,
          createdAt: createdAtStr,
          updatedAt: updatedAtStr,
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
      updatedAt: null,
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



/**
 * Delta Temporal Context Types
 */
export interface DeltaPriorDay {
  asof_date: string;
  fragility_color: string;
  fragility_label: string;
  fragility_score: number;
  template_code: string;
  template_name: string;
  posture_code: string;
  posture_label: string;
  dimensions: {
    breadth: number;
    liquidity: number;
    volatility: number;
    leadership: number;
  };
}

/**
 * Get prior Delta outputs for temporal context
 * @param days Number of prior business days to fetch (default: 3)
 * @param excludeDate Date to exclude (typically today's analysis date, format: YYYY-MM-DD)
 * @returns Array of prior Delta states (most recent first)
 */
export async function getPriorDeltaOutputs(days: number = 3, excludeDate?: string): Promise<DeltaPriorDay[]> {
  try {
    // Get the last N business days with Delta data (excluding nulls and weekends)
    // We fetch more records than needed to account for weekends, then filter
    console.log(`[Database] Fetching prior Delta outputs (days: ${days}, excludeDate: ${excludeDate || 'none'})`);
    
    // Build WHERE clause
    let whereClause;
    if (excludeDate) {
      whereClause = and(
        isNotNull(dailySnapshots.deltaAsofDate),
        lt(dailySnapshots.date, excludeDate)
      );
      console.log(`[Database] Excluding current analysis date: ${excludeDate}`);
    } else {
      whereClause = isNotNull(dailySnapshots.deltaAsofDate);
    }
    
    const snapshots = await db
      .select({
        date: dailySnapshots.date,
        deltaAsofDate: dailySnapshots.deltaAsofDate,
        deltaFragilityColor: dailySnapshots.deltaFragilityColor,
        deltaFragilityLabel: dailySnapshots.deltaFragilityLabel,
        deltaFragilityScore: dailySnapshots.deltaFragilityScore,
        deltaTemplateCode: dailySnapshots.deltaTemplateCode,
        deltaTemplateName: dailySnapshots.deltaTemplateName,
        deltaPostureCode: dailySnapshots.deltaPostureCode,
        deltaPostureLabel: dailySnapshots.deltaPostureLabel,
        deltaBreadth: dailySnapshots.deltaBreadth,
        deltaLiquidity: dailySnapshots.deltaLiquidity,
        deltaVolatility: dailySnapshots.deltaVolatility,
        deltaLeadership: dailySnapshots.deltaLeadership,
      })
      .from(dailySnapshots)
      .where(whereClause)
      .orderBy(desc(dailySnapshots.date))
      .limit(days * 2); // Fetch extra to account for weekends
    
    console.log(`[Database] Query returned ${snapshots.length} snapshots`);
    
    // Filter out weekends (Saturday = 6, Sunday = 0)
    const businessDays = snapshots.filter(snapshot => {
      const date = new Date(snapshot.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
    });
    
    // Take only the requested number of business days
    const limitedDays = businessDays.slice(0, days);
    
    console.log(`[Database] Fetched ${limitedDays.length} prior business days (requested: ${days})`);
    if (limitedDays.length > 0) {
      console.log(`[Database] Date range: ${limitedDays[limitedDays.length - 1].date} to ${limitedDays[0].date}`);
    }
    
    // Transform to ChatGPT format
    return limitedDays.map(transformToDeltaPriorDay);
  } catch (error) {
    console.error('[Database] Failed to fetch prior Delta outputs:', error);
    return [];
  }
}

/**
 * Transform database record to Delta prior day format
 */
function transformToDeltaPriorDay(snapshot: any): DeltaPriorDay {
  return {
    asof_date: snapshot.deltaAsofDate || '',
    fragility_color: snapshot.deltaFragilityColor || 'YELLOW',
    fragility_label: snapshot.deltaFragilityLabel || 'Mixed Signals',
    fragility_score: snapshot.deltaFragilityScore ?? 0,
    template_code: snapshot.deltaTemplateCode || '',
    template_name: snapshot.deltaTemplateName || '',
    posture_code: snapshot.deltaPostureCode || '',
    posture_label: snapshot.deltaPostureLabel || '',
    dimensions: {
      breadth: snapshot.deltaBreadth ?? 1,
      liquidity: snapshot.deltaLiquidity ?? 1,
      volatility: snapshot.deltaVolatility ?? 1,
      leadership: snapshot.deltaLeadership ?? 1,
    },
  };
}

