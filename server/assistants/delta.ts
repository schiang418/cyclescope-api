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

const DELTA_ASSISTANT_ID = process.env.DELTA_ASSISTANT_ID || 'asst_niipkh0HSLaeuPVwSsB7Y09B';

// Delta Dashboard Chart URLs (14 charts across 4 dimensions)
const DELTA_CHART_BASE_URL = 'https://cyclescope-delta-dashboard-production.up.railway.app/charts/';

const DELTA_CHARTS = [
  // BREADTH (3 charts)
  { id: '01', name: 'SPXA50R', dimension: 'BREADTH' },
  { id: '02', name: 'SPXA200R', dimension: 'BREADTH' },
  { id: '03', name: 'NYHL', dimension: 'BREADTH' },
  
  // LIQUIDITY/CREDIT (2 charts)
  { id: '04', name: 'HYG_LQD', dimension: 'LIQUIDITY_CREDIT' },
  { id: '05', name: 'TLT', dimension: 'LIQUIDITY_CREDIT' },
  
  // VOLATILITY (3 charts)
  { id: '06', name: 'VIX', dimension: 'VOLATILITY' },
  { id: '07', name: 'VIX9D', dimension: 'VOLATILITY' },
  { id: '08', name: 'VVIX', dimension: 'VOLATILITY' },
  
  // LEADERSHIP (2 charts)
  { id: '09', name: 'XLY_XLP', dimension: 'LEADERSHIP' },
  { id: '10', name: 'IWM_SPY', dimension: 'LEADERSHIP' },
  
  // OPTIONALS (4 charts)
  { id: '11', name: 'DXY', dimension: 'OPTIONAL' },
  { id: '12', name: 'GLD', dimension: 'OPTIONAL' },
  { id: '13', name: 'CL', dimension: 'OPTIONAL' },
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
 * Run Delta Assistant analysis on 14 charts
 */
export async function runDeltaAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<DeltaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log(`[Delta] Starting analysis for ${analysisDate} (market date) with 14 charts...`);
  
  const client = getOpenAI();
  
  // Create thread
  const thread = await client.beta.threads.create();
  
  // Prepare chart URLs
  const chartUrls = DELTA_CHARTS.map(chart => 
    `${DELTA_CHART_BASE_URL}${chart.id}_${chart.name}.png`
  );
  
  // Create chart descriptions for context
  const chartDescriptions = DELTA_CHARTS.map((chart, idx) => 
    `${idx + 1}. [${chart.dimension}] ${chart.name}`
  ).join('\n');
  
  // CRITICAL FIX: Send actual images using image_url type instead of plain text URLs
  // This allows the AI to actually SEE the charts and read indicator values
  const messageContent: Array<{type: string; text?: string; image_url?: {url: string}}> = [
    {
      type: "text",
      text: `${mode}\n\nIMPORTANT: Use this exact date in your output:\nAnalysis Date: ${analysisDate}\n\nFor JSON output, use this date in the "asof_date" field.\n\nCRITICAL: You MUST:\n1. READ the actual numeric indicator values from each chart image\n2. Include SPECIFIC VALUES in your analysis (e.g., "SPXA50R = 45%", "VIX = 18", "HYG/LQD = 1.02")\n3. DO NOT use generic descriptions - quote the actual numbers you see in the charts\n\nPlease analyze these 14 market fragility charts and assess stress levels:\n\n${chartDescriptions}\n\nProvide stress assessment (0=green, 1=yellow, 2=orange) for each dimension: BREADTH, LIQUIDITY_CREDIT, VOLATILITY, LEADERSHIP.\n\nThe charts are attached below as images.`
    },
    // Add all chart images
    ...chartUrls.map(url => ({
      type: "image_url" as const,
      image_url: {
        url: url
      }
    }))
  ];
  
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: messageContent as any,
  });
  
  // Run assistant
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: DELTA_ASSISTANT_ID,
  });
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      throw new Error(`Delta analysis failed: ${runStatus.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Delta] Status: ${runStatus.status}`);
  }
  
  // Get response
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
    throw new Error('No valid response from Delta assistant');
  }
  
  const fullAnalysis = assistantMessage.content[0].text.value;
  
  // Parse JSON output (mode='engine' always returns JSON)
  const deltaData = JSON.parse(fullAnalysis);
  console.log('[Delta] Successfully parsed JSON output');
  
  // Extract ALL fields from JSON
  const result: DeltaAnalysisResult = {
    // Level 1
    asofDate: deltaData.level1.asof_date,
    fragilityColor: deltaData.level1.fragility_color,
    fragilityLabel: deltaData.level1.fragility_label,
    fragilityScore: deltaData.level1.fragility_score,
    templateCode: deltaData.level1.template_code,
    templateName: deltaData.level1.template_name,
    patternPlain: deltaData.level1.pattern_plain,
    postureCode: deltaData.level1.posture_code,
    postureLabel: deltaData.level1.posture_label,
    headlineSummary: deltaData.level1.headline_summary,
    keyDrivers: deltaData.level1.key_drivers,
    nextWatchDisplay: deltaData.level1.next_watch_display,
    
    // Level 2
    phaseUsed: deltaData.level2.phase_used,
    phaseConfidence: deltaData.level2.phase_confidence,
    breadth: deltaData.level2.dimensions.breadth,
    liquidity: deltaData.level2.dimensions.liquidity,
    volatility: deltaData.level2.dimensions.volatility,
    leadership: deltaData.level2.dimensions.leadership,
    breadthText: deltaData.level2.dimension_commentary.breadth_text,
    liquidityText: deltaData.level2.dimension_commentary.liquidity_text,
    volatilityText: deltaData.level2.dimension_commentary.volatility_text,
    leadershipText: deltaData.level2.dimension_commentary.leadership_text,
    rationaleBullets: deltaData.level2.rationale_bullets,
    plainEnglishSummary: deltaData.level2.plain_english_summary,
    nextTriggersDetail: deltaData.level2.next_triggers_detail,
    
    fullAnalysis: deltaData,
  };
  
  console.log('[Delta] Analysis complete - ALL fields extracted');
  console.log('[Delta] Fragility:', result.fragilityLabel, `(score: ${result.fragilityScore})`);
  console.log('[Delta] Stress scores:', { 
    breadth: result.breadth, 
    liquidity: result.liquidity, 
    volatility: result.volatility, 
    leadership: result.leadership 
  });
  
  return result;
}

