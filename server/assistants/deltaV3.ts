// Delta V3 Assistant - Market Fragility Analysis with 19 Short-term Charts
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
      baseURL: 'https://api.openai.com/v1',  // Direct OpenAI API
    });
  }
  return openai;
}

// Delta V3 Prompt Configuration
const DELTA_V3_PROMPT_ID = process.env.DELTA_V3_PROMPT_ID || 'pmpt_693d4596f41c819586c7267fda081ee60349d45216bf0bd9';
const DELTA_V3_PROMPT_VERSION = process.env.DELTA_V3_PROMPT_VERSION || '3';

// Delta V3 Dashboard Chart URLs (19 short-term charts)
const DELTA_V3_CHART_BASE_URL = 'https://cyclescope-delta-dashboard-production.up.railway.app/charts/';

interface ChartInfo {
  id: string;
  name: string;
  domain: string;
  description: string;
}

const DELTA_V3_CHARTS: ChartInfo[] = [
  // BREADTH (4 charts)
  { id: '01', name: 'SPXA50R', domain: 'Breadth', description: 'S&P 500 % Above 50-day MA' },
  { id: '02', name: 'SPXA150R', domain: 'Breadth', description: 'S&P 500 % Above 150-day MA' },
  { id: '03', name: 'SPXA200R', domain: 'Breadth', description: 'S&P 500 % Above 200-day MA' },
  { id: '09', name: 'RSP_SPY', domain: 'Breadth', description: 'Equal Weight vs Market Cap' },
  
  // CREDIT (3 charts)
  { id: '04', name: 'HYG_IEF', domain: 'Credit', description: 'High Yield vs Treasury' },
  { id: '05', name: 'LQD_IEF', domain: 'Credit', description: 'Investment Grade vs Treasury' },
  { id: '17', name: 'JNK_IEF', domain: 'Credit', description: 'Junk Bond vs Treasury' },
  
  // VOLATILITY (3 charts)
  { id: '06', name: 'VIX_VXV', domain: 'Volatility', description: 'VIX Term Structure' },
  { id: '07', name: 'VVIX', domain: 'Volatility', description: 'Volatility of VIX' },
  { id: '08', name: 'VIX', domain: 'Volatility', description: 'Volatility Index' },
  
  // LEADERSHIP (4 charts)
  { id: '10', name: 'SMH_SPY', domain: 'Leadership', description: 'Semiconductors vs S&P 500' },
  { id: '12', name: 'XLY_XLP', domain: 'Leadership', description: 'Consumer Discretionary vs Staples' },
  { id: '13', name: 'IWFIWDV', domain: 'Leadership', description: 'Growth vs Value' },
  { id: '18', name: 'XLK_XLP', domain: 'Leadership', description: 'Technology vs Staples' },
  
  // SENTIMENT (1 chart)
  { id: '11', name: 'CPCE', domain: 'Sentiment', description: 'Put/Call Ratio' },
  
  // MACRO (4 charts)
  { id: '14', name: 'USD', domain: 'Macro', description: 'US Dollar Index' },
  { id: '15', name: 'SPX', domain: 'Macro', description: 'S&P 500' },
  { id: '16', name: 'COPPER_GOLD', domain: 'Macro', description: 'Copper/Gold Ratio' },
  { id: '19', name: 'TNX', domain: 'Macro', description: '10-Year Treasury Yields' },
];

export interface DeltaV3Layer1 {
  market_condition: string;
  turning_point: string;
  outlook_1_2_month: string;
}

export interface DeltaV3Layer2Domains {
  breadth: string;
  leadership: string;
  credit: string;
  volatility: string;
  macro: string;
  sentiment: string;
  index_price_structure: string;
}

export interface DeltaV3Layer2TurningPointEvidence {
  top_evidence: string;
  bottom_evidence: string;
  unified_interpretation: string;
}

export interface DeltaV3Layer2 {
  domains: DeltaV3Layer2Domains;
  turning_point_evidence: DeltaV3Layer2TurningPointEvidence;
  outlook_paragraph: string;
}

