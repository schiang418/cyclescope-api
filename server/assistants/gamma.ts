import OpenAI from 'openai';
import { runGammaEnhancedAnalysis } from './gammaEnhanced.js';
import { runGammaCsvOnlyAnalysis } from './gammaCsvOnlyV2.js';

// Lazy initialization to ensure env vars are loaded
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',  // Direct OpenAI API
    });
  }
  return openai;
}

const GAMMA_ASSISTANT_ID = process.env.GAMMA_ASSISTANT_ID || 'asst_Ynyur2GgkCWgLKmuqiM8zIt2';

// Gamma Dashboard Chart URLs (18 charts across 6 domains)
const GAMMA_CHART_BASE_URL = 'https://cyclescope-dashboard-production.up.railway.app/charts/';

const GAMMA_CHARTS = [
  // MACRO (4 charts)
  { id: '01', name: 'SPX_Secular_Trend', domain: 'MACRO' },
  { id: '02', name: 'Copper_Gold_Ratio', domain: 'MACRO' },
  { id: '03', name: 'US_Dollar_Index', domain: 'MACRO' },
  { id: '04', name: 'Treasury_10Y_Yields', domain: 'MACRO' },
  
  // CREDIT_LIQUIDITY (3 charts)
  { id: '05', name: 'HYG_IEF_Ratio', domain: 'CREDIT_LIQUIDITY' },
  { id: '06', name: 'JNK_IEF_Ratio', domain: 'CREDIT_LIQUIDITY' },
  { id: '07', name: 'LQD_IEF_Ratio', domain: 'CREDIT_LIQUIDITY' },
  
  // LEADERSHIP (4 charts)
  { id: '08', name: 'XLY_XLP_Ratio', domain: 'LEADERSHIP' },
  { id: '09', name: 'IWF_IWD_Ratio', domain: 'LEADERSHIP' },
  { id: '10', name: 'RSP_SPY_Ratio', domain: 'LEADERSHIP' },
  { id: '11', name: 'XLK_XLP_Ratio', domain: 'LEADERSHIP' },
  { id: '12', name: 'SMH_SPY_Ratio', domain: 'LEADERSHIP' },
  
  // BREADTH (3 charts)
  { id: '13', name: 'SPXA50R', domain: 'BREADTH' },
  { id: '14', name: 'SPXA150R', domain: 'BREADTH' },
  { id: '15', name: 'SPXA200R', domain: 'BREADTH' },
  
  // SENTIMENT (1 chart)
  { id: '16', name: 'CPCE_Put_Call', domain: 'SENTIMENT' },
  
  // VOLATILITY (2 charts)
  { id: '17', name: 'VIX_VXV_Ratio', domain: 'VOLATILITY' },
  { id: '18', name: 'VVIX', domain: 'VOLATILITY' },
];

export interface GammaAnalysisResult {
  // Level 1 fields
  asofWeek: string;
  cycleStagePrimary: string;
  cycleStageTransition: string;
  macroPostureLabel: string;
  headlineSummary: string;
  domains: any[]; // Array of domain objects
  
  // Level 2 fields
  phaseConfidence: string;
  cycleTone: string;
  overallSummary: string;
  domainDetails: any[]; // Array of detailed domain objects
  
  fullAnalysis: any;
}

/**
 * Get current market date in US Eastern Time
 */
function getMarketDate(): string {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return etDate.toISOString().split('T')[0];
}

/**
 * Run Gamma Assistant analysis on 18 charts
 */
