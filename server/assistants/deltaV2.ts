// Delta V2 Assistant - Market Fragility Analysis with 19 Short-term Charts
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

// Delta V2 Assistant ID
const DELTA_V2_ASSISTANT_ID = process.env.DELTA_V2_ASSISTANT_ID || 'asst_YDOUTg5QBxClQAXElw6GczGB';

// Delta V2 Dashboard Chart URLs (19 short-term charts)
const DELTA_V2_CHART_BASE_URL = 'https://cyclescope-delta-dashboard-production.up.railway.app/charts/';

interface ChartInfo {
  id: string;
  name: string;
  domain: string;
  description: string;
}

const DELTA_V2_CHARTS: ChartInfo[] = [
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

export interface DeltaV2Layer1 {
  market_condition: string;
  turning_point: string;
  outlook_1_2_month: string;
}

export interface DeltaV2Layer2Domains {
  breadth: string;
  leadership: string;
  credit: string;
  volatility: string;
  macro: string;
  sentiment: string;
  index_price_structure: string;
}

export interface DeltaV2Layer2TurningPointEvidence {
  top_evidence: string;
  bottom_evidence: string;
  unified_interpretation: string;
}

export interface DeltaV2Layer2 {
  domains: DeltaV2Layer2Domains;
  turning_point_evidence: DeltaV2Layer2TurningPointEvidence;
  outlook_paragraph: string;
}

export interface DeltaV2AnalysisResult {
  asof_date: string;
  layer1: DeltaV2Layer1;
  layer2: DeltaV2Layer2;
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
 * Helper function to check if an error is a rate limit error
 */
function isRateLimitError(error: any): boolean {
  return error?.code === 'rate_limit_exceeded' || 
         error?.message?.includes('rate_limit') ||
         error?.message?.includes('Rate limit');
}

/**
 * Helper function to extract wait time from rate limit error message
 * Example: "Please try again in 2.09s" -> 2090 ms
 */
function extractWaitTime(errorMessage: string): number {
  const match = errorMessage.match(/try again in ([\d.]+)s/);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000);
  }
  return 0;
}

/**
 * Run Delta V2 Assistant analysis on 19 short-term charts with retry logic
 * 
 * @param mode - 'engine' returns full JSON (Layer 1 + Layer 2), 'panel' returns Layer 1 only
 * @param date - Optional date override (defaults to current market date in ET)
 * @param retryCount - Internal parameter for tracking retry attempts
 * @returns Delta V2 analysis result with Layer 1 and Layer 2 data
 */
