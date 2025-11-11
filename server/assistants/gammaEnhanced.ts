import OpenAI from 'openai';
import { getLatestCSVDate } from './csvUploader.js';
import { downloadAndFormatCSVsAsText } from './csvTextEmbedder.js';

// Lazy initialization to ensure env vars are loaded
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',  // Override Manus proxy
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
  
  // LEADERSHIP (5 charts)
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

// CSV filenames mapping (18 weekly CSV files for Gamma)
const GAMMA_CSV_FILES = [
  // MACRO (4 files)
  '_SPX_for_gpt_weekly.csv',
  '_COPPER_GOLD_for_gpt_weekly.csv',
  '_DXY_for_gpt_weekly.csv',
  '_TNX_for_gpt_weekly.csv',
  
  // CREDIT_LIQUIDITY (3 files)
  'HYG_IEF_for_gpt_weekly.csv',
  'JNK_IEF_for_gpt_weekly.csv',
  'LQD_IEF_for_gpt_weekly.csv',
  
  // LEADERSHIP (5 files)
  'XLY_XLP_for_gpt_weekly.csv',
  'IWF_IWD_for_gpt_weekly.csv',
  'RSP_SPY_for_gpt_weekly.csv',
  'XLK_XLP_for_gpt_weekly.csv',
  'SMH_SPY_for_gpt_weekly.csv',
  
  // BREADTH (3 files)
  '_SPXA50R_for_gpt_weekly.csv',
  '_SPXA150R_for_gpt_weekly.csv',
  '_SPXA200R_for_gpt_weekly.csv',
  
  // SENTIMENT (1 file)
  '_CPCE_for_gpt_weekly.csv',
  
  // VOLATILITY (2 files)
  '_VIX_VXV_for_gpt_weekly.csv',
  '_VVIX_for_gpt_weekly.csv',
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
 * Run Gamma Assistant analysis with ENHANCED mode (18 charts + 18 CSV files)
 */
export async function runGammaEnhancedAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<GammaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log('🚀🚀🚀 GAMMA ENHANCED VERSION: Charts + CSV Data 🚀🚀🚀');
  console.log(`[Gamma Enhanced] Starting analysis for ${analysisDate} with 18 charts + 18 CSV files...`);
  
  const client = getOpenAI();
  
  // Step 1: Download and format CSV files as embedded text
  let csvEmbeddedText: string = '';
  try {
    console.log('[Gamma Enhanced] Step 1: Downloading and formatting CSV files as text...');
    const latestDate = await getLatestCSVDate();
    console.log(`[Gamma Enhanced] Using CSV data from: ${latestDate}`);
    
    csvEmbeddedText = await downloadAndFormatCSVsAsText(latestDate, GAMMA_CSV_FILES, 20);
    console.log(`[Gamma Enhanced] ✅ Successfully formatted CSV data as embedded text`);
  } catch (error) {
    console.error('[Gamma Enhanced] ⚠️ CSV formatting failed:', error);
    console.error('[Gamma Enhanced] Continuing with charts only (degraded mode)');
    // Continue without CSV data - charts-only mode
  }
  
  // Step 2: Create thread
  const thread = await client.beta.threads.create();
  
  // Step 3: Prepare chart URLs
  const chartUrls = GAMMA_CHARTS.map(chart => 
    `${GAMMA_CHART_BASE_URL}${chart.id}_${chart.name}.png`
  );
  
  // BATCH MODE: Send charts in 2 batches (9 + 9) for better reliability
  console.log('[Gamma Enhanced] Using batch mode: 2 batches of 9 charts each');
  console.log('[Gamma Enhanced] Chart URLs to be sent:');
  chartUrls.forEach((url, i) => console.log(`  [${i + 1}] ${url}`));
  
  // Batch 1: First 9 charts with prompt + embedded CSV data
  const batch1Text = [
    mode,
    '',
    'IMPORTANT: Use this exact date in your output:',
    `Analysis Date: ${analysisDate}`,
    '',
    'For JSON output, use this date in the "asof_date" field in BOTH level1 and level2:',
    `"asof_date": "${analysisDate}"`,
    '',
    'Please analyze the provided charts and CSV data below, and return ONLY valid JSON (no text before or after).',
    'The output must be directly parseable by JSON.parse().',
    '',
    '---',
    '',
    csvEmbeddedText,  // Embed CSV data as text
    '',
    '---',
    '',
    'Batch 1 of 2: First 9 charts'
  ].join('\n');
  
  const batch1Content: any[] = [
    {
      type: 'text',
      text: batch1Text
    }
  ];
  
  for (let i = 0; i < 9; i++) {
    batch1Content.push({
      type: 'image_url',
      image_url: { url: chartUrls[i] }
    });
  }
  
  // No attachments needed - CSV data is embedded in text
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: batch1Content,
  });
  console.log('[Gamma Enhanced] Batch 1/2: Sent first 9 charts with embedded CSV data');
  console.log('[Gamma Enhanced] Batch 1 URLs:');
  for (let i = 0; i < 9; i++) {
    console.log(`  [${i + 1}] ${chartUrls[i]}`);
  }
  
  // Small delay between batches
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Batch 2: Next 9 charts (CSV data already sent in batch 1)
  const batch2Content: any[] = [
    {
      type: 'text',
      text: 'Batch 2 of 2: Next 9 charts (CSV data provided in previous message)'
    }
  ];
  
  for (let i = 9; i < 18; i++) {
    batch2Content.push({
      type: 'image_url',
      image_url: { url: chartUrls[i] }
    });
  }
  
  // No attachments needed - CSV data already embedded in batch 1
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: batch2Content,
  });
  console.log('[Gamma Enhanced] Batch 2/2: Sent next 9 charts');
  console.log('[Gamma Enhanced] Batch 2 URLs:');
  for (let i = 9; i < 18; i++) {
    console.log(`  [${i + 1}] ${chartUrls[i]}`);
  }
  
  // Run assistant with explicit text response format
  console.log('[Gamma Enhanced] About to create run with:');
  console.log('  Assistant ID:', GAMMA_ASSISTANT_ID);
  console.log('  Thread ID:', thread.id);
  console.log('  Response format: AUTO (Vision API compatible)');
  console.log('  Total images sent:', chartUrls.length);
  console.log('  CSV data: Embedded as text (no attachments)');
  
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: GAMMA_ASSISTANT_ID,
    // Note: response_format MUST be omitted when using Vision API (images)
    // Setting response_format with images causes 'invalid_image_format' error
  });
  
  console.log('[Gamma Enhanced] Run created successfully');
  console.log('  Run ID:', run.id);
  console.log('  Initial status:', run.status);
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      // CRITICAL: Log OpenAI's actual error reason
      console.error('='.repeat(80));
      console.error('[Gamma Enhanced] ❌ RUN FAILED');
      console.error('[Gamma Enhanced] Status:', runStatus.status);
      console.error('[Gamma Enhanced] Last error:', runStatus.last_error);
      console.error('[Gamma Enhanced] Last error (JSON):', JSON.stringify(runStatus.last_error, null, 2));
      console.error('[Gamma Enhanced] Run ID:', run.id);
      console.error('[Gamma Enhanced] Thread ID:', thread.id);
      console.error('[Gamma Enhanced] Assistant ID:', GAMMA_ASSISTANT_ID);
      
      // NEW: Try to get run steps for more details
      try {
        console.error('[Gamma Enhanced] Fetching run steps for debugging...');
        const runSteps = await client.beta.threads.runs.steps.list(thread.id, run.id);
        console.error('[Gamma Enhanced] Run steps:', JSON.stringify(runSteps.data, null, 2));
        
        // Check for specific step failures
        const failedSteps = runSteps.data.filter(step => step.status === 'failed');
        if (failedSteps.length > 0) {
          console.error('[Gamma Enhanced] Failed steps:', JSON.stringify(failedSteps, null, 2));
        }
      } catch (stepsError) {
        console.error('[Gamma Enhanced] Could not fetch run steps:', stepsError);
      }
      
      // NEW: Try to get thread messages to see what was sent
      try {
        console.error('[Gamma Enhanced] Fetching thread messages for debugging...');
        const threadMessages = await client.beta.threads.messages.list(thread.id);
        console.error('[Gamma Enhanced] Thread messages count:', threadMessages.data.length);
        threadMessages.data.forEach((msg, idx) => {
          console.error(`[Gamma Enhanced] Message ${idx + 1}:`, {
            role: msg.role,
            content_type: msg.content[0]?.type,
            attachments_count: msg.attachments?.length || 0,
          });
        });
      } catch (messagesError) {
        console.error('[Gamma Enhanced] Could not fetch thread messages:', messagesError);
      }
      
      console.error('[Gamma Enhanced] Full run status:', JSON.stringify(runStatus, null, 2));
      console.error('='.repeat(80));
      throw new Error(`Gamma Enhanced analysis failed: ${runStatus.last_error?.message || runStatus.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Gamma Enhanced] Status: ${runStatus.status}`);
  }
  
  // Get response
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
    throw new Error('No valid response from Gamma Enhanced assistant');
  }
  
  let fullAnalysis = assistantMessage.content[0].text.value;
  
  // Remove markdown code blocks if present (```json ... ```)
  fullAnalysis = fullAnalysis.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  console.log('[Gamma Enhanced] Cleaned response (removed markdown if present)');
  
  // Parse JSON output (mode='engine' always returns JSON)
  const gammaData = JSON.parse(fullAnalysis);
  console.log('[Gamma Enhanced] Successfully parsed JSON output');
  
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
  
  console.log('[Gamma Enhanced] Analysis complete - ALL fields extracted');
  console.log('[Gamma Enhanced] Cycle stage:', result.cycleStagePrimary);
  console.log('[Gamma Enhanced] Domains extracted:', Array.isArray(result.domains) ? result.domains.length : 'N/A');
  console.log('[Gamma Enhanced] CSV data:', csvEmbeddedText ? 'Embedded as text' : 'Not available');
  
  return result;
}

