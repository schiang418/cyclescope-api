import OpenAI from 'openai';

// Load environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FUSION_ASSISTANT_ID = process.env.FUSION_ASSISTANT_ID || 'asst_n5pAPgQbIwbSrFx76PgtEsPY';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set');
  process.exit(1);
}

console.log('🔑 Using API Key:', OPENAI_API_KEY.substring(0, 20) + '...');
console.log('🤖 Testing Fusion Assistant:', FUSION_ASSISTANT_ID);
console.log('');

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Mock Gamma and Delta results
const mockGammaResult = {
  fullAnalysis: {
    asofDate: "2024-11-06",
    cycleStage: "Late Expansion",
    domains: [
      { domain: "Equities", status: "Bullish", commentary: "Strong momentum" },
      { domain: "Bonds", status: "Neutral", commentary: "Stable yields" },
      { domain: "Credit", status: "Bullish", commentary: "Tight spreads" },
      { domain: "Commodities", status: "Neutral", commentary: "Mixed signals" },
      { domain: "Currencies", status: "Neutral", commentary: "Dollar stable" },
      { domain: "Volatility", status: "Bearish", commentary: "Low VIX" }
    ]
  }
};

const mockDeltaResult = {
  fullAnalysis: {
    asofDate: "2024-11-06",
    fragilityScore: 4,
    fragilityLabel: "Elevated Internal Risk",
    stressScores: {
      breadth: 1,
      liquidity: 0,
      volatility: 2,
      leadership: 1
    }
  }
};

async function testFusionAssistant() {
  try {
    console.log('📝 Creating thread...');
    const thread = await client.beta.threads.create();
    console.log('✅ Thread created:', thread.id);
    console.log('');

    const analysisDate = '2024-11-06';
    const synthesisPrompt = `
IMPORTANT: Use this exact date in your output:
Analysis Date: ${analysisDate}

Please synthesize the following market analyses and provide integrated assessment:

**GAMMA ANALYSIS (Weekly Macro Cycle Snapshot):**
${JSON.stringify(mockGammaResult.fullAnalysis, null, 2)}

**DELTA ANALYSIS (Market Fragility Engine):**
${JSON.stringify(mockDeltaResult.fullAnalysis, null, 2)}

Please provide:
1. Market Phase (ACCUMULATION, MARKUP, DISTRIBUTION, or MARKDOWN)
2. Fragility Level (LOW, MODERATE, or HIGH)
3. Strategic Guidance (2-3 sentences)
`;

    console.log('📤 Sending message to assistant...');
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: synthesisPrompt,
    });
    console.log('✅ Message sent');
    console.log('');

    console.log('🏃 Running assistant...');
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: FUSION_ASSISTANT_ID,
    });
    console.log('✅ Run started:', run.id);
    console.log('');

    // Wait for completion
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    let iterations = 0;
    
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        console.error('❌ Run failed:', runStatus.status);
        console.error('Last error:', runStatus.last_error);
        process.exit(1);
      }
      
      iterations++;
      console.log(`⏳ [${iterations}] Status: ${runStatus.status}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    console.log('✅ Run completed!');
    console.log('');

    // Get response
    console.log('📥 Fetching assistant response...');
    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content[0] || assistantMessage.content[0].type !== 'text') {
      console.error('❌ No valid response from assistant');
      process.exit(1);
    }
    
    const fullAnalysis = assistantMessage.content[0].text.value;
    
    console.log('');
    console.log('=' .repeat(80));
    console.log('📊 FUSION ASSISTANT OUTPUT:');
    console.log('='.repeat(80));
    console.log(fullAnalysis);
    console.log('='.repeat(80));
    console.log('');

    // Try to parse as JSON
    console.log('🔍 Attempting to parse as JSON...');
    try {
      const fusionData = JSON.parse(fullAnalysis);
      console.log('✅ SUCCESS! Output is valid JSON');
      console.log('');
      console.log('📋 Parsed data:');
      console.log(JSON.stringify(fusionData, null, 2));
    } catch (error) {
      console.error('❌ FAILED! Output is NOT valid JSON');
      console.error('Error:', error.message);
      console.log('');
      console.log('🔍 First 200 characters of output:');
      console.log(fullAnalysis.substring(0, 200));
      console.log('');
      console.log('🔍 Last 200 characters of output:');
      console.log(fullAnalysis.substring(fullAnalysis.length - 200));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFusionAssistant();

