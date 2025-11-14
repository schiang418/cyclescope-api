// Version: Fixed Unicode characters - Build 2025-11-14
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
      baseURL: 'https://api.openai.com/v1',
    });
  }
  return openai;
}

// CSV-Only Assistant ID (fallback to standard if not set)
const GAMMA_CSV_ASSISTANT_ID = process.env.GAMMA_CSV_ASSISTANT_ID || 
                                process.env.GAMMA_ASSISTANT_ID || 
                                'asst_Ynyur2GgkCWgLKmuqiM8zIt2';

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
 * Run Gamma CSV-Only analysis (18 CSV files, NO charts)
 */
export async function runGammaCsvOnlyAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<GammaAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log('📊📊📊 GAMMA CSV-ONLY MODE: 18 CSV Files (first 2 + last 200 rows), NO Charts 📊📊📊');
  console.log(`[Gamma CSV-Only] Using Assistant: ${GAMMA_CSV_ASSISTANT_ID}`);
  console.log(`[Gamma CSV-Only] Starting analysis for ${analysisDate}...`);
  
  // Check if temporal context is enabled
  const useTemporalData = process.env.TEMPORAL_DATA !== 'false'; // Default: true
  const useWeeklyMode = process.env.GAMMA_WEEKLY_TEMPORAL === 'true'; // Default: false
  console.log(`[Gamma CSV-Only] Temporal context: ${useTemporalData ? 'ENABLED' : 'DISABLED'}`);
  if (useTemporalData) {
    console.log(`[Gamma CSV-Only] Weekly mode: ${useWeeklyMode ? 'ENABLED (fetch Mondays)' : 'DISABLED (fetch last 2 records)'}`);
  }
  
  // Fetch prior Gamma outputs if temporal context is enabled
  let priorWeeksContext = '';
  if (useTemporalData) {
    const { getPriorGammaOutputs } = await import('../db-gamma-temporal.js');
    const priorWeeks = await getPriorGammaOutputs(2, analysisDate, useWeeklyMode);
    if (priorWeeks.length > 0) {
      console.log(`[Gamma CSV-Only] Fetched ${priorWeeks.length} prior weeks for temporal context`);
      priorWeeksContext = `\n\n**PRIOR WEEKS CONTEXT (for cycle stage smoothing):**\n\n${JSON.stringify({ past_gamma_states: priorWeeks }, null, 2)}\n\n**TEMPORAL PROCESSING INSTRUCTIONS:**\n\n1. **Always compute today's state first**\n   - Use the current 18 indicators (CSV) to derive a raw current assessment\n   - Candidate cycle_stage.primary and cycle_stage.transition\n   - Candidate macro_posture, tone, and phase_confidence\n   - Candidate domain biases/strengths for all 6 domains\n   - Do this without forcing it to match history (unsmoothed view)\n\n2. **Then compare with past_gamma_states and apply smoothing**\n   - Use the previous 1-2 weeks to avoid jumpy week-to-week changes\n   - **Slow domains dominate stage changes**: Only change primary cycle stage if there is clear, consistent confirmation from Macro Trend and Credit/Liquidity, supported (ideally) by Breadth or Leadership\n   - **Minimum evidence for stage change**: Do not change cycle_stage.primary if only 1 fast domain (e.g., Volatility or Sentiment) has shifted. Require at least:\n     * A clear shift in Macro Trend or Credit/Liquidity, AND\n     * At least one additional domain (Breadth or Leadership) moving in the same direction compared to most recent past_gamma_states\n   - **No big jumps in a single week**: Do not jump directly from Early to Late or Mid to Contraction/Bottoming in one step. Move at most one stage "step" per week (e.g., Mid-Cycle to Late-Cycle to Topping), unless evidence from Macro + Credit is extremely decisive\n   - **If signals are mixed**: When current indicators suggest different stage but past_gamma_states show stability and domains are conflicting, keep prior primary stage and express change through:\n      * The transition label (e.g., "Stable" to "Early Topping Watch")
     * The tone ("Firming risk" to "Softening under the surface")\n     * Slight adjustments to domain biases and phase_confidence, rather than hard stage flip\n\n3. **Phase confidence evolves gradually**\n   - Use phase_confidence to reflect how strongly current data confirms existing stage\n   - Do not change phase_confidence by more than about 0.15 in either direction in a single week unless Macro + Credit both move decisively\n   - If raw reading and past states are aligned, slowly increase confidence; if they conflict, reduce it modestly instead of flipping stage\n\n4. **Domains: direction over noise**\n   - When comparing to past_gamma_states, prioritize direction and persistence:\n     * If Macro and Credit have been consistently weakening for 2 weeks and weaken again this week, it is appropriate to move cycle stage more defensively\n     * If only Breadth or Volatility wobbles while Macro and Credit stay firm, treat it as tactical noise, not a cycle change\n\n5. **If past_gamma_states is not provided**\n   - Assume that prior stage was same as your current raw stage, unless current indicators clearly justify a downgrade (e.g., broad deterioration in Macro and Credit) or clear upgrade\n   - Never complain about missing history; just apply above rules based on what you can see\n`;\n    } else {\n      console.log('[Gamma CSV-Only] No prior weeks found, proceeding without temporal context');\n    }\n  }\n  \n  const client = getOpenAI();\n  \n  // Step 1: Download and format 18 CSV files (first 2 rows + last 200 rows)
  console.log('[Gamma CSV-Only] Downloading 18 CSV files (first 2 + last 200 rows each)...');
  const latestDate = await getLatestCSVDate();
  console.log(`[Gamma CSV-Only] Using CSV data from: ${latestDate}`);
  
  const csvEmbeddedText = await downloadAndFormatCSVsAsText(
    latestDate, 
    GAMMA_CSV_FILES, 
    undefined,  // Use CSV_ROWS env variable or default (50 for csv_only)
    'csv_only'  // Mode: csv_only
  );
  
  console.log(`[Gamma CSV-Only] ✅ CSV data formatted (${csvEmbeddedText.length} characters)`);
  console.log(`[Gamma CSV-Only] CSV files processed: ${GAMMA_CSV_FILES.length}`);
  
  // Step 2: Create thread
  const thread = await client.beta.threads.create();
  console.log(`[Gamma CSV-Only] Thread created: ${thread.id}`);
  
  // Step 3: Send CSV data only (NO charts)
  const messageText = [
    mode,
    '',
    `Analysis Date: ${analysisDate}`,
    '',
    'IMPORTANT: Analyze ONLY the 18 CSV datasets provided below.',
    'No chart images are available.',
    'Use the numerical data (first 2 rows + last 200 rows per file) to:',
    '- Determine trends (rising/falling/stable)',
    '- Assess levels (high/low/neutral)',
    '- Identify market conditions across all 6 domains',
    '',
    'Return ONLY valid JSON (no text before or after).',
    `Use "${analysisDate}" as the asof_week in your output.`,
    priorWeeksContext, // Inject temporal context here
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
  
  console.log('[Gamma CSV-Only] CSV data sent to Assistant (text-only message)');
  
  // Step 4: Run the CSV-Only Assistant
  console.log('[Gamma CSV-Only] Creating run with:');
  console.log('  Assistant ID:', GAMMA_CSV_ASSISTANT_ID);
  console.log('  Thread ID:', thread.id);
  console.log('  tool_choice: none');
  console.log('  response_format: json_object');
  console.log('  temperature: 0');
  
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: GAMMA_CSV_ASSISTANT_ID,
    tool_choice: "none",
    response_format: { type: "json_object" },
    temperature: 0,
  });
  
  console.log(`[Gamma CSV-Only] Run created: ${run.id}`);
  console.log(`[Gamma CSV-Only] Initial status: ${run.status}`);
  
  // Step 5: Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Gamma CSV-Only] Status: ${runStatus.status}`);
  }
  
  if (runStatus.status === 'failed') {
    console.error('='.repeat(80));
    console.error('[Gamma CSV-Only] ❌ RUN FAILED');
    console.error('[Gamma CSV-Only] Status:', runStatus.status);
    console.error('[Gamma CSV-Only] Last error:', runStatus.last_error);
    console.error('[Gamma CSV-Only] Last error (JSON):', JSON.stringify(runStatus.last_error, null, 2));
    console.error('[Gamma CSV-Only] Run ID:', run.id);
    console.error('[Gamma CSV-Only] Thread ID:', thread.id);
    console.error('[Gamma CSV-Only] Assistant ID:', GAMMA_CSV_ASSISTANT_ID);
    console.error('[Gamma CSV-Only] Full run status:', JSON.stringify(runStatus, null, 2));
    console.error('='.repeat(80));
    throw new Error(`Gamma CSV-Only analysis failed: ${runStatus.last_error?.message || 'Unknown error'}`);
  }
  
  if (runStatus.status !== 'completed') {
    throw new Error(`Unexpected run status: ${runStatus.status}`);
  }
  
  console.log('[Gamma CSV-Only] ✅ Analysis completed');
  console.log('[Gamma CSV-Only] Token usage:', {
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
  console.log(`[Gamma CSV-Only] Raw response length: ${rawText.length} characters`);
  console.log(`[Gamma CSV-Only] First 200 chars: ${rawText.substring(0, 200)}`);
  
  // Extract JSON (handle potential text before/after JSON)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[Gamma CSV-Only] ❌ No JSON found in response');
    console.error('[Gamma CSV-Only] Raw text:', rawText);
    throw new Error('Failed to extract JSON from response');
  }
  
  const jsonText = jsonMatch[0];
  console.log('[Gamma CSV-Only] Extracted JSON length:', jsonText.length);
  
  let gammaData: any;
  try {
    gammaData = JSON.parse(jsonText);
    console.log('[Gamma CSV-Only] ✅ Successfully parsed JSON output');
  } catch (parseError) {
    console.error('[Gamma CSV-Only] ❌ JSON parse error:', parseError);
    console.error('[Gamma CSV-Only] JSON text:', jsonText.substring(0, 500));
    throw parseError;
  }
  
  // Step 7: Extract and structure result
  const level1 = gammaData.level1 || {};
  const level2 = gammaData.level2 || {};
  const cycleStage = level1.cycle_stage || {};
  const domainStatus = level1.domain_status || {};
  const overallSummary = level1.overall_summary || {};
  
  // Convert domain_status object to domains array
  let domains = level1.domains;
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
    asofWeek: level1.asof_week || analysisDate,
    cycleStagePrimary: cycleStage.primary || level1.cycle_stage_primary || 'Unknown',
    cycleStageTransition: cycleStage.transition || level1.cycle_stage_transition || 'Monitoring',
    macroPostureLabel: cycleStage.macro_posture || level1.macro_posture_label || 'Neutral',
    headlineSummary: overallSummary.summary || level1.headline_summary || 'Analysis complete',
    domains: domains || [],
    phaseConfidence: cycleStage.phase_confidence || level2.phase_confidence || '75%',
    cycleTone: cycleStage.tone || level2.cycle_tone || 'Neutral',
    overallSummary: level2.overall_summary || overallSummary.summary || 'Analysis complete',
    domainDetails: level2.domain_details || [],
    fullAnalysis: gammaData,
  };
  
  console.log('[Gamma CSV-Only] Analysis complete - ALL fields extracted');
  console.log('[Gamma CSV-Only] Cycle stage:', result.cycleStagePrimary);
  console.log('[Gamma CSV-Only] Domains extracted:', Array.isArray(result.domains) ? result.domains.length : 'N/A');
  console.log('[Gamma CSV-Only] Domain details:', Array.isArray(result.domainDetails) ? result.domainDetails.length : 'N/A');
  
  return result;
}

