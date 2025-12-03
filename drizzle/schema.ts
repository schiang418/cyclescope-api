import { pgTable, serial, text, timestamp, jsonb, integer, date, varchar, unique } from 'drizzle-orm/pg-core';

/**
 * Daily Snapshots Table - COMPLETE VERSION
 * Stores ALL analysis results from Gamma, Delta, and Fusion assistants
 * Every field maps to a display element in the portal
 */
export const dailySnapshots = pgTable('daily_snapshots', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(), // One snapshot per day (date only, no time)
  
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
  // DELTA V2 ASSISTANT RESULTS (Layer 1 + Layer 2)
  // ========================================
  
  // Metadata
  deltaV2AsofDate: text('delta_v2_asof_date'),
  deltaV2SchemaVersion: text('delta_v2_schema_version'),
  deltaV2CreatedAt: timestamp('delta_v2_created_at'),
  
  // Layer 1 fields (3 fields)
  deltaV2MarketCondition: text('delta_v2_market_condition'),
  deltaV2TurningPoint: text('delta_v2_turning_point'),
  deltaV2Outlook12Month: text('delta_v2_outlook_1_2_month'),
  
  // Layer 2 fields
  deltaV2Domains: jsonb('delta_v2_domains'),                           // 7 domain paragraphs
  deltaV2TurningPointEvidence: jsonb('delta_v2_turning_point_evidence'), // 3 evidence paragraphs
  deltaV2OutlookParagraph: text('delta_v2_outlook_paragraph'),
  deltaV2FullAnalysis: jsonb('delta_v2_full_analysis'),                // Complete JSON backup
  
  // ========================================
  // METADATA
  // ========================================
  
  // Full analysis JSON (backup/reference)
  fullAnalysis: jsonb('full_analysis'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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


/**
 * Secular Analysis Table
 * 
 * Stores long-term market trend analysis with scenario projections.
 * Used by cyclescope-secular project for secular market analysis.
 * 
 * WARNING: This table is shared across multiple projects.
 * DO NOT modify or delete without coordination.
 */
export const secularAnalysis = pgTable('secular_analysis', {
  // Primary Key & Date
  id: serial('id').primaryKey(),
  asofDate: date('asof_date').notNull().unique(),
  
  // Layer 1: Core Analysis Fields (7 columns)
  secularTrend: text('secular_trend'),
  secularRegimeStatus: varchar('secular_regime_status', { length: 100 }),
  channelPosition: varchar('channel_position', { length: 100 }),
  recentBehaviorSummary: text('recent_behavior_summary'),
  interpretation: text('interpretation'),
  riskBias: text('risk_bias'),
  summarySignal: text('summary_signal'),
  
  // Layer 2: Scenario Analysis Metadata (3 columns)
  dominantDynamics: text('dominant_dynamics'),
  overallBias: text('overall_bias'),
  secularSummary: text('secular_summary'),
  
  // Layer 2: Scenario 1 (9 columns)
  scenario1Id: varchar('scenario1_id', { length: 10 }),
  scenario1Name: varchar('scenario1_name', { length: 100 }),
  scenario1Probability: text('scenario1_probability'),
  scenario1PathSummary: text('scenario1_path_summary'),
  scenario1TechnicalLogic: text('scenario1_technical_logic'),
  scenario1TargetZone: text('scenario1_target_zone'),
  scenario1ExpectedMoveMin: text('scenario1_expected_move_min'),
  scenario1ExpectedMoveMax: text('scenario1_expected_move_max'),
  scenario1RiskProfile: text('scenario1_risk_profile'),
  
  // Layer 2: Scenario 2 (9 columns)
  scenario2Id: varchar('scenario2_id', { length: 10 }),
  scenario2Name: varchar('scenario2_name', { length: 100 }),
  scenario2Probability: text('scenario2_probability'),
  scenario2PathSummary: text('scenario2_path_summary'),
  scenario2TechnicalLogic: text('scenario2_technical_logic'),
  scenario2TargetZone: text('scenario2_target_zone'),
  scenario2ExpectedMoveMin: text('scenario2_expected_move_min'),
  scenario2ExpectedMoveMax: text('scenario2_expected_move_max'),
  scenario2RiskProfile: text('scenario2_risk_profile'),
  
  // Layer 2: Scenario 3 (9 columns)
  scenario3Id: varchar('scenario3_id', { length: 10 }),
  scenario3Name: varchar('scenario3_name', { length: 100 }),
  scenario3Probability: text('scenario3_probability'),
  scenario3PathSummary: text('scenario3_path_summary'),
  scenario3TechnicalLogic: text('scenario3_technical_logic'),
  scenario3TargetZone: text('scenario3_target_zone'),
  scenario3ExpectedMoveMin: text('scenario3_expected_move_min'),
  scenario3ExpectedMoveMax: text('scenario3_expected_move_max'),
  scenario3RiskProfile: text('scenario3_risk_profile'),
  
  // Layer 2: Scenario 4 (9 columns)
  scenario4Id: varchar('scenario4_id', { length: 10 }),
  scenario4Name: varchar('scenario4_name', { length: 100 }),
  scenario4Probability: text('scenario4_probability'),
  scenario4PathSummary: text('scenario4_path_summary'),
  scenario4TechnicalLogic: text('scenario4_technical_logic'),
  scenario4TargetZone: text('scenario4_target_zone'),
  scenario4ExpectedMoveMin: text('scenario4_expected_move_min'),
  scenario4ExpectedMoveMax: text('scenario4_expected_move_max'),
  scenario4RiskProfile: text('scenario4_risk_profile'),
  
  // Layer 3: Summary Fields (5 columns)
  scenarioSummary1: text('scenario_summary_1'),
  scenarioSummary2: text('scenario_summary_2'),
  scenarioSummary3: text('scenario_summary_3'),
  scenarioSummary4: text('scenario_summary_4'),
  primaryMessage: text('primary_message'),
  
  // File References (2 columns)
  originalChartUrl: text('original_chart_url'),
  annotatedChartUrl: text('annotated_chart_url'),
  
  // Timestamps (2 columns)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SecularAnalysis = typeof secularAnalysis.$inferSelect;
export type InsertSecularAnalysis = typeof secularAnalysis.$inferInsert;

/**
 * Domain Analyses Table
 * 
 * Stores detailed domain analysis data from OpenAI Assistant.
 * Each domain (Macro, Leadership, Breadth, Liquidity, Volatility, Sentiment) 
 * gets one record per day.
 * 
 * Used by cyclescope-domain-api project for domain-specific analysis.
 * 
 * WARNING: This table is shared across multiple projects.
 * DO NOT modify or delete without coordination.
 * 
 * Retention: 5 days (older records automatically deleted)
 */
export const domainAnalyses = pgTable('domain_analyses', {
  id: serial('id').primaryKey(),
  
  // Composite unique key: one record per domain per day
  date: date('date').notNull(),
  dimensionCode: varchar('dimension_code', { length: 20 }).notNull(),
  
  // Metadata
  dimensionName: varchar('dimension_name', { length: 100 }).notNull(),
  asOfDate: date('as_of_date').notNull(),
  
  // Full analysis JSON (5-10 KB per domain)
  // Contains complete Assistant response including all indicators
  fullAnalysis: jsonb('full_analysis').notNull(),
  
  // Extracted fields for quick queries (avoid parsing JSONB)
  indicatorCount: integer('indicator_count'),
  integratedReadBullets: jsonb('integrated_read_bullets'),
  overallConclusionSummary: text('overall_conclusion_summary'),
  toneHeadline: text('tone_headline'),
  toneBullets: jsonb('tone_bullets'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Ensure only one record per domain per day
  uniqueDomainPerDay: unique().on(table.date, table.dimensionCode),
}));

export type DomainAnalysis = typeof domainAnalyses.$inferSelect;
export type InsertDomainAnalysis = typeof domainAnalyses.$inferInsert;
