import OpenAI from 'openai';
import { GammaAnalysisResult } from './gamma.js';
import { DeltaAnalysisResult } from './delta.js';

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

const FUSION_ASSISTANT_ID = process.env.FUSION_ASSISTANT_ID || 'asst_n5pAPgQbIwbSrFx76PgtEsPY';

export interface FusionAnalysisResult {
  // Layer 1 fields
  asofDate: string;
  cycleStage: string;
  fragilityColor: string;
  fragilityLabel: string;
  guidanceLabel: string;
  headlineSummary: string;
  
  // Layer 2 fields
  cycleTone: string;
  narrativeSummary: string;
  guidanceBullets: string[];
  watchCommentary: string;
  
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
 * Run Fusion Assistant to synthesize Gamma and Delta analyses
 */
export async function runFusionAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  gammaResult: GammaAnalysisResult,
  deltaResult: DeltaAnalysisResult,
  date?: string
): Promise<FusionAnalysisResult> {
  const analysisDate = date || getMarketDate();
  console.log('🔥🔥🔥 FUSION SYNTHESIS - Combining Gamma + Delta analyses 🔥🔥🔥');
  console.log(`[Fusion] Starting synthesis analysis for ${analysisDate} (market date)...`);
  console.log(`[Fusion] Mode: ${mode}`);
  console.log(`[Fusion] Input data:`);
  console.log(`  - Gamma cycle stage: ${gammaResult.cycleStagePrimary}`);
  console.log(`  - Delta fragility: ${deltaResult.fragilityLabel} (score: ${deltaResult.fragilityScore})`);
  
  const client = getOpenAI();
  
  // Create thread
  const thread = await client.beta.threads.create();
  console.log(`[Fusion] Thread created: ${thread.id}`);
  
  // Pass the full JSON objects from Gamma and Delta
  const synthesisPrompt = `${mode}

IMPORTANT: Use this exact date in your output:
Analysis Date: ${analysisDate}

Please synthesize the following market analyses and provide integrated assessment:

**GAMMA ANALYSIS (Weekly Macro Cycle Snapshot):**
${JSON.stringify(gammaResult.fullAnalysis, null, 2)}

**DELTA ANALYSIS (Market Fragility Engine):**
${JSON.stringify(deltaResult.fullAnalysis, null, 2)}

Please provide:
1. Market Phase (ACCUMULATION, MARKUP, DISTRIBUTION, or MARKDOWN)
2. Fragility Level (LOW, MODERATE, or HIGH)
3. Strategic Guidance (2-3 sentences)
`;
  
  console.log(`[Fusion] Sending synthesis prompt (${synthesisPrompt.length} chars)...`);
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: synthesisPrompt,
  });
  console.log('[Fusion] Synthesis prompt sent successfully');
  
  // Run assistant
  console.log(`[Fusion] Starting assistant run...`);
  console.log(`[Fusion] Assistant ID: ${FUSION_ASSISTANT_ID}`);
  const run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: FUSION_ASSISTANT_ID,
  });
  console.log(`[Fusion] Run created: ${run.id}`);
  
  // Wait for completion
  let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
      console.error(`[Fusion] ❌ Run failed with status: ${runStatus.status}`);
      if (runStatus.last_error) {
        console.error('[Fusion] Last error:', JSON.stringify(runStatus.last_error, null, 2));
      }
      throw new Error(`Fusion analysis failed: ${runStatus.status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    console.log(`[Fusion] Status: ${runStatus.status}`);
  }
  
  console.log('[Fusion] ✅ Run completed successfully');
  
  // Get response
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
    throw new Error('No valid response from Fusion assistant');
  }
  
  const fullAnalysis = assistantMessage.content[0].text.value;
  
  // Log the raw response for debugging
  console.log('[Fusion] Raw response (first 200 chars):', fullAnalysis.substring(0, 200));
  
  // Try to extract JSON from various formats
  let jsonString = fullAnalysis;
  
  // 1. Try to extract from markdown code blocks
  const markdownMatch = fullAnalysis.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    jsonString = markdownMatch[1].trim();
    console.log('[Fusion] Extracted JSON from markdown code block');
  } else {
    // 2. Try to find JSON object starting with { and ending with }
    const jsonObjectMatch = fullAnalysis.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonString = jsonObjectMatch[0].trim();
      console.log('[Fusion] Extracted JSON object from text');
    }
  }
  
  // Parse JSON output (mode='engine' should return JSON)
  let fusionData;
  try {
    fusionData = JSON.parse(jsonString);
  } catch (parseError) {
    console.error('[Fusion] JSON parse failed!');
    console.error('[Fusion] Full response:', fullAnalysis);
    throw new Error(`Failed to parse Fusion response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
  console.log('[Fusion] Successfully parsed JSON output');
  
  // Extract ALL fields from JSON
  const result: FusionAnalysisResult = {
    // Layer 1
    asofDate: fusionData.layer1.asof_date,
    cycleStage: fusionData.layer1.cycle_stage,
    fragilityColor: fusionData.layer1.fragility_color,
    fragilityLabel: fusionData.layer1.fragility_label,
    guidanceLabel: fusionData.layer1.guidance_label,
    headlineSummary: fusionData.layer1.headline_summary,
    
    // Layer 2
    cycleTone: fusionData.layer2.cycle_tone,
    narrativeSummary: fusionData.layer2.narrative_summary,
    guidanceBullets: fusionData.layer2.guidance_bullets,
    watchCommentary: fusionData.layer2.watch_commentary,
    
    fullAnalysis: fusionData,
  };
  
  console.log('[Fusion] ✅ Synthesis complete - ALL fields extracted');
  console.log('[Fusion] Results summary:');
  console.log(`  - Cycle Stage: ${result.cycleStage}`);
  console.log(`  - Fragility: ${result.fragilityLabel} (${result.fragilityColor})`);
  console.log(`  - Guidance: ${result.guidanceLabel}`);
  console.log(`  - Headline: ${result.headlineSummary.substring(0, 80)}...`);
  console.log('[Fusion] 🎉 Fusion analysis complete!');
  
  return result;
}

