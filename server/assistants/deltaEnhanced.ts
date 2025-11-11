import OpenAI from 'openai';
import { getLatestCSVDate } from './csvUploader';
import { downloadAndFormatCSVsAsText } from './csvTextEmbedder';

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

const DELTA_ASSISTANT_ID = process.env.DELTA_ASSISTANT_ID || 'asst_niipkh0HSLaeuPVwSsB7Y09B';

// Delta Dashboard Chart URLs (14 charts across 4 dimensions)
const DELTA_CHART_BASE_URL = 'https://cyclescope-delta-dashboard-production.up.railway.app/charts/';

const DELTA_CHARTS = [
  // BREADTH (3 charts)
  { id: '01', name: 'SPXA50R', dimension: 'BREADTH' },
  { id: '02', name: 'SPXA150R', dimension: 'BREADTH' },
  { id: '03', name: 'SPXA200R', dimension: 'BREADTH' },
  
  // LIQUIDITY/CREDIT (2 charts)
  { id: '04', name: 'HYG_IEF', dimension: 'LIQUIDITY_CREDIT' },
  { id: '05', name: 'LQD_IEF', dimension: 'LIQUIDITY_CREDIT' },
  
  // VOLATILITY (3 charts)
  { id: '06', name: 'VIX_VXV', dimension: 'VOLATILITY' },
  { id: '07', name: 'VVIX', dimension: 'VOLATILITY' },
  { id: '08', name: 'VIX', dimension: 'VOLATILITY' },
  
  // LEADERSHIP (2 charts)
  { id: '09', name: 'RSP_SPY', dimension: 'LEADERSHIP' },
  { id: '10', name: 'SMH_SPY', dimension: 'LEADERSHIP' },
  
  // OPTIONALS (4 charts)
  { id: '11', name: 'CPCE', dimension: 'OPTIONAL' },
  { id: '12', name: 'XLY_XLP', dimension: 'OPTIONAL' },
  { id: '13', name: 'IWFIWDV', dimension: 'OPTIONAL' },
  { id: '14', name: 'USD', dimension: 'OPTIONAL' },
];

// CSV filenames mapping (14 daily CSV files for Delta)
const DELTA_CSV_FILES = [
  // BREADTH (3 files)
  '_SPXA50R_delta_gpt_daily.csv',
  '_SPXA150R_delta_gpt_daily.csv',
  '_SPXA200R_delta_gpt_daily.csv',
  
  // LIQUIDITY/CREDIT (2 files)
  'HYG_IEF_delta_gpt_daily.csv',
  'LQD_IEF_delta_gpt_daily.csv',
  
  // VOLATILITY (3 files)
  '_VIX_VXV_delta_gpt_daily.csv',
  '_VVIX_delta_gpt_daily.csv',
  '_VIX_delta_gpt_daily.csv',
  
  // LEADERSHIP (2 files)
  'RSP_SPY_delta_gpt_daily.csv',
  'SMH_SPY_delta_gpt_daily.csv',
  
  // OPTIONALS (4 files)
  '_CPCE_delta_gpt_daily.csv',
  'XLY_XLP_delta_gpt_daily.csv',
  'IWF_IWD_delta_gpt_daily.csv',
  '_USD_delta_gpt_daily.csv',
];

export interface DeltaAnalysisResult {
  // Level 1 fields
  asofDate: string;
  fragilityColor: string;
  fragilityLabel: string;
  fragilityScore: number;
  templateCode: string;
  templateName: string;
  patternPlain: string;
  postureCode: string;
  postureLabel: string;
  headlineSummary: string;
  keyDrivers: string[];
  nextWatchDisplay: any;
  
  // Level 2 fields
  phaseUsed: string;
  phaseConfidence: string;
  breadth: number;
  liquidity: number;
  volatility: number;
  leadership: number;
  breadthText: string;
  liquidityText: string;
  volatilityText: string;
  leadershipText: string;
  rationaleBullets: string[];
  plainEnglishSummary: string;
  nextTriggersDetail: any[];
  
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
 * Run Delta Assistant analysis with ENHANCED mode (14 charts + 14 CSV files)
 */
export async function runDeltaEnhancedAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<DeltaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log('🚀🚀🚀 DELTA ENHANCED VERSION: Charts + CSV Data 🚀🚀🚀');
  console.log(`[Delta Enhanced] Starting analysis for ${analysisDate} with 14 charts + 14 CSV files...`);
  
