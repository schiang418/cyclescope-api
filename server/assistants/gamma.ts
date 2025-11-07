import OpenAI from 'openai';

// Lazy initialization to ensure env vars are loaded
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

const GAMMA_ASSISTANT_ID = process.env.GAMMA_ASSISTANT_ID || 'asst_Ynyur2GgkCWgLKmuqiM8zIt2';

// Gamma Dashboard Chart URLs (18 charts across 6 domains)
const GAMMA_CHART_BASE_URL = 'https://cyclescope-dashboard-production.up.railway.app/charts/';

const GAMMA_CHARTS = [
  // MACRO (3 charts)
  { id: '01', name: 'SPX_Secular_Trend', domain: 'MACRO' },
  { id: '02', name: 'Yield_Curve', domain: 'MACRO' },
  { id: '03', name: 'Dollar_Index', domain: 'MACRO' },
  
  // LEADERSHIP (3 charts)
  { id: '04', name: 'SPX_vs_EW', domain: 'LEADERSHIP' },
  { id: '05', name: 'Tech_Leadership', domain: 'LEADERSHIP' },
  { id: '06', name: 'Cyclical_Defensive', domain: 'LEADERSHIP' },
  
  // BREADTH (3 charts)
  { id: '07', name: 'Advance_Decline', domain: 'BREADTH' },
  { id: '08', name: 'New_Highs_Lows', domain: 'BREADTH' },
  { id: '09', name: 'Percent_Above_MA', domain: 'BREADTH' },
  
  // CREDIT (3 charts)
  { id: '10', name: 'Credit_Spreads', domain: 'CREDIT' },
  { id: '11', name: 'High_Yield', domain: 'CREDIT' },
  { id: '12', name: 'TED_Spread', domain: 'CREDIT' },
  
  // VOLATILITY (3 charts)
  { id: '13', name: 'VIX', domain: 'VOLATILITY' },
  { id: '14', name: 'VVIX', domain: 'VOLATILITY' },
  { id: '15', name: 'Put_Call_Ratio', domain: 'VOLATILITY' },
  
  // SENTIMENT (3 charts)
  { id: '16', name: 'AAII_Survey', domain: 'SENTIMENT' },
  { id: '17', name: 'CNN_Fear_Greed', domain: 'SENTIMENT' },
  { id: '18', name: 'Margin_Debt', domain: 'SENTIMENT' },
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
  const analysisDate = date || getMarketDate();
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
  
  // Run assistant with explicit text response format
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: GAMMA_ASSISTANT_ID,
    response_format: { type: 'text' },
  });
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      // Log detailed error information from OpenAI
      console.error('[Gamma] Run failed with status:', runStatus.status);
      console.error('[Gamma] Last error:', JSON.stringify(runStatus.last_error, null, 2));
      console.error('[Gamma] Full run status:', JSON.stringify(runStatus, null, 2));
      throw new Error(`Gamma analysis failed: ${runStatus.status}. Error: ${JSON.stringify(runStatus.last_error)}`);
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

