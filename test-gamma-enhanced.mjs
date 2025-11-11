/**
 * Test script for Gamma Enhanced Analysis
 * 
 * This script tests the enhanced Gamma analysis with both charts and CSV data.
 * 
 * Usage:
 *   export OPENAI_API_KEY="your-key"
 *   node test-gamma-enhanced.mjs
 */

import { runGammaEnhancedAnalysis } from './server/assistants/gammaEnhanced.ts';

async function testGammaEnhanced() {
  console.log('============================================================');
  console.log('Gamma Enhanced Analysis Test');
  console.log('============================================================\n');
  
  try {
    console.log('Starting Gamma Enhanced analysis...\n');
    console.log('This will:');
    console.log('1. Upload 18 CSV files to OpenAI');
    console.log('2. Send 18 chart images to OpenAI Assistant');
    console.log('3. Run enhanced analysis with both data sources');
    console.log('4. Return structured JSON output\n');
    console.log('Expected time: 1-3 minutes\n');
    console.log('='.repeat(60));
    
    const result = await runGammaEnhancedAnalysis('engine');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Gamma Enhanced Analysis Complete!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Analysis Summary:');
    console.log('  As of Week:', result.asofWeek);
    console.log('  Cycle Stage:', result.cycleStagePrimary);
    console.log('  Cycle Transition:', result.cycleStageTransition);
    console.log('  Macro Posture:', result.macroPostureLabel);
    console.log('  Phase Confidence:', result.phaseConfidence);
    console.log('  Cycle Tone:', result.cycleTone);
    
    console.log('\n📝 Headline Summary:');
    console.log(' ', result.headlineSummary);
    
    console.log('\n🎯 Domains Analyzed:', result.domains.length);
    result.domains.forEach((domain, i) => {
      console.log(`  ${i + 1}. ${domain.domain_name}: ${domain.bias_emoji} ${domain.bias_label}`);
    });
    
    console.log('\n💬 Overall Summary:');
    console.log(' ', result.overallSummary);
    
    console.log('\n📄 Full Analysis Object Keys:');
    console.log(' ', Object.keys(result.fullAnalysis));
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testGammaEnhanced();