  const client = getOpenAI();
  
  // Step 1: Download and format CSV files as embedded text
  let csvEmbeddedText: string = '';
  try {
    console.log('[Delta Enhanced] Step 1: Downloading and formatting CSV files as text...');
    const latestDate = await getLatestCSVDate();
    console.log(`[Delta Enhanced] Using CSV data from: ${latestDate}`);
    
    csvEmbeddedText = await downloadAndFormatCSVsAsText(latestDate, DELTA_CSV_FILES, 20);
    console.log(`[Delta Enhanced] ✅ Successfully formatted CSV data as embedded text`);
  } catch (error) {
    console.error('[Delta Enhanced] ⚠️ CSV formatting failed:', error);
    console.error('[Delta Enhanced] Continuing with charts only (degraded mode)');
    // Continue without CSV data - charts-only mode
  }
  
  // Step 2: Create thread
  const thread = await client.beta.threads.create();
  
  // Step 3: Prepare chart URLs
  const chartUrls = DELTA_CHARTS.map(chart => 
    `${DELTA_CHART_BASE_URL}${chart.id}_${chart.name}.png`
  );
  
  // BATCH MODE: Send charts in 2 batches (9 + 5) to avoid OpenAI's 10-element content array limit
  console.log('[Delta Enhanced] Using batch mode: 2 batches (9 + 5 charts)');  
  console.log('[Delta Enhanced] Chart URLs to be sent:');
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
  console.log('[Delta Enhanced] Batch 1/2: Sent first 9 charts with embedded CSV data');
  console.log('[Delta Enhanced] Batch 1 URLs:');
  for (let i = 0; i < 9; i++) {
    console.log(`  [${i + 1}] ${chartUrls[i]}`);
  }
  
  // Small delay between batches
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Batch 2: Next 5 charts (CSV data already sent in batch 1)
  const batch2Content: any[] = [
    {
      type: 'text',
      text: 'Batch 2 of 2: Next 5 charts (CSV data provided in previous message)'
    }
  ];
  
