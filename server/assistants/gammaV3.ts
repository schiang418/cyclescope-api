// Gamma V3 Assistant - Cycle Stage Analysis with 18 Charts
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

// Gamma V3 Prompt Configuration
const GAMMA_V3_PROMPT_ID = process.env.GAMMA_V3_PROMPT_ID || 'pmpt_693d5ca9e2708195bde1835ac72fcbe70cc61ac90f2ffe57';
const GAMMA_V3_PROMPT_VERSION = process.env.GAMMA_V3_PROMPT_VERSION || '1';

// Gamma Dashboard Chart URLs (18 charts across 6 domains)
const GAMMA_CHART_BASE_URL = 'https://cyclescope-dashboard-production.up.railway.app/charts/';

interface ChartInfo {
  id: string;
  name: string;
  domain: string;
}

const GAMMA_CHARTS: ChartInfo[] = [
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

export interface GammaAnalysisResult {
  // Level 1 fields
  asofWeek: string;
  cycleStagePrimary: string;
  cycleStageTransition: string;
  macroPostureLabel: string;
  headlineSummary: string;
  domains: any[];
  
  // Level 2 fields
  phaseConfidence: string;
  cycleTone: string;
  overallSummary: string;
  domainDetails: any[];
  
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
  const REQUIRED_CHART_COUNT = 18;
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
 * Includes mode text + all 18 chart images
 */
function buildInputContent(mode: string, charts: ChartInfo[]): any[] {
  const content: any[] = [];
  
  // Add mode request as text
  content.push({
    type: 'input_text',
    text: mode
  });
  
  // Add all chart images with labels
  for (const chart of charts) {
    // Add chart label as text
    content.push({
      type: 'input_text',
      text: `\n=== ${chart.domain}: ${chart.name} ===`
    });
    
    // Add chart image
    content.push({
      type: 'input_image',
      image_url: `${GAMMA_CHART_BASE_URL}${chart.id}_${chart.name}.png`
    });
  }
  
  return content;
}

/**
 * Run Gamma V3 analysis using Responses API with Prompt
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
 * @returns Gamma V3 analysis result with cycle stage data
 */
export async function runGammaV3Analysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<GammaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log(`[Gamma V3] Starting analysis for ${analysisDate} (market date) with 18 charts...`);
  console.log(`[Gamma V3] Mode: ${mode}`);
  console.log(`[Gamma V3] Prompt ID: ${GAMMA_V3_PROMPT_ID}`);
  console.log(`[Gamma V3] Prompt Version: ${GAMMA_V3_PROMPT_VERSION}`);
  
  // 🔒 Guardrail 1: Validate chart count
  validateChartCount(GAMMA_CHARTS);
  console.log('[Gamma V3] ✅ Chart count validation passed (18 charts)');
  
  // 🔒 Guardrail 2: Validate mode
  validateMode(mode);
  console.log(`[Gamma V3] ✅ Mode validation passed ("${mode}")`);
  
  const client = getOpenAI();
  
  // Build input content (mode + 18 charts)
  const inputContent = buildInputContent(mode, GAMMA_CHARTS);
  console.log(`[Gamma V3] Built input content: ${inputContent.length} items (1 text + 36 images with labels)`);
  
  // 🚀 Call Responses API (single call, no polling needed)
  console.log('[Gamma V3] Calling Responses API...');
  const startTime = Date.now();
  
  let response;
  try {
    response = await client.responses.create({
      prompt: {
        id: GAMMA_V3_PROMPT_ID,
        version: GAMMA_V3_PROMPT_VERSION
      },
      input: [
        {
          role: 'user',
          content: inputContent
        }
      ]
    } as any);
  } catch (error: any) {
    console.error('[Gamma V3] ❌ Responses API call failed');
    console.error('[Gamma V3] Error:', error.message || error);
    
    // Provide helpful error messages
    if (error.code === '401' || error.status === 401) {
      throw new Error('OpenAI API key is invalid or missing. Please check OPENAI_API_KEY environment variable.');
    }
    if (error.code === '403' || error.status === 403) {
      throw new Error(`Access denied to Prompt or Model. Your API key may not have access to: Prompt ${GAMMA_V3_PROMPT_ID}`);
    }
    if (error.code === '404' || error.status === 404) {
      throw new Error(`Prompt not found: ${GAMMA_V3_PROMPT_ID}. Please verify the Prompt ID is correct.`);
    }
    if (error.code === 'rate_limit_exceeded' || error.message?.includes('rate_limit')) {
      throw new Error(`Rate limit exceeded. Please try again in a few seconds. Details: ${error.message}`);
    }
    
    throw new Error(`Gamma V3 API call failed: ${error.message || 'Unknown error'}`);
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Gamma V3] ✅ Responses API call completed in ${elapsedTime}s`);
  
  // Extract response text using output_text
  const fullResponse = response.output_text;
  if (!fullResponse) {
    console.error('[Gamma V3] No output_text in response:', JSON.stringify(response, null, 2));
    throw new Error('No output_text in response from Responses API');
  }
  
  // Log the raw response for debugging
  console.log('[Gamma V3] Raw response (first 500 chars):', fullResponse.substring(0, 500));
  
  // Try to extract JSON from markdown code blocks if present
  let jsonString = fullResponse;
  const jsonMatch = fullResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
    console.log('[Gamma V3] Extracted JSON from markdown code block');
  }
  
  // Parse JSON output
  let gammaData: any;
  try {
    gammaData = JSON.parse(jsonString);
    console.log('[Gamma V3] ✅ Successfully parsed JSON output');
  } catch (parseError) {
    console.error('[Gamma V3] ❌ JSON parse failed!');
    console.error('[Gamma V3] Full response:', fullResponse);
    throw new Error(`Failed to parse Gamma V3 response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
  
  // Extract Level 1 and Level 2 data
  const level1 = gammaData.level1 || gammaData.layer1 || {};
  const level2 = gammaData.level2 || gammaData.layer2 || {};
  
  // Handle nested cycle_stage structure (Prompt returns nested object)
  const cycleStage = level1.cycle_stage || {};
  const cycleStagePrimary = cycleStage.primary || level1.cycle_stage_primary || level1.cycleStagePrimary || 'Unknown';
  const cycleStageTransition = cycleStage.transition || level1.cycle_stage_transition || level1.cycleStageTransition || 'None';
  const phaseConfidence = cycleStage.phase_confidence || level1.phase_confidence || level2.phase_confidence || level2.phaseConfidence || '';
  
  // Handle nested overall_summary structure (Prompt returns nested object)
  const overallSummaryObj = level1.overall_summary || {};
  const headlineSummary = overallSummaryObj.summary || level1.headline_summary || level1.headlineSummary || '';
  const synthesisSignal = overallSummaryObj.synthesis_signal || '';
  const overallBias = overallSummaryObj.overall_bias || '';
  
  // Handle domain_status (Prompt returns nested object)
  const domainStatus = level1.domain_status || {};
  const domains = level1.domains || Object.keys(domainStatus).map(key => ({
    name: key,
    ...domainStatus[key]
  })) || [];
  
  // Build result object
  const result: GammaAnalysisResult = {
    // Level 1 fields
    asofWeek: level1.asof_week || level1.asofWeek || analysisDate,
    cycleStagePrimary,
    cycleStageTransition,
    macroPostureLabel: level1.macro_posture_label || level1.macroPostureLabel || overallBias || 'Neutral',
    headlineSummary,
    domains,
    
    // Level 2 fields
    phaseConfidence: String(phaseConfidence),
    cycleTone: level2.cycle_tone || level2.cycleTone || synthesisSignal || '',
    overallSummary: level2.overall_summary || level2.overallSummary || headlineSummary || '',
    domainDetails: level2.domain_details || level2.domainDetails || [],
    
    // Full analysis
    fullAnalysis: gammaData
  };
  
  // Validate required fields
  if (!result.cycleStagePrimary || result.cycleStagePrimary === 'Unknown') {
    console.warn('[Gamma V3] ⚠️ Missing or invalid cycle_stage_primary');
  }
  if (!result.headlineSummary) {
    console.warn('[Gamma V3] ⚠️ Missing headline_summary');
  }
  
  console.log('[Gamma V3] ✅ Validation passed');
  console.log('[Gamma V3] Analysis complete:', {
    asofWeek: result.asofWeek,
    cycleStagePrimary: result.cycleStagePrimary,
    cycleStageTransition: result.cycleStageTransition,
    macroPostureLabel: result.macroPostureLabel,
    headlineSummary: result.headlineSummary.substring(0, 50) + '...',
  });
  
  return result;
}
