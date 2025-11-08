import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runGammaAnalysis } from './assistants/gamma.js';
import { runDeltaAnalysis } from './assistants/delta.js';
import { runFusionAnalysis } from './assistants/fusion.js';
import {
  saveDailySnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  getRecentChanges,
  trackStatusChange,
} from './db.js';

const t = initTRPC.create();

export const appRouter = t.router({
  /**
   * Health check endpoint
   */
  health: t.procedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CycleScope API',
    };
  }),

  /**
   * Version check endpoint
   */
  version: t.procedure.query(() => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const versionPath = join(__dirname, '..', 'version.json');
      const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
      return {
        ...versionData,
        currentTime: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
      };
    } catch (error) {
      return {
        error: 'Version file not found',
        currentTime: new Date().toISOString(),
        nodeVersion: process.version,
      };
    }
  }),

  /**
   * Trigger full analysis (Gamma + Delta + Fusion)
   */
  analysis: t.router({
    triggerAll: t.procedure
      .input(z.object({
        date: z.string().optional(), // YYYY-MM-DD format
      }).optional())
      .mutation(async ({ input }) => {
        const analysisDate = input?.date;
        console.log(`[API] Starting full analysis pipeline for ${analysisDate || 'today (ET)'}...`);
      
      try {
        // Step 1: Run Gamma analysis (18 charts)
        console.log('[API] TESTING MODE: Running Gamma analysis ONLY...');
        const gammaResult = await runGammaAnalysis('engine', analysisDate);
        
        // TEMPORARILY DISABLED: Delta and Fusion (testing Gamma first)
        console.log('[API] Delta and Fusion are temporarily disabled for testing');
        
        // Create mock results for Delta and Fusion to satisfy database schema
        const deltaResult = {
          asofDate: analysisDate || new Date().toISOString().split('T')[0],
          fragilityColor: 'TESTING',
          fragilityLabel: 'Testing Mode',
          fragilityScore: 0,
          templateCode: 'TEST',
          templateName: 'Testing',
          patternPlain: 'Testing Gamma only',
          postureCode: 'T',
          postureLabel: 'Testing',
          headlineSummary: 'Testing mode - Delta disabled',
          keyDrivers: ['Testing mode'],
          nextWatchDisplay: {},
          phaseUsed: 'Testing',
          phaseConfidence: '0%',
          breadth: 0,
          liquidity: 0,
          volatility: 0,
          leadership: 0,
          breadthText: 'Testing mode',
          liquidityText: 'Testing mode',
          volatilityText: 'Testing mode',
          leadershipText: 'Testing mode',
          rationaleBullets: ['Testing mode'],
          plainEnglishSummary: 'Testing mode - Delta disabled',
          nextTriggersDetail: [],
          fullAnalysis: {}
        };
        
        const fusionResult = {
          asofDate: analysisDate || new Date().toISOString().split('T')[0],
          cycleStage: 'Testing',
          fragilityColor: 'TESTING',
          fragilityLabel: 'Testing Mode',
          guidanceLabel: 'Testing',
          headlineSummary: 'Testing mode - Fusion disabled',
          cycleTone: 'Testing',
          narrativeSummary: 'Testing mode - Fusion disabled',
          guidanceBullets: ['Testing mode'],
          watchCommentary: 'Testing mode',
          fullAnalysis: {}
        };
        
        // Step 2 & 3: DISABLED FOR TESTING
        // console.log('[API] Step 2/3: Running Delta analysis...');
        // const deltaResult = await runDeltaAnalysis('engine', analysisDate);
        // console.log('[API] Step 3/3: Running Fusion synthesis...');
        // const fusionResult = await runFusionAnalysis('engine', gammaResult, deltaResult, analysisDate);
        
        // Step 4: Save to database
        console.log('[API] Saving results to database...');
        const snapshot = await saveDailySnapshot({
          analysisDate, // Pass as string, saveDailySnapshot will handle conversion
          
          // Fusion - ALL fields
          fusionAsofDate: fusionResult.asofDate,
          fusionCycleStage: fusionResult.cycleStage,
          fusionFragilityColor: fusionResult.fragilityColor,
          fusionFragilityLabel: fusionResult.fragilityLabel,
          fusionGuidanceLabel: fusionResult.guidanceLabel,
          fusionHeadlineSummary: fusionResult.headlineSummary,
          fusionCycleTone: fusionResult.cycleTone,
          fusionNarrativeSummary: fusionResult.narrativeSummary,
          fusionGuidanceBullets: fusionResult.guidanceBullets,
          fusionWatchCommentary: fusionResult.watchCommentary,
          
          // Gamma - ALL fields
          gammaAsofWeek: gammaResult.asofWeek,
          gammaCycleStagePrimary: gammaResult.cycleStagePrimary,
          gammaCycleStageTransition: gammaResult.cycleStageTransition,
          gammaMacroPostureLabel: gammaResult.macroPostureLabel,
          gammaHeadlineSummary: gammaResult.headlineSummary,
          gammaDomains: gammaResult.domains,
          gammaPhaseConfidence: gammaResult.phaseConfidence,
          gammaCycleTone: gammaResult.cycleTone,
          gammaOverallSummary: gammaResult.overallSummary,
          gammaDomainDetails: gammaResult.domainDetails,
          
          // Delta - ALL fields
          deltaAsofDate: deltaResult.asofDate,
          deltaFragilityColor: deltaResult.fragilityColor,
          deltaFragilityLabel: deltaResult.fragilityLabel,
          deltaFragilityScore: deltaResult.fragilityScore,
          deltaTemplateCode: deltaResult.templateCode,
          deltaTemplateName: deltaResult.templateName,
          deltaPatternPlain: deltaResult.patternPlain,
          deltaPostureCode: deltaResult.postureCode,
          deltaPostureLabel: deltaResult.postureLabel,
          deltaHeadlineSummary: deltaResult.headlineSummary,
          deltaKeyDrivers: deltaResult.keyDrivers,
          deltaNextWatchDisplay: deltaResult.nextWatchDisplay,
          deltaPhaseUsed: deltaResult.phaseUsed,
          deltaPhaseConfidence: deltaResult.phaseConfidence,
          deltaBreadth: deltaResult.breadth,
          deltaLiquidity: deltaResult.liquidity,
          deltaVolatility: deltaResult.volatility,
          deltaLeadership: deltaResult.leadership,
          deltaBreadthText: deltaResult.breadthText,
          deltaLiquidityText: deltaResult.liquidityText,
          deltaVolatilityText: deltaResult.volatilityText,
          deltaLeadershipText: deltaResult.leadershipText,
          deltaRationaleBullets: deltaResult.rationaleBullets,
          deltaPlainEnglishSummary: deltaResult.plainEnglishSummary,
          deltaNextTriggersDetail: deltaResult.nextTriggersDetail,
          
          // Full analysis JSON (backup)
          fullAnalysis: {
            gamma: gammaResult.fullAnalysis,
            delta: deltaResult.fullAnalysis,
            fusion: fusionResult.fullAnalysis,
          },
        });
        
        // Step 5: Track status changes
        const previous = await getLatestSnapshot();
        if (previous && previous.id !== snapshot.id) {
          // Check for changes in key fields
          const fieldsToTrack = [
            { name: 'fusion_cycle_stage', old: previous.fusionCycleStage, new: snapshot.fusionCycleStage },
            { name: 'fusion_fragility_label', old: previous.fusionFragilityLabel, new: snapshot.fusionFragilityLabel },
            { name: 'delta_fragility_score', old: previous.deltaFragilityScore?.toString(), new: snapshot.deltaFragilityScore?.toString() },
          ];
          
          for (const field of fieldsToTrack) {
            if (field.old !== field.new) {
              await trackStatusChange({
                fieldName: field.name,
                oldValue: field.old || null,
                newValue: field.new || '',
              });
            }
          }
        }
        
        console.log('[API] Analysis pipeline complete!');
        
        return {
          success: true,
          snapshotId: snapshot.id,
          timestamp: snapshot.createdAt,
          results: {
            fusion: fusionResult,
            gamma: gammaResult,
            delta: deltaResult,
          },
        };
      } catch (error) {
        console.error('[API] Analysis failed:', error);
        throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

    /**
     * Get latest snapshot
     */
    latest: t.procedure.query(async () => {
      const snapshot = await getLatestSnapshot();
      
      if (!snapshot) {
        return null;
      }
      
      // Format date as YYYY-MM-DD (date is already a string from database)
      const dateStr = typeof snapshot.date === 'string' 
        ? snapshot.date
        : (snapshot.date as any).toISOString().split('T')[0];
      
      return {
        id: snapshot.id,
        date: dateStr,
        
        // Fusion - ALL fields
        fusion: {
          asofDate: snapshot.fusionAsofDate,
          cycleStage: snapshot.fusionCycleStage,
          fragilityColor: snapshot.fusionFragilityColor,
          fragilityLabel: snapshot.fusionFragilityLabel,
          guidanceLabel: snapshot.fusionGuidanceLabel,
          headlineSummary: snapshot.fusionHeadlineSummary,
          cycleTone: snapshot.fusionCycleTone,
          narrativeSummary: snapshot.fusionNarrativeSummary,
          guidanceBullets: snapshot.fusionGuidanceBullets,
          watchCommentary: snapshot.fusionWatchCommentary,
        },
        
        // Gamma - ALL fields
        gamma: {
          asofWeek: snapshot.gammaAsofWeek,
          cycleStagePrimary: snapshot.gammaCycleStagePrimary,
          cycleStageTransition: snapshot.gammaCycleStageTransition,
          macroPostureLabel: snapshot.gammaMacroPostureLabel,
          headlineSummary: snapshot.gammaHeadlineSummary,
          domains: snapshot.gammaDomains,
          phaseConfidence: snapshot.gammaPhaseConfidence,
          cycleTone: snapshot.gammaCycleTone,
          overallSummary: snapshot.gammaOverallSummary,
          domainDetails: snapshot.gammaDomainDetails,
        },
        
        // Delta - ALL fields
        delta: {
          asofDate: snapshot.deltaAsofDate,
          fragilityColor: snapshot.deltaFragilityColor,
          fragilityLabel: snapshot.deltaFragilityLabel,
          fragilityScore: snapshot.deltaFragilityScore,
          templateCode: snapshot.deltaTemplateCode,
          templateName: snapshot.deltaTemplateName,
          patternPlain: snapshot.deltaPatternPlain,
          postureCode: snapshot.deltaPostureCode,
          postureLabel: snapshot.deltaPostureLabel,
          headlineSummary: snapshot.deltaHeadlineSummary,
          keyDrivers: snapshot.deltaKeyDrivers,
          nextWatchDisplay: snapshot.deltaNextWatchDisplay,
          phaseUsed: snapshot.deltaPhaseUsed,
          phaseConfidence: snapshot.deltaPhaseConfidence,
          breadth: snapshot.deltaBreadth,
          liquidity: snapshot.deltaLiquidity,
          volatility: snapshot.deltaVolatility,
          leadership: snapshot.deltaLeadership,
          breadthText: snapshot.deltaBreadthText,
          liquidityText: snapshot.deltaLiquidityText,
          volatilityText: snapshot.deltaVolatilityText,
          leadershipText: snapshot.deltaLeadershipText,
          rationaleBullets: snapshot.deltaRationaleBullets,
          plainEnglishSummary: snapshot.deltaPlainEnglishSummary,
          nextTriggersDetail: snapshot.deltaNextTriggersDetail,
        },
        
        fullAnalysis: snapshot.fullAnalysis,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      };
    }),

    /**
     * Get snapshot history with ALL 44+ fields
     * Returns exactly N entries (one per day), with null for missing dates
     */
    history: t.procedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        const snapshots = await getSnapshotHistory(input.days);
        
        return snapshots.map(snapshot => {
          // snapshot.date, snapshot.createdAt, and snapshot.updatedAt are already strings from getSnapshotHistory
          const dateStr = snapshot.date;
          const createdAtStr = snapshot.createdAt;
          const updatedAtStr = snapshot.updatedAt;
          
          return {
            id: snapshot.id,
            date: dateStr,
            
            // Fusion - ALL fields (10)
            fusion: {
              asofDate: snapshot.fusionAsofDate,
              cycleStage: snapshot.fusionCycleStage,
              fragilityColor: snapshot.fusionFragilityColor,
              fragilityLabel: snapshot.fusionFragilityLabel,
              guidanceLabel: snapshot.fusionGuidanceLabel,
              headlineSummary: snapshot.fusionHeadlineSummary,
              cycleTone: snapshot.fusionCycleTone,
              narrativeSummary: snapshot.fusionNarrativeSummary,
              guidanceBullets: snapshot.fusionGuidanceBullets,
              watchCommentary: snapshot.fusionWatchCommentary,
            },
            
            // Gamma - ALL fields (10 + 2 arrays)
            gamma: {
              asofWeek: snapshot.gammaAsofWeek,
              cycleStagePrimary: snapshot.gammaCycleStagePrimary,
              cycleStageTransition: snapshot.gammaCycleStageTransition,
              macroPostureLabel: snapshot.gammaMacroPostureLabel,
              headlineSummary: snapshot.gammaHeadlineSummary,
              domains: snapshot.gammaDomains,
              phaseConfidence: snapshot.gammaPhaseConfidence,
              cycleTone: snapshot.gammaCycleTone,
              overallSummary: snapshot.gammaOverallSummary,
              domainDetails: snapshot.gammaDomainDetails,
            },
            
            // Delta - ALL fields (24)
            delta: {
              asofDate: snapshot.deltaAsofDate,
              fragilityColor: snapshot.deltaFragilityColor,
              fragilityLabel: snapshot.deltaFragilityLabel,
              fragilityScore: snapshot.deltaFragilityScore,
              templateCode: snapshot.deltaTemplateCode,
              templateName: snapshot.deltaTemplateName,
              patternPlain: snapshot.deltaPatternPlain,
              postureCode: snapshot.deltaPostureCode,
              postureLabel: snapshot.deltaPostureLabel,
              headlineSummary: snapshot.deltaHeadlineSummary,
              keyDrivers: snapshot.deltaKeyDrivers,
              nextWatchDisplay: snapshot.deltaNextWatchDisplay,
              phaseUsed: snapshot.deltaPhaseUsed,
              phaseConfidence: snapshot.deltaPhaseConfidence,
              breadth: snapshot.deltaBreadth,
              liquidity: snapshot.deltaLiquidity,
              volatility: snapshot.deltaVolatility,
              leadership: snapshot.deltaLeadership,
              breadthText: snapshot.deltaBreadthText,
              liquidityText: snapshot.deltaLiquidityText,
              volatilityText: snapshot.deltaVolatilityText,
              leadershipText: snapshot.deltaLeadershipText,
              rationaleBullets: snapshot.deltaRationaleBullets,
              plainEnglishSummary: snapshot.deltaPlainEnglishSummary,
              nextTriggersDetail: snapshot.deltaNextTriggersDetail,
            },
            
            // fullAnalysis removed to avoid potential Date serialization issues
            // fullAnalysis: snapshot.fullAnalysis,
            createdAt: createdAtStr,
            updatedAt: updatedAtStr,
          };
        });
      }),

    /**
     * Get recent status changes
     */
    changes: t.procedure
      .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
      .query(async ({ input }) => {
        const changes = await getRecentChanges(input.limit);
        return changes;
      }),
  }),
});

export type AppRouter = typeof appRouter;