  for (let i = 9; i < 14; i++) {
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
  console.log('[Delta Enhanced] Batch 2/2: Sent next 5 charts');
  console.log('[Delta Enhanced] Batch 2 URLs:');
  for (let i = 9; i < 14; i++) {
    console.log(`  [${i + 1}] ${chartUrls[i]}`);
  }
  
  // Run assistant
  console.log('[Delta Enhanced] About to create run with:');
  console.log('  Assistant ID:', DELTA_ASSISTANT_ID);
  console.log('  Thread ID:', thread.id);
  console.log('  Response format: AUTO (Vision API compatible)');
  console.log('  Total images sent:', chartUrls.length);
  console.log('  CSV data: Embedded as text (no attachments)');
  
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: DELTA_ASSISTANT_ID,
    // Note: response_format MUST be omitted when using Vision API (images)
  });
  
  console.log('[Delta Enhanced] Run created successfully');
  console.log('  Run ID:', run.id);
  console.log('  Initial status:', run.status);
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      // CRITICAL: Log OpenAI's actual error reason
      console.error('='.repeat(80));
      console.error('[Delta Enhanced] ❌ RUN FAILED');
      console.error('[Delta Enhanced] Status:', runStatus.status);
      console.error('[Delta Enhanced] Last error:', runStatus.last_error);
      console.error('[Delta Enhanced] Last error (JSON):', JSON.stringify(runStatus.last_error, null, 2));
      console.error('[Delta Enhanced] Run ID:', run.id);
      console.error('[Delta Enhanced] Thread ID:', thread.id);
      console.error('[Delta Enhanced] Assistant ID:', DELTA_ASSISTANT_ID);
      
      // Try to get run steps for more details
      try {
        console.error('[Delta Enhanced] Fetching run steps for debugging...');
        const runSteps = await client.beta.threads.runs.steps.list(thread.id, run.id);
        console.error('[Delta Enhanced] Run steps:', JSON.stringify(runSteps.data, null, 2));
        
        const failedSteps = runSteps.data.filter(step => step.status === 'failed');
        if (failedSteps.length > 0) {
          console.error('[Delta Enhanced] Failed steps:', JSON.stringify(failedSteps, null, 2));
        }
      } catch (stepsError) {
        console.error('[Delta Enhanced] Could not fetch run steps:', stepsError);
      }
      
      console.error('[Delta Enhanced] Full run status:', JSON.stringify(runStatus, null, 2));
      console.error('='.repeat(80));
      throw new Error(`Delta Enhanced analysis failed: ${runStatus.last_error?.message || runStatus.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Delta Enhanced] Status: ${runStatus.status}`);
  }
  
  // Get response
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
    throw new Error('No valid response from Delta Enhanced assistant');
  }
  
  let fullAnalysis = assistantMessage.content[0].text.value;
  
  // Remove markdown code blocks if present (```json ... ```)
  if (fullAnalysis.includes('```')) {
    fullAnalysis = fullAnalysis.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    console.log('[Delta Enhanced] Cleaned response (removed markdown if present)');
  }
  
  // Parse JSON
  let deltaData: any;
  try {
    deltaData = JSON.parse(fullAnalysis);
    console.log('[Delta Enhanced] Successfully parsed JSON output');
  } catch (error) {
    console.error('[Delta Enhanced] Failed to parse JSON:', error);
    console.error('[Delta Enhanced] Raw response:', fullAnalysis.substring(0, 500));
    throw new Error('Failed to parse Delta Enhanced JSON response');
  }
  
  // Extract fields from nested structure
  const level1 = deltaData.level1 || deltaData;
  const level2 = deltaData.level2 || deltaData;
  
  // Extract dimensions and commentary from nested structure
  const dimensions = level2.dimensions || {};
  const dimensionCommentary = level2.dimension_commentary || {};
  
  const result: DeltaAnalysisResult = {
    // Level 1
    asofDate: level1.asof_date || analysisDate,
    fragilityColor: level1.fragility_color || '',
    fragilityLabel: level1.fragility_label || '',
    fragilityScore: level1.fragility_score || 0,
    templateCode: level1.template_code || '',
    templateName: level1.template_name || '',
    patternPlain: level1.pattern_plain || '',
    postureCode: level1.posture_code || '',
    postureLabel: level1.posture_label || '',
    headlineSummary: level1.headline_summary || '',
    keyDrivers: level1.key_drivers || [],
    nextWatchDisplay: level1.next_watch_display || {},
    
    // Level 2 - Extract from correct nested structure
    phaseUsed: level2.phase_used || '',
    phaseConfidence: level2.phase_confidence || '',
    breadth: dimensions.breadth || level2.breadth || 0,
    liquidity: dimensions.liquidity || level2.liquidity || 0,
    volatility: dimensions.volatility || level2.volatility || 0,
    leadership: dimensions.leadership || level2.leadership || 0,
    breadthText: dimensionCommentary.breadth_text || level2.breadth_text || '',
    liquidityText: dimensionCommentary.liquidity_text || level2.liquidity_text || '',
    volatilityText: dimensionCommentary.volatility_text || level2.volatility_text || '',
    leadershipText: dimensionCommentary.leadership_text || level2.leadership_text || '',
    rationaleBullets: level2.rationale_bullets || [],
    plainEnglishSummary: level2.plain_english_summary || '',
    nextTriggersDetail: level2.next_triggers_detail || [],
    
    fullAnalysis: deltaData,
  };
  
  console.log('[Delta Enhanced] Analysis complete - ALL fields extracted');
  console.log('[Delta Enhanced] Fragility:', result.fragilityLabel);
  console.log('[Delta Enhanced] Template:', result.templateName);
  console.log('[Delta Enhanced] CSV data:', csvEmbeddedText ? 'Embedded as text' : 'Not available');
  
  return result;
}