export interface DeltaV3AnalysisResult {
  asof_date: string;
  layer1: DeltaV3Layer1;
  layer2: DeltaV3Layer2;
  delta_schema_version: string;
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
  const REQUIRED_CHART_COUNT = 19;
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
  const ALLOWED_MODES = ['engine', 'panel', 'json layer1', 'json layer2'];
  if (!ALLOWED_MODES.includes(mode)) {
    throw new Error(
      `Invalid mode: "${mode}". Allowed modes: ${ALLOWED_MODES.join(', ')}`
    );
  }
}

/**
 * Build input content array for Responses API
 * Includes mode text + all 19 chart images
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
      text: `\n=== ${chart.domain}: ${chart.description} (${chart.name}) ===`
    });
    
    // Add chart image
    content.push({
      type: 'input_image',
      image_url: `${DELTA_V3_CHART_BASE_URL}${chart.id}_${chart.name}.png`
    });
  }
  
  return content;
}

/**
 * Run Delta V3 analysis using Responses API with Prompt
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
 * @param mode - 'engine' returns full JSON (Layer 1 + Layer 2), 'panel' returns Layer 1 only
 * @param date - Optional date override (defaults to current market date in ET)
 * @returns Delta V3 analysis result with Layer 1 and Layer 2 data
 */