export async function runDeltaV2Analysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string,
  retryCount: number = 0
): Promise<DeltaV2AnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log(`[Delta V2] Starting analysis for ${analysisDate} (market date) with 19 charts...`);
  console.log(`[Delta V2] Mode: ${mode}`);
  console.log(`[Delta V2] Assistant ID: ${DELTA_V2_ASSISTANT_ID}`);
  
  const client = getOpenAI();
  
  // Create thread
  const thread = await client.beta.threads.create();
  console.log(`[Delta V2] Thread created: ${thread.id}`);
  
  // Message 1: Introduction
  const introMessage: any[] = [{
    type: 'text',
    text: `Analyze the market using the provided 19 short-term charts.

I will send the charts in multiple messages. Please wait until all charts are provided before analyzing.

IMPORTANT: After all charts are provided, I will type "${mode}" to request your analysis.

You must respond in ENGINE MODE with the complete JSON format containing both Layer-1 and Layer-2.

Total charts: 19 (covering Breadth, Leadership, Credit, Volatility, Macro, Sentiment, and Index Price Structure)`
  }];
  
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: introMessage,
  });
  console.log('[Delta V2] Message 1/9: Introduction sent');
  
  // Messages 2-8: Chart batches (3 charts per message)
  const BATCH_SIZE = 3;
  const totalBatches = Math.ceil(DELTA_V2_CHARTS.length / BATCH_SIZE);
  
  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const startIdx = batchIdx * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, DELTA_V2_CHARTS.length);
    const batch = DELTA_V2_CHARTS.slice(startIdx, endIdx);
    
    const batchContent: any[] = [];
    
    for (const chart of batch) {
      // Add chart header (text)
      batchContent.push({
        type: 'text',
        text: `\n=== ${chart.domain}: ${chart.description} (${chart.name}) ===`
      });
      
      // Add chart image
      batchContent.push({
        type: 'image_url',
        image_url: {
          url: `${DELTA_V2_CHART_BASE_URL}${chart.id}_${chart.name}.png`,
          detail: 'high'
        }
      });
    }
    
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: batchContent,
    });
    
    console.log(`[Delta V2] Message ${batchIdx + 2}/9: Batch ${batchIdx + 1}/${totalBatches} sent (${batch.length} charts)`);
    
    // Small delay between batches
    if (batchIdx < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Message 9: Final request for ENGINE mode
  const finalMessage: any[] = [{
    type: 'text',
    text: `All 19 charts have been provided.

${mode}

Please provide the complete ENGINE mode JSON output now.`
  }];
  
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: finalMessage,
  });
  console.log('[Delta V2] Message 9/9: ENGINE mode request sent');
  
  // Run assistant
  console.log('[Delta V2] Starting assistant run...');
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: DELTA_V2_ASSISTANT_ID,
  });
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  let pollCount = 0;
  const MAX_POLLS = 60; // 2 minutes max (60 * 2 seconds)
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      console.error('[Delta V2] ❌ RUN FAILED');
      console.error('[Delta V2] Status:', runStatus.status);
      console.error('[Delta V2] Last error:', runStatus.last_error);
      
      // Check if it's a rate limit error and we haven't exceeded max retries
      const MAX_RETRIES = 3;
      if (isRateLimitError(runStatus.last_error) && retryCount < MAX_RETRIES) {
        const errorMessage = runStatus.last_error?.message || '';
        
        // Wait 60 seconds to ensure the sliding window clears
        // OpenAI uses a 60-second sliding window for rate limits
        const waitTime = 60000; // 1 minute
        
        console.log(`[Delta V2] 🔄 Rate limit detected. Retry ${retryCount + 1}/${MAX_RETRIES} after ${waitTime}ms`);
        console.log(`[Delta V2] Error details: ${errorMessage}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry the entire analysis
        console.log(`[Delta V2] 🔄 Retrying analysis (attempt ${retryCount + 2})...`);
        return runDeltaV2Analysis(mode, date, retryCount + 1);
      }
      
      // Not a rate limit error or max retries exceeded
      throw new Error(`Delta V2 analysis failed: ${runStatus.last_error?.message || runStatus.status}`);
    }
    
    if (pollCount >= MAX_POLLS) {
      console.error('[Delta V2] ❌ TIMEOUT: Assistant did not complete within 2 minutes');
      throw new Error('Delta V2 analysis timeout');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    pollCount++;
    console.log(`[Delta V2] Status: ${runStatus.status} (poll ${pollCount}/${MAX_POLLS})`);
  }
  
  console.log('[Delta V2] ✅ Assistant run completed');
  
  // Get response
  const messages = await client.beta.threads.messages.list(thread.id, {
    order: 'desc',
    limit: 1
  });
  
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
    throw new Error('No valid response from Delta V2 assistant');
  }
  
  const fullResponse = assistantMessage.content[0].text.value;
  
  // Log the raw response for debugging
  console.log('[Delta V2] Raw response (first 500 chars):', fullResponse.substring(0, 500));
  
  // Try to extract JSON from markdown code blocks if present
  let jsonString = fullResponse;
  const jsonMatch = fullResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
    console.log('[Delta V2] Extracted JSON from markdown code block');
  }
  
  // Parse JSON output
  let deltaV2Data: DeltaV2AnalysisResult;
  try {
    deltaV2Data = JSON.parse(jsonString);
    console.log('[Delta V2] ✅ Successfully parsed JSON output');
  } catch (parseError) {
    console.error('[Delta V2] ❌ JSON parse failed!');
    console.error('[Delta V2] Full response:', fullResponse);
    throw new Error(`Failed to parse Delta V2 response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
  
  // Validate required fields
  if (!deltaV2Data.asof_date) {
    console.warn('[Delta V2] ⚠️ Missing asof_date, using analysis date');
    deltaV2Data.asof_date = analysisDate;
  }
  
  if (!deltaV2Data.delta_schema_version) {
    console.warn('[Delta V2] ⚠️ Missing delta_schema_version, defaulting to "2.0"');
    deltaV2Data.delta_schema_version = '2.0';
  }
  
  // Validate Layer 1
  if (!deltaV2Data.layer1) {
    throw new Error('Delta V2 response missing layer1');
  }
  if (!deltaV2Data.layer1.market_condition) {
    throw new Error('Delta V2 layer1 missing market_condition');
  }
  if (!deltaV2Data.layer1.turning_point) {
    throw new Error('Delta V2 layer1 missing turning_point');
  }
  if (!deltaV2Data.layer1.outlook_1_2_month) {
    throw new Error('Delta V2 layer1 missing outlook_1_2_month');
  }
  
  // Validate Layer 2
  if (!deltaV2Data.layer2) {
    throw new Error('Delta V2 response missing layer2');
  }
  if (!deltaV2Data.layer2.domains) {
    throw new Error('Delta V2 layer2 missing domains');
  }
  if (!deltaV2Data.layer2.turning_point_evidence) {
    throw new Error('Delta V2 layer2 missing turning_point_evidence');
  }
  if (!deltaV2Data.layer2.outlook_paragraph) {
    throw new Error('Delta V2 layer2 missing outlook_paragraph');
  }
  
  // Validate domains (7 required)
  const requiredDomains = ['breadth', 'leadership', 'credit', 'volatility', 'macro', 'sentiment', 'index_price_structure'];
  for (const domain of requiredDomains) {
    if (!deltaV2Data.layer2.domains[domain as keyof DeltaV2Layer2Domains]) {
      console.warn(`[Delta V2] ⚠️ Missing domain: ${domain}`);
    }
  }
  
  // Validate turning point evidence (3 required)
  const requiredEvidence = ['top_evidence', 'bottom_evidence', 'unified_interpretation'];
  for (const evidence of requiredEvidence) {
    if (!deltaV2Data.layer2.turning_point_evidence[evidence as keyof DeltaV2Layer2TurningPointEvidence]) {
      console.warn(`[Delta V2] ⚠️ Missing turning point evidence: ${evidence}`);
    }
  }
  
  console.log('[Delta V2] ✅ Validation passed');
  console.log('[Delta V2] Analysis complete:', {
    asof_date: deltaV2Data.asof_date,
    market_condition: deltaV2Data.layer1.market_condition.substring(0, 50) + '...',
    turning_point: deltaV2Data.layer1.turning_point,
    outlook: deltaV2Data.layer1.outlook_1_2_month,
    schema_version: deltaV2Data.delta_schema_version,
  });
  
  return deltaV2Data;
}

