import { db } from './db.js';
import { dailySnapshots } from '../drizzle/schema.js';
import { desc, and, lt, isNotNull, sql } from 'drizzle-orm';

/**
 * Gamma Temporal Context Types
 */
export interface GammaPriorWeek {
  asof_week: string;
  cycle_stage: {
    primary: string;
    transition: string;
    phase_confidence: number;
  };
  domain_status: {
    leadership: { bias: string; strength: string };
    breadth: { bias: string; strength: string };
    sentiment: { bias: string; strength: string };
    volatility: { bias: string; strength: string };
    credit_liquidity: { bias: string; strength: string };
    macro_trend: { bias: string; strength: string };
  };
}

/**
 * Get Monday of a given week (or the date itself if it's Monday)
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get prior Gamma outputs for temporal context
 * 
 * Logic:
 * - If TEMPORAL_DATA=false: returns empty array (no temporal context)
 * - If TEMPORAL_DATA=true && GAMMA_WEEKLY_TEMPORAL=false: fetch last 2 records (any dates)
 * - If TEMPORAL_DATA=true && GAMMA_WEEKLY_TEMPORAL=true: fetch 1-week-ago Monday + 2-weeks-ago Monday
 * 
 * @param count Number of prior records/weeks to fetch (default: 2)
 * @param excludeDate Date to exclude (typically today's analysis date, format: YYYY-MM-DD)
 * @param weeklyMode If true, fetch specific Mondays; if false, fetch last N records
 */
export async function getPriorGammaOutputs(
  count: number = 2,
  excludeDate?: string,
  weeklyMode: boolean = false
): Promise<GammaPriorWeek[]> {
  try {
    console.log(`[Database] Fetching prior Gamma outputs (count: ${count}, excludeDate: ${excludeDate || 'none'}, weeklyMode: ${weeklyMode})`);
    
    if (weeklyMode && excludeDate) {
      // Weekly mode: Fetch specific Mondays (1 week ago, 2 weeks ago)
      const currentDate = new Date(excludeDate);
      const targetDates: string[] = [];
      
      for (let i = 1; i <= count; i++) {
        const targetDate = new Date(currentDate);
        targetDate.setDate(targetDate.getDate() - (7 * i)); // Go back i weeks
        const monday = getMondayOfWeek(targetDate);
        targetDates.push(monday.toISOString().split('T')[0]);
      }
      
      console.log(`[Database] Weekly mode: targeting Mondays: ${targetDates.join(', ')}`);
      
      // Fetch snapshots for these specific dates
      const snapshots = await db
        .select({
          date: dailySnapshots.date,
          gammaAsofWeek: dailySnapshots.gammaAsofWeek,
          gammaCycleStagePrimary: dailySnapshots.gammaCycleStagePrimary,
          gammaCycleStageTransition: dailySnapshots.gammaCycleStageTransition,
          gammaPhaseConfidence: dailySnapshots.gammaPhaseConfidence,
          gammaDomains: dailySnapshots.gammaDomains,
        })
        .from(dailySnapshots)
        .where(
          and(
            isNotNull(dailySnapshots.gammaAsofWeek),
            sql`${dailySnapshots.date} IN (${sql.join(targetDates.map(d => sql`${d}`), sql`, `)})`
          )
        )
        .orderBy(desc(dailySnapshots.date));
      
      console.log(`[Database] Weekly mode: found ${snapshots.length} snapshots`);
      return snapshots.map(transformToGammaPriorWeek);
      
    } else {
      // Sequential mode: Fetch last N records
      let whereClause;
      if (excludeDate) {
        whereClause = and(
          isNotNull(dailySnapshots.gammaAsofWeek),
          lt(dailySnapshots.date, excludeDate)
        );
        console.log(`[Database] Excluding current analysis date: ${excludeDate}`);
      } else {
        whereClause = isNotNull(dailySnapshots.gammaAsofWeek);
      }
      
      const snapshots = await db
        .select({
          date: dailySnapshots.date,
          gammaAsofWeek: dailySnapshots.gammaAsofWeek,
          gammaCycleStagePrimary: dailySnapshots.gammaCycleStagePrimary,
          gammaCycleStageTransition: dailySnapshots.gammaCycleStageTransition,
          gammaPhaseConfidence: dailySnapshots.gammaPhaseConfidence,
          gammaDomains: dailySnapshots.gammaDomains,
        })
        .from(dailySnapshots)
        .where(whereClause)
        .orderBy(desc(dailySnapshots.date))
        .limit(count);
      
      console.log(`[Database] Sequential mode: found ${snapshots.length} snapshots`);
      if (snapshots.length > 0) {
        console.log(`[Database] Date range: ${snapshots[snapshots.length - 1].date} to ${snapshots[0].date}`);
      }
      
      return snapshots.map(transformToGammaPriorWeek);
    }
  } catch (error) {
    console.error('[Database] Failed to fetch prior Gamma outputs:', error);
    return [];
  }
}

/**
 * Transform database record to Gamma prior week format
 */
function transformToGammaPriorWeek(snapshot: any): GammaPriorWeek {
  // Parse phase_confidence (e.g., "75%" → 0.75)
  let phaseConfidence = 0.75; // Default
  if (snapshot.gammaPhaseConfidence) {
    const match = snapshot.gammaPhaseConfidence.match(/(\d+)/);
    if (match) {
      phaseConfidence = parseInt(match[1]) / 100;
    }
  }
  
  // Parse domains from JSONB
  const domains = snapshot.gammaDomains || [];
  const domainStatus: GammaPriorWeek['domain_status'] = {
    leadership: { bias: '', strength: '' },
    breadth: { bias: '', strength: '' },
    sentiment: { bias: '', strength: '' },
    volatility: { bias: '', strength: '' },
    credit_liquidity: { bias: '', strength: '' },
    macro_trend: { bias: '', strength: '' },
  };
  
  // Map domains array to domain_status object
  domains.forEach((domain: any) => {
    const domainName = domain.domain_name?.toLowerCase().replace(/[\s/]+/g, '_');
    if (domainName && domainStatus[domainName as keyof typeof domainStatus]) {
      domainStatus[domainName as keyof typeof domainStatus] = {
        bias: domain.bias_label || '',
        strength: domain.strength_label || '',
      };
    }
  });
  
  return {
    asof_week: snapshot.gammaAsofWeek || '',
    cycle_stage: {
      primary: snapshot.gammaCycleStagePrimary || '',
      transition: snapshot.gammaCycleStageTransition || '',
      phase_confidence: phaseConfidence,
    },
    domain_status: domainStatus,
  };
}

