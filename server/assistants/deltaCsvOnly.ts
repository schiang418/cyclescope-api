import OpenAI from 'openai';
import { getLatestCSVDate } from './csvUploader.js';
import { downloadAndFormatCSVsAsText } from './csvTextEmbedder.js';
import { getPriorDeltaOutputs } from '../db.js';

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

// CSV-Only Assistant ID (fallback to standard if not set)
const DELTA_CSV_ASSISTANT_ID = process.env.DELTA_CSV_ASSISTANT_ID || 
                                process.env.DELTA_ASSISTANT_ID || 
                                'asst_niipkh0HSLaeuPVwSsB7Y09B';

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
 * Run Delta CSV-Only analysis (14 CSV files, NO charts)
 */
export async function runDeltaCsvOnlyAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<DeltaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log('📊📊📊 DELTA CSV-ONLY MODE: 14 CSV Files (first 2 + last 40 rows), NO Charts 📊📊📊');
  console.log(`[Delta CSV-Only] Using Assistant: ${DELTA_CSV_ASSISTANT_ID}`);
  console.log(`[Delta CSV-Only] Starting analysis for ${analysisDate}...`);
  
  // Check if temporal context is enabled
  const useTemporalData = process.env.TEMPORAL_DATA !== 'false'; // Default: true
  console.log(`[Delta CSV-Only] Temporal context: ${useTemporalData ? 'ENABLED' : 'DISABLED'}`);
  
  // Fetch prior Delta outputs if temporal context is enabled
  let priorDaysContext = '';
  if (useTemporalData) {
    const priorDays = await getPriorDeltaOutputs(3, analysisDate);
    if (priorDays.length > 0) {
      console.log(`[Delta CSV-Only] Fetched ${priorDays.length} prior days for temporal context`);
      priorDaysContext = `\n\n**PRIOR DAYS CONTEXT (for fragility trend detection):**\n\n${JSON.stringify({ past_delta_states: priorDays }, null, 2)}\n\n**TEMPORAL PROCESSING INSTRUCTIONS:**\n\n1. **Fragility Trajectory Analysis**\n   - **Building**: Score increasing over 2+ days, or dimensions worsening\n   - **Stable**: Score ±1 point, dimensions mostly unchanged\n   - **Releasing**: Score decreasing, dimensions improving\n\n2. **Dimension Persistence Tracking**\n   - If any dimension = 2 (orange) for 2+ consecutive days → structural concern\n   - If Volatility spikes but other dimensions stable → likely noise\n   - If 2+ dimensions worsen together → confirm escalation\n\n3. **Structural vs. Noise Filtering**\n   - **Structural**: Liquidity worsens, or 2+ dimensions worsen together\n   - **Noise**: Single dimension spikes while others stable\n   - **Confirmation**: Wait for 2nd day before escalating on isolated moves\n\n4. **Template Stability**\n   - Don't change template on single-day moves\n   - Only change if 2+ dimensions confirm new structural pattern\n   - Reference prior template in rationale when changing\n\n5. **Posture Continuity**\n   - Don't oscillate between Caution/Defensive on noise\n   - Escalate posture only if fragility building for 2+ days\n   - De-escalate only if fragility releasing for 2+ days\n\n6. **Contextual Explanation**\n   - Reference prior days when explaining today's assessment\n   - Examples:\n     * \"Fragility remains elevated for the 3rd consecutive day...\"\n     * \"Liquidity stress has eased from yesterday's 2 to today's 1...\"\n     * \"Unlike yesterday's isolated spike, today's move is structural...\"\n\n**ESCALATION THRESHOLDS:**\n\nEscalate fragility (YELLOW → ORANGE) only if:\n- Score increases for 2+ consecutive days, OR\n- 2+ dimensions worsen together, OR\n- Liquidity dimension worsens (highest priority signal)\n\nDe-escalate fragility (ORANGE → YELLOW) only if:\n- Score decreases for 2+ consecutive days, AND\n- No dimension remains at 2 (orange), AND\n- Liquidity dimension improves or stable at 0-1\n\n**PRIORITY HIERARCHY:**\n\n1. **Liquidity** (most important - credit stress is structural)\n2. **Leadership** (second - shows rotation quality)\n3. **Breadth** (third - confirms participation)\n4. **Volatility** (fourth - often noise, confirm with others)\n`;
    } else {
      console.log('[Delta CSV-Only] No prior days found, proceeding without temporal context');
    }
  }
  
  const client = getOpenAI();
  
  // Step 1: Download and format 14 CSV files (first 2 rows + last 200 rows)
  console.log('[Delta CSV-Only] Downloading 14 CSV files (first 2 + last 200 rows each)...');
  const latestDate = await getLatestCSVDate();
  console.log(`[Delta CSV-Only] Using CSV data from: ${latestDate}`);
  
  const csvEmbeddedText = await downloadAndFormatCSVsAsText(
    latestDate, 
    DELTA_CSV_FILES, 
    undefined,  // Use CSV_ROWS env variable or default (50 for csv_only)
    'csv_only'  // Mode: csv_only
  );
  
  console.log(`[Delta CSV-Only] ✅ CSV data formatted (${csvEmbeddedText.length} characters)`);
  console.log(`[Delta CSV-Only] CSV files processed: ${DELTA_CSV_FILES.length}`);
  
  // Step 2: Create thread
  const thread = await client.beta.threads.create();
  console.log(`[Delta CSV-Only] Thread created: ${thread.id}`);
  
  // Step 3: Send CSV data only (NO charts)
  const messageText = [
    mode,
    '',
    `Analysis Date: ${analysisDate}`,
    priorDaysContext,
    '',
    'IMPORTANT: Analyze ONLY the 14 CSV datasets provided below.',
    'No chart images are available.',
    'Use the numerical data (first 2 rows + last 200 rows per file) to:',
    '- Score each dimension (0-2 scale)',
    '- Identify pattern template',
    '- Determine market fragility',
    '- Assess market posture',
    '',
    'Return ONLY valid JSON (no text before or after).',
    `Use "${analysisDate}" as the asof_date in your output.`,
    '',
    '---',
    '',
    csvEmbeddedText,
    '',
    '---',
  ].join('\n');
  
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: [
      {
        type: 'text',
        text: messageText
      }
    ],
  });
  
  console.log('[Delta CSV-Only] CSV data sent to Assistant (text-only message)');
  
  // Step 4: Run the CSV-Only Assistant
  console.log('[Delta CSV-Only] Creating run with:');
  console.log('  Assistant ID:', DELTA_CSV_ASSISTANT_ID);
  console.log('  Thread ID:', thread.id);
  console.log('  tool_choice: none');
  console.log('  response_format: json_object');
  console.log('  temperature: 0');
  
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: DELTA_CSV_ASSISTANT_ID,
    tool_choice: "none",
    response_format: { type: "json_object" },
    temperature: 0,
  });
  
  console.log(`[Delta CSV-Only] Run created: ${run.id}`);
  console.log(`[Delta CSV-Only] Initial status: ${run.status}`);
  
  // Step 5: Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Delta CSV-Only] Status: ${runStatus.status}`);
  }
  
  if (runStatus.status === 'failed') {
    console.error('='.repeat(80));
    console.error('[Delta CSV-Only] ❌ RUN FAILED');
    console.error('[Delta CSV-Only] Status:', runStatus.status);
    console.error('[Delta CSV-Only] Last error:', runStatus.last_error);
    console.error('[Delta CSV-Only] Last error (JSON):', JSON.stringify(runStatus.last_error, null, 2));
    console.error('[Delta CSV-Only] Run ID:', run.id);
    console.error('[Delta CSV-Only] Thread ID:', thread.id);
    console.error('[Delta CSV-Only] Assistant ID:', DELTA_CSV_ASSISTANT_ID);
    console.error('[Delta CSV-Only] Full run status:', JSON.stringify(runStatus, null, 2));
    console.error('='.repeat(80));
    throw new Error(`Delta CSV-Only analysis failed: ${runStatus.last_error?.message || 'Unknown error'}`);
  }
  
  if (runStatus.status !== 'completed') {
    throw new Error(`Unexpected run status: ${runStatus.status}`);
  }
  
  console.log('[Delta CSV-Only] ✅ Analysis completed');
  console.log('[Delta CSV-Only] Token usage:', {
    prompt_tokens: runStatus.usage?.prompt_tokens || 0,
    completion_tokens: runStatus.usage?.completion_tokens || 0,
    total_tokens: runStatus.usage?.total_tokens || 0,
  });
  
  // Step 6: Retrieve and parse JSON response
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage) {
    throw new Error('No assistant response found');
  }
  
  const textContent = assistantMessage.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in assistant response');
  }
  
  const rawText = textContent.text.value;
  console.log(`[Delta CSV-Only] Raw response length: ${rawText.length} characters`);
  console.log(`[Delta CSV-Only] First 200 chars: ${rawText.substring(0, 200)}`);
  
  // Extract JSON (handle potential text before/after JSON)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[Delta CSV-Only] ❌ No JSON found in response');
    console.error('[Delta CSV-Only] Raw text:', rawText);
    throw new Error('Failed to extract JSON from response');
  }
  
  const jsonText = jsonMatch[0];
  console.log('[Delta CSV-Only] Extracted JSON length:', jsonText.length);
  
  let deltaData: any;
  try {
    deltaData = JSON.parse(jsonText);
    console.log('[Delta CSV-Only] ✅ Successfully parsed JSON output');
  } catch (parseError) {
    console.error('[Delta CSV-Only] ❌ JSON parse error:', parseError);
    console.error('[Delta CSV-Only] JSON text:', jsonText.substring(0, 500));
    throw parseError;
  }
  
  // Step 7: Extract and structure result
  const level1 = deltaData.level1 || {};
  const level2 = deltaData.level2 || {};
  
  const result: DeltaAnalysisResult = {
    // Level 1 fields
    asofDate: level1.asof_date || analysisDate,
    fragilityColor: level1.fragility_color || '#808080',
    fragilityLabel: level1.fragility_label || 'Medium',
    fragilityScore: level1.fragility_score || 1,
    templateCode: level1.template_code || 'UNKNOWN',
    templateName: level1.template_name || 'Unknown Pattern',
    patternPlain: level1.pattern_plain || 'Pattern analysis complete',
    postureCode: level1.posture_code || 'NEUTRAL',
    postureLabel: level1.posture_label || 'Neutral',
    headlineSummary: level1.headline_summary || 'Analysis complete',
    keyDrivers: level1.key_drivers || [],
    nextWatchDisplay: level1.next_watch_display || {},
    
    // Level 2 fields
    phaseUsed: level2.phase_used || 'Unknown',
    phaseConfidence: level2.phase_confidence || '75%',
    breadth: level2.breadth || 1,
    liquidity: level2.liquidity || 1,
    volatility: level2.volatility || 1,
    leadership: level2.leadership || 1,
    breadthText: level2.breadth_text || 'Neutral',
    liquidityText: level2.liquidity_text || 'Neutral',
    volatilityText: level2.volatility_text || 'Neutral',
    leadershipText: level2.leadership_text || 'Neutral',
    rationaleBullets: level2.rationale_bullets || [],
    plainEnglishSummary: level2.plain_english_summary || 'Analysis complete',
    nextTriggersDetail: level2.next_triggers_detail || [],
    
    fullAnalysis: deltaData,
  };
  
  console.log('[Delta CSV-Only] Analysis complete - ALL fields extracted');
  console.log('[Delta CSV-Only] Template:', result.templateCode, '-', result.templateName);
  console.log('[Delta CSV-Only] Fragility:', result.fragilityLabel, '(score:', result.fragilityScore, ')');
  console.log('[Delta CSV-Only] Dimensions: B:', result.breadth, 'L:', result.liquidity, 'V:', result.volatility, 'LD:', result.leadership);
  
  return result;
}