export async function runGammaAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<GammaAnalysisResult> {
  // Read environment variable for mode selection
  const enhancedMode = process.env.ENABLE_ENHANCED_ANALYSIS || 'false';
  
  console.log(`[Gamma] ENABLE_ENHANCED_ANALYSIS = ${enhancedMode}`);
  
  // Route to appropriate mode
  if (enhancedMode === 'csv_only') {
    console.log('📊 [Gamma] CSV-Only mode - 18 CSV files (first 2 + last 200 rows), NO charts');
    return runGammaCsvOnlyAnalysis(mode, date);
  } else if (enhancedMode === 'true') {
    console.log('🚀 [Gamma] Enhanced mode - 18 charts + 18 CSV files (first 2 + last 20 rows)');
    return runGammaEnhancedAnalysis(mode, date);
  }
  
  // Standard mode (charts only)
  const analysisDate = date || getMarketDate();
  console.log('🔥🔥🔥 GAMMA VERSION: STANDARD - Charts Only 🔥🔥🔥');
  console.log(`[Gamma] Starting analysis for ${analysisDate} (market date) with 18 charts...`);
  
  const client = getOpenAI();
  
  // Create thread
  const thread = await client.beta.threads.create();
  
  // Prepare chart URLs
  const chartUrls = GAMMA_CHARTS.map(chart => 
    `${GAMMA_CHART_BASE_URL}${chart.id}_${chart.name}.png`
  );
  
  // BATCH MODE: Send charts in 2 batches (9 + 9) for better reliability
  console.log('[Gamma] Using batch mode: 2 batches of 9 charts each');
  console.log('[Gamma] Chart URLs to be sent:');
  chartUrls.forEach((url, i) => console.log(`  [${i + 1}] ${url}`));
  
  // Batch 1: First 9 charts with prompt
  const batch1Content: any[] = [
    {
      type: 'text',
      text: `${mode}\n\nIMPORTANT: Use this exact date in your output:\nAnalysis Date: ${analysisDate}\n\nFor JSON output, use this date in the "asof_date" field in BOTH level1 and level2:\n"asof_date": "${analysisDate}"\n\nPlease analyze the provided charts and return ONLY valid JSON (no text before or after).\nThe output must be directly parseable by JSON.parse().\n\nBatch 1 of 2: First 9 charts`
    }
  ];
  
  for (let i = 0; i < 9; i++) {
    batch1Content.push({
      type: 'image_url',
      image_url: { url: chartUrls[i] }
    });
  }
  
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: batch1Content,
  });
  console.log('[Gamma] Batch 1/2: Sent first 9 charts');
  console.log('[Gamma] Batch 1 URLs:');
  for (let i = 0; i < 9; i++) {
    console.log(`  [${i + 1}] ${chartUrls[i]}`);
  }
  
  // Small delay between batches
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Batch 2: Next 9 charts
  const batch2Content: any[] = [
    {
      type: 'text',
      text: 'Batch 2 of 2: Next 9 charts'
    }
  ];
  
  for (let i = 9; i < 18; i++) {
    batch2Content.push({
      type: 'image_url',
      image_url: { url: chartUrls[i] }
    });
  }
  
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: batch2Content,
  });
  console.log('[Gamma] Batch 2/2: Sent next 9 charts');
  console.log('[Gamma] Batch 2 URLs:');
  for (let i = 9; i < 18; i++) {
    console.log(`  [${i + 1}] ${chartUrls[i]}`);
  }
  
  // Run assistant with explicit text response format
  console.log('[Gamma] About to create run with:');
  console.log('  Assistant ID:', GAMMA_ASSISTANT_ID);
  console.log('  Thread ID:', thread.id);
  console.log('  Response format: AUTO (Vision API compatible)');
  console.log('  Total images sent:', chartUrls.length);
  
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: GAMMA_ASSISTANT_ID,
    tool_choice: "none",                        // Disable tools to prevent initialization crashes
    response_format: { type: "json_object" },   // Force JSON output
    temperature: 0,                             // Ensure consistency
  });
  
  console.log('[Gamma] Run created successfully');
  console.log('  Run ID:', run.id);
  console.log('  Initial status:', run.status);
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      // CRITICAL: Log OpenAI's actual error reason
      console.error('='.repeat(80));
      console.error('[Gamma] ❌ RUN FAILED');
      console.error('[Gamma] Status:', runStatus.status);
      console.error('[Gamma] Last error:', runStatus.last_error);
      console.error('[Gamma] Last error (JSON):', JSON.stringify(runStatus.last_error, null, 2));
      console.error('[Gamma] Run ID:', run.id);
      console.error('[Gamma] Thread ID:', thread.id);
      console.error('[Gamma] Assistant ID:', GAMMA_ASSISTANT_ID);
      console.error('[Gamma] Full run status:', JSON.stringify(runStatus, null, 2));
      console.error('='.repeat(80));
      throw new Error(`Gamma analysis failed: ${runStatus.last_error?.message || runStatus.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Gamma] Status: ${runStatus.status}`);
  }
  
  // Get response
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
    throw new Error('No valid response from Gamma assistant');
  }
  
  let fullAnalysis = assistantMessage.content[0].text.value;
  
  // Remove markdown code blocks if present (```json ... ```)
  fullAnalysis = fullAnalysis.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  console.log('[Gamma] Cleaned response (removed markdown if present)');
  
  // Parse JSON output (mode='engine' always returns JSON)
  const gammaData = JSON.parse(fullAnalysis);
  console.log('[Gamma] Successfully parsed JSON output');
  
  // Extract ALL fields from JSON
  // Support both nested and flat structures for backward compatibility
  const cycleStage = gammaData.level1.cycle_stage || {};
  const domainStatus = gammaData.level1.domain_status || {};
  const overallSummary = gammaData.level1.overall_summary || {};
  
  // Convert domain_status object to domains array if needed
  let domains = gammaData.level1.domains;
  if (!domains && domainStatus) {
    domains = Object.entries(domainStatus).map(([name, data]: [string, any]) => ({
      domain_name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      observations: data.observations || '',
      interpretation: data.interpretation || '',
      bias_label: data.bias || 'Neutral',
      bias_emoji: data.bias_emoji || '🟡',
      strength_label: data.strength || 'Medium',
      status_summary: data.interpretation || '',
      color_code: data.bias_emoji || '🟡'
    }));
  }
  
  const result: GammaAnalysisResult = {
    // Level 1 - support both nested and flat structures
    asofWeek: gammaData.level1.asof_week,
    cycleStagePrimary: cycleStage.primary || gammaData.level1.cycle_stage_primary || 'Unknown',
    cycleStageTransition: cycleStage.transition || gammaData.level1.cycle_stage_transition || 'Monitoring',
    macroPostureLabel: cycleStage.macro_posture || gammaData.level1.macro_posture_label || 'Neutral',
    headlineSummary: overallSummary.summary || gammaData.level1.headline_summary || 'Analysis complete',
    domains: domains || [],
    
    // Level 2 - support both nested and flat structures
    phaseConfidence: cycleStage.phase_confidence || gammaData.level2.phase_confidence || '75%',
    cycleTone: cycleStage.tone || gammaData.level2.cycle_tone || 'Neutral',
    overallSummary: gammaData.level2.overall_summary || overallSummary.summary || 'Analysis complete',
    domainDetails: gammaData.level2.domain_details || [],
    
    fullAnalysis: gammaData,
  };
  
  console.log('[Gamma] Analysis complete - ALL fields extracted');
  console.log('[Gamma] Cycle stage:', result.cycleStagePrimary);
  console.log('[Gamma] Domains extracted:', Array.isArray(result.domains) ? result.domains.length : 'N/A');
  
  return result;
}

