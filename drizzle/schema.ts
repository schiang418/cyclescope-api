import { pgTable, serial, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

/**
 * Daily Snapshots Table - COMPLETE VERSION
 * Stores ALL analysis results from Gamma, Delta, and Fusion assistants
 * Every field maps to a display element in the portal
 */
export const dailySnapshots = pgTable('daily_snapshots', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull().unique(), // One snapshot per day
  
  // ========================================
  // FUSION ASSISTANT RESULTS (Layer 1 + Layer 2)
  // ========================================
  
  // Layer 1 fields
  fusionAsofDate: text('fusion_asof_date'),
  fusionCycleStage: text('fusion_cycle_stage'),              // e.g., "Late Expansion"
  fusionFragilityColor: text('fusion_fragility_color'),      // ORANGE, YELLOW, GREEN
  fusionFragilityLabel: text('fusion_fragility_label'),      // e.g., "Elevated Internal Risk"
  fusionGuidanceLabel: text('fusion_guidance_label'),        // e.g., "Defensive Tilt"
  fusionHeadlineSummary: text('fusion_headline_summary'),    // Short summary text
  
  // Layer 2 fields
  fusionCycleTone: text('fusion_cycle_tone'),                // e.g., "Neutral-to-Cautious"
  fusionNarrativeSummary: text('fusion_narrative_summary'),  // Detailed narrative
  fusionGuidanceBullets: jsonb('fusion_guidance_bullets'),   // Array of actionable guidance
  fusionWatchCommentary: text('fusion_watch_commentary'),    // What to watch for
  
  // ========================================
  // GAMMA ASSISTANT RESULTS (Level 1 + Level 2)
  // ========================================
  
  // Level 1 fields
  gammaAsofWeek: text('gamma_asof_week'),
  gammaCycleStagePrimary: text('gamma_cycle_stage_primary'),      // e.g., "Late Expansion"
  gammaCycleStageTransition: text('gamma_cycle_stage_transition'), // Transition commentary
  gammaMacroPostureLabel: text('gamma_macro_posture_label'),       // e.g., "Neutral-to-Cautious"
  gammaHeadlineSummary: text('gamma_headline_summary'),
  
  // Domain data (6 domains) - stored as JSONB for flexibility
  // Each domain has: domain_name, bias_label, strength_label, status_summary, color_code
  gammaDomains: jsonb('gamma_domains'),
  
  // Level 2 fields
  gammaPhaseConfidence: text('gamma_phase_confidence'),       // e.g., "75%"
  gammaCycleTone: text('gamma_cycle_tone'),                   // e.g., "Cautious optimism"
  gammaOverallSummary: text('gamma_overall_summary'),         // Comprehensive summary
  
  // Domain details (6 domains) - stored as JSONB
  // Each has: domain_name, summary, observations, interpretation
  gammaDomainDetails: jsonb('gamma_domain_details'),
  
  // ========================================
  // DELTA ASSISTANT RESULTS (Level 1 + Level 2)
  // ========================================
  
  // Level 1 fields
  deltaAsofDate: text('delta_asof_date'),
  deltaFragilityColor: text('delta_fragility_color'),        // ORANGE, YELLOW, GREEN
  deltaFragilityLabel: text('delta_fragility_label'),        // e.g., "Elevated Internal Risk"
  deltaFragilityScore: integer('delta_fragility_score'),     // Numeric 0-10
  deltaTemplateCode: text('delta_template_code'),            // e.g., "A"
  deltaTemplateName: text('delta_template_name'),            // e.g., "Hollow Highs"
  deltaPatternPlain: text('delta_pattern_plain'),            // e.g., "Late-Stage Strength"
  deltaPostureCode: text('delta_posture_code'),              // e.g., "C"
  deltaPostureLabel: text('delta_posture_label'),            // e.g., "Caution"
  deltaHeadlineSummary: text('delta_headline_summary'),
  deltaKeyDrivers: jsonb('delta_key_drivers'),               // Array of key points
  deltaNextWatchDisplay: jsonb('delta_next_watch_display'),  // Object: signal, condition, meaning
  
  // Level 2 fields
  deltaPhaseUsed: text('delta_phase_used'),                  // e.g., "Late Expansion"
  deltaPhaseConfidence: text('delta_phase_confidence'),      // e.g., "75%"
  
  // Dimension scores (4 dimensions)
  deltaBreadth: integer('delta_breadth'),                    // 0=green, 1=yellow, 2=orange
  deltaLiquidity: integer('delta_liquidity'),
  deltaVolatility: integer('delta_volatility'),
  deltaLeadership: integer('delta_leadership'),
  
  // Dimension commentary
  deltaBreadthText: text('delta_breadth_text'),
  deltaLiquidityText: text('delta_liquidity_text'),
  deltaVolatilityText: text('delta_volatility_text'),
  deltaLeadershipText: text('delta_leadership_text'),
  
  deltaRationaleBullets: jsonb('delta_rationale_bullets'),   // Array of rationale points
  deltaPlainEnglishSummary: text('delta_plain_english_summary'),
  deltaNextTriggersDetail: jsonb('delta_next_triggers_detail'), // Array of trigger objects
  
  // ========================================
  // METADATA
  // ========================================
  
  // Full analysis JSON (backup/reference)
  fullAnalysis: jsonb('full_analysis'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Status Changes Table
 * Tracks when key fields change over time
 */
export const statusChanges = pgTable('status_changes', {
  id: serial('id').primaryKey(),
  fieldName: text('field_name').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value').notNull(),
  changedAt: timestamp('changed_at').notNull().defaultNow(),
  duration: integer('duration'), // days since last change
});

export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type InsertDailySnapshot = typeof dailySnapshots.$inferInsert;
export type StatusChange = typeof statusChanges.$inferSelect;
export type InsertStatusChange = typeof statusChanges.$inferInsert;

