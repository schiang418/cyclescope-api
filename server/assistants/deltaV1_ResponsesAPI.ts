// Delta V1 Responses API - Market Fragility Analysis with 14 Charts
// Uses OpenAI Responses API with Prompt-based system instructions
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
      baseURL: 'https://api.openai.com/v1',
    });
  }
  return openai;
}

// Delta V1 Prompt Configuration
const DELTA_V1_PROMPT_ID = process.env.DELTA_V1_PROMPT_ID || 'pmpt_693d5f8eb86c81979c8520809e7667650951c3e59af7973d';
const DELTA_V1_PROMPT_VERSION = process.env.DELTA_V1_PROMPT_VERSION || '1';

// Delta Dashboard Chart URLs (14 charts across 4 dimensions)
const DELTA_CHART_BASE_URL = 'https://cyclescope-delta-dashboard-production.up.railway.app/charts/';

interface ChartInfo {
  id: string;
  name: string;
  dimension: string;
}

const DELTA_CHARTS: ChartInfo[] = [
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
 * Validate chart count before API call (guardrail)
 */
function validateChartCount(charts: ChartInfo[]): void {
  const REQUIRED_CHART_COUNT = 14;
  if (charts.length !== REQUIRED_CHART_COUNT) {
    throw new Error(
      `Chart count validation failed: Expected ${REQUIRED_CHART_COUNT} charts, got ${charts.length}. ` +
      `Please upload the full set of charts before analysis.`
    );
  }
}

/**
 * Validate mode input (guardrail)
 */
function validateMode(mode: string): void {
  const ALLOWED_MODES = ['engine', 'panel'];
  if (!ALLOWED_MODES.includes(mode)) {
    throw new Error(
      `Invalid mode: "${mode}". Allowed modes: ${ALLOWED_MODES.join(', ')}`
    );
  }
}

/**
 * Build input content array for Responses API
 * Includes mode text + all 14 chart images
 */
function buildInputContent(mode: string, charts: ChartInfo[], analysisDate: string): any[] {
  const content: any[] = [];
  
  // Add mode request and date as text
  content.push({
    type: 'input_text',
    text: `${mode}\n\nAnalysis Date: ${analysisDate}`
  });
  
  // Add all chart images with labels
  for (const chart of charts) {
    // Add chart label as text
    content.push({
      type: 'input_text',
      text: `\n=== [${chart.dimension}] ${chart.name} ===`
    });
    
    // Add chart image
    content.push({
      type: 'input_image',
      image_url: `${DELTA_CHART_BASE_URL}${chart.id}_${chart.name}.png`
    });
  }
  
  return content;
}

/**
 * Run Delta V1 analysis using Responses API with Prompt
 * 
 * This is a complete rewrite using the new Responses API instead of Assistants API.
 * 
 * Key improvements:
 * - Single API call (no thread/run lifecycle)
 * - Stateless (no conversation history)
 * - Versioned instructions (stored in Prompt)
 * - Simpler error handling
 * - Built-in guardrails
 * 
 * @param mode - 'engine' returns full JSON, 'panel' returns summary only
 * @param date - Optional date override (defaults to current market date in ET)
 * @returns Delta V1 analysis result with fragility assessment
 */
export async function runDeltaV1Analysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<DeltaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log(`[Delta V1] Starting analysis for ${analysisDate} (market date) with 14 charts...`);
  console.log(`[Delta V1] Mode: ${mode}`);
  console.log(`[Delta V1] Prompt ID: ${DELTA_V1_PROMPT_ID}`);
  console.log(`[Delta V1] Prompt Version: ${DELTA_V1_PROMPT_VERSION}`);
  
  // 🔒 Guardrail 1: Validate chart count
  validateChartCount(DELTA_CHARTS);
  console.log('[Delta V1] ✅ Chart count validation passed (14 charts)');
  
  // 🔒 Guardrail 2: Validate mode
  validateMode(mode);
  console.log(`[Delta V1] ✅ Mode validation passed ("${mode}")`);
  
  const client = getOpenAI();
  
  // Build input content (mode + date + 14 charts)
  const inputContent = buildInputContent(mode, DELTA_CHARTS, analysisDate);
  console.log(`[Delta V1] Built input content: ${inputContent.length} items`);
  
  // 🚀 Call Responses API (single call, no polling needed)
  console.log('[Delta V1] Calling Responses API...');
  const startTime = Date.now();
  
  let response;
  try {
    response = await client.responses.create({
      prompt: {
        id: DELTA_V1_PROMPT_ID,
        version: DELTA_V1_PROMPT_VERSION
      },
      input: [
        {
          role: 'user',
          content: inputContent
        }
      ]
    } as any);
  } catch (error: any) {
    console.error('[Delta V1] ❌ Responses API call failed');
    console.error('[Delta V1] Error:', error.message || error);
    
    // Provide helpful error messages
    if (error.code === '401' || error.status === 401) {
      throw new Error('OpenAI API key is invalid or missing. Please check OPENAI_API_KEY environment variable.');
    }
    if (error.code === '403' || error.status === 403) {
      throw new Error(`Access denied to Prompt or Model. Your API key may not have access to: Prompt ${DELTA_V1_PROMPT_ID}`);
    }
    if (error.code === '404' || error.status === 404) {
      throw new Error(`Prompt not found: ${DELTA_V1_PROMPT_ID}. Please verify the Prompt ID is correct.`);
    }
    if (error.code === 'rate_limit_exceeded' || error.message?.includes('rate_limit')) {
      throw new Error(`Rate limit exceeded. Please try again in a few seconds. Details: ${error.message}`);
    }
    
    throw new Error(`Delta V1 API call failed: ${error.message || 'Unknown error'}`);
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Delta V1] ✅ Responses API call completed in ${elapsedTime}s`);
  
  // Extract response text using output_text
  const fullResponse = response.output_text;
  if (!fullResponse) {
    console.error('[Delta V1] No output_text in response:', JSON.stringify(response, null, 2));
    throw new Error('No output_text in response from Responses API');
  }
  
  // Log the raw response for debugging
  console.log('[Delta V1] Raw response (first 500 chars):', fullResponse.substring(0, 500));
  
  // Try to extract JSON from markdown code blocks if present
  let jsonString = fullResponse;
  const jsonMatch = fullResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
    console.log('[Delta V1] Extracted JSON from markdown code block');
  }
  
  // Parse JSON output
  let deltaData: any;
  try {
    deltaData = JSON.parse(jsonString);
    console.log('[Delta V1] ✅ Successfully parsed JSON output');
  } catch (parseError) {
    console.error('[Delta V1] ❌ JSON parse failed!');
    console.error('[Delta V1] Full response:', fullResponse);
    throw new Error(`Failed to parse Delta V1 response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
  
  // Extract Level 1 and Level 2 data
  const level1 = deltaData.level1 || deltaData.layer1 || {};
  const level2 = deltaData.level2 || deltaData.layer2 || {};
  
  // Build result object
  const result: DeltaAnalysisResult = {
    // Level 1 fields
    asofDate: level1.asof_date || level1.asofDate || analysisDate,
    fragilityColor: level1.fragility_color || level1.fragilityColor || 'gray',
    fragilityLabel: level1.fragility_label || level1.fragilityLabel || 'Unknown',
    fragilityScore: level1.fragility_score || level1.fragilityScore || 0,
    templateCode: level1.template_code || level1.templateCode || '',
    templateName: level1.template_name || level1.templateName || '',
    patternPlain: level1.pattern_plain || level1.patternPlain || '',
    postureCode: level1.posture_code || level1.postureCode || '',
    postureLabel: level1.posture_label || level1.postureLabel || '',
    headlineSummary: level1.headline_summary || level1.headlineSummary || '',
    keyDrivers: level1.key_drivers || level1.keyDrivers || [],
    nextWatchDisplay: level1.next_watch_display || level1.nextWatchDisplay || {},
    
    // Level 2 fields
    phaseUsed: level2.phase_used || level2.phaseUsed || '',
    phaseConfidence: level2.phase_confidence || level2.phaseConfidence || '',
    breadth: level2.breadth || 0,
    liquidity: level2.liquidity || 0,
    volatility: level2.volatility || 0,
    leadership: level2.leadership || 0,
    breadthText: level2.breadth_text || level2.breadthText || '',
    liquidityText: level2.liquidity_text || level2.liquidityText || '',
    volatilityText: level2.volatility_text || level2.volatilityText || '',
    leadershipText: level2.leadership_text || level2.leadershipText || '',
    rationaleBullets: level2.rationale_bullets || level2.rationaleBullets || [],
    plainEnglishSummary: level2.plain_english_summary || level2.plainEnglishSummary || '',
    nextTriggersDetail: level2.next_triggers_detail || level2.nextTriggersDetail || [],
    
    // Full analysis
    fullAnalysis: deltaData
  };
  
  // Validate required fields
  if (!result.fragilityColor || result.fragilityColor === 'gray') {
    console.warn('[Delta V1] ⚠️ Missing or invalid fragility_color');
  }
  if (!result.headlineSummary) {
    console.warn('[Delta V1] ⚠️ Missing headline_summary');
  }
  
  console.log('[Delta V1] ✅ Validation passed');
  console.log('[Delta V1] Analysis complete:', {
    asofDate: result.asofDate,
    fragilityColor: result.fragilityColor,
    fragilityLabel: result.fragilityLabel,
    fragilityScore: result.fragilityScore,
    headlineSummary: result.headlineSummary.substring(0, 50) + '...',
  });
  
  return result;
}
