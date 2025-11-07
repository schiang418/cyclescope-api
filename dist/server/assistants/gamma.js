import OpenAI from 'openai';
// Lazy initialization to ensure env vars are loaded
let openai = null;
function getOpenAI() {
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
const GAMMA_ASSISTANT_ID = process.env.GAMMA_ASSISTANT_ID || 'asst_Ynyur2GgkCWgLKmuqiM8zIt2';
// Gamma Dashboard Chart URLs (18 charts across 6 domains)
const GAMMA_CHART_BASE_URL = 'https://cyclescope-dashboard-production.up.railway.app/charts/';
const GAMMA_CHARTS = [
    // MACRO (3 charts)
    { id: '01', name: 'SPX_Secular_Trend', domain: 'MACRO' },
    { id: '02', name: 'Yield_Curve', domain: 'MACRO' },
    { id: '03', name: 'Dollar_Index', domain: 'MACRO' },
    // LEADERSHIP (3 charts)
    { id: '04', name: 'SPX_vs_EW', domain: 'LEADERSHIP' },
    { id: '05', name: 'Tech_Leadership', domain: 'LEADERSHIP' },
    { id: '06', name: 'Cyclical_Defensive', domain: 'LEADERSHIP' },
    // BREADTH (3 charts)
    { id: '07', name: 'Advance_Decline', domain: 'BREADTH' },
    { id: '08', name: 'New_Highs_Lows', domain: 'BREADTH' },
    { id: '09', name: 'Percent_Above_MA', domain: 'BREADTH' },
    // CREDIT (3 charts)
    { id: '10', name: 'Credit_Spreads', domain: 'CREDIT' },
    { id: '11', name: 'High_Yield', domain: 'CREDIT' },
    { id: '12', name: 'TED_Spread', domain: 'CREDIT' },
    // VOLATILITY (3 charts)
    { id: '13', name: 'VIX', domain: 'VOLATILITY' },
    { id: '14', name: 'VVIX', domain: 'VOLATILITY' },
    { id: '15', name: 'Put_Call_Ratio', domain: 'VOLATILITY' },
    // SENTIMENT (3 charts)
    { id: '16', name: 'AAII_Survey', domain: 'SENTIMENT' },
    { id: '17', name: 'CNN_Fear_Greed', domain: 'SENTIMENT' },
    { id: '18', name: 'Margin_Debt', domain: 'SENTIMENT' },
];
/**
 * Get current market date in US Eastern Time
 */
function getMarketDate() {
    const now = new Date();
    const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return etDate.toISOString().split('T')[0];
}
/**
 * Run Gamma Assistant analysis on 18 charts
 */
export async function runGammaAnalysis(mode = 'engine', date) {
    const analysisDate = date || getMarketDate();
    console.log(`[Gamma] Starting analysis for ${analysisDate} (market date) with 18 charts...`);
    const client = getOpenAI();
    // Create thread
    const thread = await client.beta.threads.create();
    // Prepare chart URLs
    const chartUrls = GAMMA_CHARTS.map(chart => `${GAMMA_CHART_BASE_URL}${chart.id}_${chart.name}.png`);
    // CRITICAL FIX: Send charts in 2 batches (9 + 9) to match working local test
    // Sending all 18 images in one message causes OpenAI to give generic observations
    // Splitting into batches allows proper detailed analysis with specific indicator values
    const batchSize = 9;
    const totalBatches = 2;
    console.log(`[Gamma] Sending ${chartUrls.length} charts in ${totalBatches} batches...`);
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * batchSize;
        const endIdx = Math.min(startIdx + batchSize, chartUrls.length);
        const batchUrls = chartUrls.slice(startIdx, endIdx);
        const messageContent = [];
        // Add command only in first batch
        if (batchNum === 0) {
            messageContent.push({
                type: 'text',
                text: `${mode}\n\nIMPORTANT: Use this exact date in your output:\nAnalysis Date: ${analysisDate}\n\nFor JSON output, use this date in the "asof_date" field in BOTH level1 and level2:\n"asof_date": "${analysisDate}"\n\nCRITICAL: For each domain in level2 domain_details, you MUST:\n1. READ the actual numeric indicator values from the chart images\n2. Include SPECIFIC VALUES in the "observations" field (e.g., "XLY/XLP = 1.5, IWF/IWD = 1.1")\n3. DO NOT use generic descriptions - quote the actual numbers you see\n\nPlease analyze the provided charts and return ONLY valid JSON (no text before or after).\nThe output must be directly parseable by JSON.parse().`
            });
        }
        // Add chart images for this batch
        for (const chartUrl of batchUrls) {
            messageContent.push({
                type: 'image_url',
                image_url: { url: chartUrl }
            });
        }
        console.log(`[Gamma] Batch ${batchNum + 1}/${totalBatches}: Sending ${batchUrls.length} charts (${startIdx + 1}-${endIdx})`);
        await client.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: messageContent,
        });
    }
    console.log('[Gamma] All batches sent successfully');
    // Run assistant (after all batches are sent)
    console.log('[Gamma] Running assistant...');
    const run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: GAMMA_ASSISTANT_ID,
    });
    // Wait for completion
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
        if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
            throw new Error(`Gamma analysis failed: ${runStatus.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(`[Gamma] Status: ${runStatus.status}`);
    }
    // Get response
    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
        throw new Error('No valid response from Gamma assistant');
    }
    const fullAnalysis = assistantMessage.content[0].text.value;
    // Parse JSON output (mode='engine' always returns JSON)
    const gammaData = JSON.parse(fullAnalysis);
    console.log('[Gamma] Successfully parsed JSON output');
    // Extract ALL fields from JSON
    const result = {
        // Level 1
        asofWeek: gammaData.level1.asof_week,
        cycleStagePrimary: gammaData.level1.cycle_stage_primary,
        cycleStageTransition: gammaData.level1.cycle_stage_transition,
        macroPostureLabel: gammaData.level1.macro_posture_label,
        headlineSummary: gammaData.level1.headline_summary,
        domains: gammaData.level1.domains, // Full array with all domain data
        // Level 2
        phaseConfidence: gammaData.level2.phase_confidence,
        cycleTone: gammaData.level2.cycle_tone,
        overallSummary: gammaData.level2.overall_summary,
        domainDetails: gammaData.level2.domain_details, // Full array with detailed analysis
        fullAnalysis: gammaData,
    };
    console.log('[Gamma] Analysis complete - ALL fields extracted');
    console.log('[Gamma] Cycle stage:', result.cycleStagePrimary);
    console.log('[Gamma] Domains extracted:', result.domains.length);
    return result;
}