export async function runDeltaV3Analysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<DeltaV3AnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log(`[Delta V3] Starting analysis for ${analysisDate} (market date) with 19 charts...`);
  console.log(`[Delta V3] Mode: ${mode}`);
  console.log(`[Delta V3] Prompt ID: ${DELTA_V3_PROMPT_ID}`);
  console.log(`[Delta V3] Prompt Version: ${DELTA_V3_PROMPT_VERSION}`);
  
  // 🔒 Guardrail 1: Validate chart count
  validateChartCount(DELTA_V3_CHARTS);
  console.log('[Delta V3] ✅ Chart count validation passed (19 charts)');
  
  // 🔒 Guardrail 2: Validate mode
  validateMode(mode);
  console.log(`[Delta V3] ✅ Mode validation passed ("${mode}")`);
  
  const client = getOpenAI();
  
  // Build input content (mode + 19 charts)
  const inputContent = buildInputContent(mode, DELTA_V3_CHARTS);
  console.log(`[Delta V3] Built input content: ${inputContent.length} items (1 text + 38 images with labels)`);
  
  // 🚀 Call Responses API (single call, no polling needed)
  console.log('[Delta V3] Calling Responses API...');
  const startTime = Date.now();
  
  let response;
  try {
    response = await client.responses.create({
      prompt: {
        id: DELTA_V3_PROMPT_ID,
        version: DELTA_V3_PROMPT_VERSION
      },
      input: [
        {
          role: 'user',
          content: inputContent
        }
      ]
    });
  } catch (error: any) {
    console.error('[Delta V3] ❌ Responses API call failed');
    console.error('[Delta V3] Error:', error.message || error);
    
    // Provide helpful error messages
    if (error.code === '401' || error.status === 401) {
      throw new Error('OpenAI API key is invalid or missing. Please check OPENAI_API_KEY environment variable.');
    }
    if (error.code === '403' || error.status === 403) {
      throw new Error(`Access denied to Prompt or Model. Your API key may not have access to: Prompt ${DELTA_V3_PROMPT_ID} or Model gpt-5.2`);
    }
    if (error.code === '404' || error.status === 404) {
      throw new Error(`Prompt not found: ${DELTA_V3_PROMPT_ID}. Please verify the Prompt ID is correct.`);
    }
    if (error.code === 'rate_limit_exceeded' || error.message?.includes('rate_limit')) {
      throw new Error(`Rate limit exceeded. Please try again in a few seconds. Details: ${error.message}`);
    }
    
    throw new Error(`Delta V3 API call failed: ${error.message || 'Unknown error'}`);
  }
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Delta V3] ✅ Responses API call completed in ${elapsedTime}s`);
  
  // Extract response text using output_text
  const fullResponse = response.output_text;
  if (!fullResponse) {
    console.error('[Delta V3] No output_text in response:', JSON.stringify(response, null, 2));
    throw new Error('No output_text in response from Responses API');
  }
  
  // Log the raw response for debugging
  console.log('[Delta V3] Raw response (first 500 chars):', fullResponse.substring(0, 500));
  
  // Try to extract JSON from markdown code blocks if present
  let jsonString = fullResponse;
  const jsonMatch = fullResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
    console.log('[Delta V3] Extracted JSON from markdown code block');
  }
  
  // Parse JSON output
  let deltaV3Data: DeltaV3AnalysisResult;
  try {
    deltaV3Data = JSON.parse(jsonString);
    console.log('[Delta V3] ✅ Successfully parsed JSON output');
  } catch (parseError) {
    console.error('[Delta V3] ❌ JSON parse failed!');
    console.error('[Delta V3] Full response:', fullResponse);
    throw new Error(`Failed to parse Delta V3 response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
  
  // Validate required fields
  if (!deltaV3Data.asof_date) {
    console.warn('[Delta V3] ⚠️ Missing asof_date, using analysis date');
    deltaV3Data.asof_date = analysisDate;
  }
  
  if (!deltaV3Data.delta_schema_version) {
    console.warn('[Delta V3] ⚠️ Missing delta_schema_version, defaulting to "3.0"');
    deltaV3Data.delta_schema_version = '3.0';
  }
  
  // Validate Layer 1
  if (!deltaV3Data.layer1) {
    throw new Error('Delta V3 response missing layer1');
  }
  if (!deltaV3Data.layer1.market_condition) {
    throw new Error('Delta V3 layer1 missing market_condition');
  }
  if (!deltaV3Data.layer1.turning_point) {
    throw new Error('Delta V3 layer1 missing turning_point');
  }
  if (!deltaV3Data.layer1.outlook_1_2_month) {
    throw new Error('Delta V3 layer1 missing outlook_1_2_month');
  }
  
  // Validate Layer 2
  if (!deltaV3Data.layer2) {
    throw new Error('Delta V3 response missing layer2');
  }
  if (!deltaV3Data.layer2.domains) {
    throw new Error('Delta V3 layer2 missing domains');
  }
  if (!deltaV3Data.layer2.turning_point_evidence) {
    throw new Error('Delta V3 layer2 missing turning_point_evidence');
  }
  if (!deltaV3Data.layer2.outlook_paragraph) {
    throw new Error('Delta V3 layer2 missing outlook_paragraph');
  }
  
  // Validate domains (7 required)
  const requiredDomains = ['breadth', 'leadership', 'credit', 'volatility', 'macro', 'sentiment', 'index_price_structure'];
  for (const domain of requiredDomains) {
    if (!deltaV3Data.layer2.domains[domain as keyof DeltaV3Layer2Domains]) {
      console.warn(`[Delta V3] ⚠️ Missing domain: ${domain}`);
    }
  }
  
  // Validate turning point evidence (3 required)
  const requiredEvidence = ['top_evidence', 'bottom_evidence', 'unified_interpretation'];
  for (const evidence of requiredEvidence) {
    if (!deltaV3Data.layer2.turning_point_evidence[evidence as keyof DeltaV3Layer2TurningPointEvidence]) {
      console.warn(`[Delta V3] ⚠️ Missing turning point evidence: ${evidence}`);
    }
  }
  
  console.log('[Delta V3] ✅ Validation passed');
  console.log('[Delta V3] Analysis complete:', {
    asof_date: deltaV3Data.asof_date,
    market_condition: deltaV3Data.layer1.market_condition.substring(0, 50) + '...',
    turning_point: deltaV3Data.layer1.turning_point,
    outlook: deltaV3Data.layer1.outlook_1_2_month,
    schema_version: deltaV3Data.delta_schema_version,
  });
  
  return deltaV3Data;
}
