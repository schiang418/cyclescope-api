import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runGammaAnalysis } from './assistants/gamma.js';
import { runDeltaAnalysis } from './assistants/delta.js';
import { runDeltaV2Analysis } from './assistants/deltaV2.js';
import { runFusionAnalysis } from './assistants/fusion.js';
import {
  saveDailySnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
  getRecentChanges,
  trackStatusChange,
  saveDeltaV2Analysis,
  getLatestDeltaV2,
  getDeltaV2History,
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
      const versionPath = join(__dirname, 'version.json');
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
   * 🔥 ASYNC MODE: Returns immediately, analysis runs in background
   */
  analysis: t.router({
    triggerAll: t.procedure
      .input(z.object({
        date: z.string().optional(), // YYYY-MM-DD format
      }).optional())
      .mutation(async ({ input }) => {
        const analysisDate = input?.date;
        console.log(`[API] 🚀 Triggering full analysis pipeline for ${analysisDate || 'today (ET)'}...`);
        console.log('[API] ⚡ Mode: ASYNC (fire-and-forget)');
      
      // 🔥 Fire-and-forget: Start analysis in background, return immediately
      setImmediate(async () => {
        try {
          console.log('[API] 🔄 Background analysis started...');
          
          // Step 1: Run Gamma analysis (18 charts)
          console.log('[API] Step 1/3: Running Gamma analysis...');
          const gammaResult = await runGammaAnalysis('engine', analysisDate);
          
          // Add delay between Gamma and Delta in CSV-Only mode to avoid TPM rate limit
          const enhancedMode = process.env.ENABLE_ENHANCED_ANALYSIS || 'false';
          console.log(`[API] Enhanced mode setting: ${enhancedMode}`);
          
          if (enhancedMode === 'csv_only') {
            const delaySeconds = 60;
            console.log(`[API] ⏳ CSV-Only mode: Waiting ${delaySeconds} seconds before Delta to avoid OpenAI TPM rate limit...`);
            console.log(`[API] Current time: ${new Date().toISOString()}`);
            
            // Log every 10 seconds during delay
            for (let i = 0; i < delaySeconds; i += 10) {
              await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
              const remaining = delaySeconds - i - 10;
              if (remaining > 0) {
                console.log(`[API] ⏳ Still waiting... ${remaining} seconds remaining`);
              }
            }
            
            console.log(`[API] ✅ Delay complete at ${new Date().toISOString()}`);
            console.log('[API] ✅ Proceeding with Delta analysis');
          }
          
          // Step 2: Run Delta V1 analysis (14 charts)
          console.log('[API] Step 2/4: Running Delta V1 analysis...');
          const deltaResult = await runDeltaAnalysis('engine', analysisDate);
          
          // Step 3: Run Delta V2 analysis (19 short-term charts)
          console.log('[API] Step 3/4: Running Delta V2 analysis...');
          const deltaV2Result = await runDeltaV2Analysis('engine', analysisDate);
          
          // Step 4: Run Fusion synthesis
          console.log('[API] Step 4/4: Running Fusion synthesis...');
          const fusionResult = await runFusionAnalysis('engine', gammaResult, deltaResult, analysisDate);
        
        // Step 5: Save to database
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
          
          // Delta V2 - ALL fields
          deltaV2AsofDate: deltaV2Result.asof_date,
          deltaV2SchemaVersion: deltaV2Result.delta_schema_version,
          deltaV2MarketCondition: deltaV2Result.layer1.market_condition,
          deltaV2TurningPoint: deltaV2Result.layer1.turning_point,
          deltaV2Outlook12Month: deltaV2Result.layer1.outlook_1_2_month,
          deltaV2Domains: deltaV2Result.layer2.domains,
          deltaV2TurningPointEvidence: deltaV2Result.layer2.turning_point_evidence,
          deltaV2OutlookParagraph: deltaV2Result.layer2.outlook_paragraph,
          deltaV2FullAnalysis: deltaV2Result,
          deltaV2CreatedAt: new Date(),
          
          // Full analysis JSON (backup)
          fullAnalysis: {
            gamma: gammaResult.fullAnalysis,
            delta: deltaResult.fullAnalysis,
            deltaV2: deltaV2Result,
            fusion: fusionResult.fullAnalysis,
          },
        });
        
        // Step 6: Track status changes
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
        
          console.log('[API] ✅ Background analysis pipeline complete!');
          console.log(`[API] 💾 Snapshot ID: ${snapshot.id}`);
          
        } catch (error) {
          console.error('[API] ❌ Background analysis failed:', error);
          console.error('[API] Error details:', error instanceof Error ? error.message : 'Unknown error');
        }
      });
      
      // Return immediately (don't wait for analysis to complete)
      return {
        success: true,
        message: 'Analysis started in background',
        mode: 'async',
        analysisDate: analysisDate || 'today (ET)',
        estimatedCompletionTime: '2-3 minutes',
      };
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
        
        // Delta V2 - ALL fields (10)
        deltaV2: {
          asofDate: snapshot.deltaV2AsofDate,
          schemaVersion: snapshot.deltaV2SchemaVersion,
          marketCondition: snapshot.deltaV2MarketCondition,
          turningPoint: snapshot.deltaV2TurningPoint,
          outlook12Month: snapshot.deltaV2Outlook12Month,
          domains: snapshot.deltaV2Domains,
          turningPointEvidence: snapshot.deltaV2TurningPointEvidence,
          outlookParagraph: snapshot.deltaV2OutlookParagraph,
          fullAnalysis: snapshot.deltaV2FullAnalysis,
          createdAt: snapshot.deltaV2CreatedAt,
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
            
            // Delta V2 - ALL fields (10)
            deltaV2: {
              asofDate: (snapshot as any).deltaV2AsofDate,
              schemaVersion: (snapshot as any).deltaV2SchemaVersion,
              marketCondition: (snapshot as any).deltaV2MarketCondition,
              turningPoint: (snapshot as any).deltaV2TurningPoint,
              outlook12Month: (snapshot as any).deltaV2Outlook12Month,
              domains: (snapshot as any).deltaV2Domains,
              turningPointEvidence: (snapshot as any).deltaV2TurningPointEvidence,
              outlookParagraph: (snapshot as any).deltaV2OutlookParagraph,
              fullAnalysis: (snapshot as any).deltaV2FullAnalysis,
              createdAt: (snapshot as any).deltaV2CreatedAt ? ((snapshot as any).deltaV2CreatedAt instanceof Date ? (snapshot as any).deltaV2CreatedAt.toISOString() : String((snapshot as any).deltaV2CreatedAt)) : null,
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

    /**
     * Copy analysis data from one date to another
     * Useful for fixing data issues or backfilling missing dates
     */
    copyAnalysis: t.procedure
      .input(z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
      }))
      .mutation(async ({ input }) => {
        const { fromDate, toDate } = input;
        
        console.log(`[API] 📋 Copying analysis data from ${fromDate} to ${toDate}...`);
        
        // Get source snapshot
        const snapshots = await getSnapshotHistory(365);
        const sourceSnapshot = snapshots.find(s => s.date === fromDate);
        
        // Type guard: ensure we have a real snapshot (not a placeholder)
        if (!sourceSnapshot || sourceSnapshot.id === null) {
          throw new Error(`Source date ${fromDate} not found or has no data`);
        }
        
        console.log(`[API] ✅ Found source snapshot ID: ${sourceSnapshot.id}`);
        console.log(`[API] Source has gamma domains: ${Array.isArray(sourceSnapshot.gammaDomains) ? sourceSnapshot.gammaDomains.length : 0}`);
        console.log(`[API] Source has delta fragility: ${sourceSnapshot.deltaFragilityScore}`);
        
        // Save as new snapshot with target date
        const newSnapshot = await saveDailySnapshot({
          analysisDate: toDate,
          
          // Fusion - ALL fields
          fusionAsofDate: sourceSnapshot.fusionAsofDate,
          fusionCycleStage: sourceSnapshot.fusionCycleStage,
          fusionFragilityColor: sourceSnapshot.fusionFragilityColor,
          fusionFragilityLabel: sourceSnapshot.fusionFragilityLabel,
          fusionGuidanceLabel: sourceSnapshot.fusionGuidanceLabel,
          fusionHeadlineSummary: sourceSnapshot.fusionHeadlineSummary,
          fusionCycleTone: sourceSnapshot.fusionCycleTone,
          fusionNarrativeSummary: sourceSnapshot.fusionNarrativeSummary,
          fusionGuidanceBullets: sourceSnapshot.fusionGuidanceBullets,
          fusionWatchCommentary: sourceSnapshot.fusionWatchCommentary,
          
          // Gamma - ALL fields
          gammaAsofWeek: sourceSnapshot.gammaAsofWeek,
          gammaCycleStagePrimary: sourceSnapshot.gammaCycleStagePrimary,
          gammaCycleStageTransition: sourceSnapshot.gammaCycleStageTransition,
          gammaMacroPostureLabel: sourceSnapshot.gammaMacroPostureLabel,
          gammaHeadlineSummary: sourceSnapshot.gammaHeadlineSummary,
          gammaDomains: sourceSnapshot.gammaDomains,
          gammaPhaseConfidence: sourceSnapshot.gammaPhaseConfidence,
          gammaCycleTone: sourceSnapshot.gammaCycleTone,
          gammaOverallSummary: sourceSnapshot.gammaOverallSummary,
          gammaDomainDetails: sourceSnapshot.gammaDomainDetails,
          
          // Delta - ALL fields
          deltaAsofDate: sourceSnapshot.deltaAsofDate,
          deltaFragilityColor: sourceSnapshot.deltaFragilityColor,
          deltaFragilityLabel: sourceSnapshot.deltaFragilityLabel,
          deltaFragilityScore: sourceSnapshot.deltaFragilityScore,
          deltaTemplateCode: sourceSnapshot.deltaTemplateCode,
          deltaTemplateName: sourceSnapshot.deltaTemplateName,
          deltaPatternPlain: sourceSnapshot.deltaPatternPlain,
          deltaPostureCode: sourceSnapshot.deltaPostureCode,
          deltaPostureLabel: sourceSnapshot.deltaPostureLabel,
          deltaHeadlineSummary: sourceSnapshot.deltaHeadlineSummary,
          deltaKeyDrivers: sourceSnapshot.deltaKeyDrivers,
          deltaNextWatchDisplay: sourceSnapshot.deltaNextWatchDisplay,
          deltaPhaseUsed: sourceSnapshot.deltaPhaseUsed,
          deltaPhaseConfidence: sourceSnapshot.deltaPhaseConfidence,
          deltaBreadth: sourceSnapshot.deltaBreadth,
          deltaLiquidity: sourceSnapshot.deltaLiquidity,
          deltaVolatility: sourceSnapshot.deltaVolatility,
          deltaLeadership: sourceSnapshot.deltaLeadership,
          deltaBreadthText: sourceSnapshot.deltaBreadthText,
          deltaLiquidityText: sourceSnapshot.deltaLiquidityText,
          deltaVolatilityText: sourceSnapshot.deltaVolatilityText,
          deltaLeadershipText: sourceSnapshot.deltaLeadershipText,
          deltaRationaleBullets: sourceSnapshot.deltaRationaleBullets,
          deltaPlainEnglishSummary: sourceSnapshot.deltaPlainEnglishSummary,
          deltaNextTriggersDetail: sourceSnapshot.deltaNextTriggersDetail,
          
          // Delta V2 - ALL fields
          deltaV2AsofDate: sourceSnapshot.deltaV2AsofDate,
          deltaV2SchemaVersion: sourceSnapshot.deltaV2SchemaVersion,
          deltaV2MarketCondition: sourceSnapshot.deltaV2MarketCondition,
          deltaV2TurningPoint: sourceSnapshot.deltaV2TurningPoint,
          deltaV2Outlook12Month: sourceSnapshot.deltaV2Outlook12Month,
          deltaV2Domains: sourceSnapshot.deltaV2Domains,
          deltaV2TurningPointEvidence: sourceSnapshot.deltaV2TurningPointEvidence,
          deltaV2OutlookParagraph: sourceSnapshot.deltaV2OutlookParagraph,
          deltaV2FullAnalysis: sourceSnapshot.deltaV2FullAnalysis,
          deltaV2CreatedAt: sourceSnapshot.deltaV2CreatedAt,
          
          // Full analysis JSON
          fullAnalysis: sourceSnapshot.fullAnalysis,
        });
        
        console.log(`[API] ✅ Analysis data copied successfully`);
        console.log(`[API] 💾 New snapshot ID: ${newSnapshot.id}`);
        console.log(`[API] Target has gamma domains: ${Array.isArray(newSnapshot.gammaDomains) ? newSnapshot.gammaDomains.length : 0}`);
        console.log(`[API] Target has delta fragility: ${newSnapshot.deltaFragilityScore}`);
        
        return {
          success: true,
          message: `Analysis data copied from ${fromDate} to ${toDate}`,
          sourceSnapshotId: sourceSnapshot.id,
          newSnapshotId: newSnapshot.id,
          copiedFields: {
            gammaDomains: Array.isArray(newSnapshot.gammaDomains) ? newSnapshot.gammaDomains.length : 0,
            deltaFragilityScore: newSnapshot.deltaFragilityScore,
          },
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

