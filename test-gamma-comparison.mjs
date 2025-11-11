/**
 * Comparison test: Gamma Standard vs Enhanced
 */

import { runGammaAnalysis } from './server/assistants/gamma.ts';

async function compareGammaModes() {
  console.log('='.repeat(80));
  console.log('GAMMA COMPARISON TEST: Standard vs Enhanced');
  console.log('='.repeat(80));
  
  // Test 1: Standard Mode
  console.log('\n📊 TEST 1: STANDARD MODE (charts only)');
  console.log('-'.repeat(80));
  process.env.ENABLE_ENHANCED_ANALYSIS = 'false';
  
  let standardResult;
  try {
    standardResult = await runGammaAnalysis('engine');
    console.log('\n✅ Standard Mode Complete');
  } catch (error) {
    console.error('\n❌ Standard Mode Failed:', error.message);
    process.exit(1);
  }
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: Enhanced Mode
  console.log('\n\n📊 TEST 2: ENHANCED MODE (charts + CSV data)');
  console.log('-'.repeat(80));
  process.env.ENABLE_ENHANCED_ANALYSIS = 'true';
  
  let enhancedResult;
  try {
    enhancedResult = await runGammaAnalysis('engine');
    console.log('\n✅ Enhanced Mode Complete');
  } catch (error) {
    console.error('\n❌ Enhanced Mode Failed:', error.message);
    process.exit(1);
  }
  
  // Compare Results
  console.log('\n\n' + '='.repeat(80));
  console.log('COMPARISON RESULTS');
  console.log('='.repeat(80));
  
  console.log('\n📅 Analysis Date:');
  console.log('  Standard:', standardResult.asofDate);
  console.log('  Enhanced:', enhancedResult.asofDate);
  console.log('  Match:', standardResult.asofDate === enhancedResult.asofDate ? '✅' : '❌');
  
  console.log('\n🔄 Cycle Stage:');
  console.log('  Standard:', standardResult.cycleStagePrimary);
  console.log('  Enhanced:', enhancedResult.cycleStagePrimary);
  console.log('  Match:', standardResult.cycleStagePrimary === enhancedResult.cycleStagePrimary ? '✅' : '❌');
  
  console.log('\n🎯 Cycle Transition:');
  console.log('  Standard:', standardResult.cycleTransition);
  console.log('  Enhanced:', enhancedResult.cycleTransition);
  console.log('  Match:', standardResult.cycleTransition === enhancedResult.cycleTransition ? '✅' : '❌');
  
  console.log('\n📊 Macro Posture:');
  console.log('  Standard:', standardResult.macroPosture);
  console.log('  Enhanced:', enhancedResult.macroPosture);
  console.log('  Match:', standardResult.macroPosture === enhancedResult.macroPosture ? '✅' : '❌');
  
  console.log('\n🎲 Stage Confidence:');
  console.log('  Standard:', standardResult.stageConfidence);
  console.log('  Enhanced:', enhancedResult.stageConfidence);
  console.log('  Difference:', Math.abs(standardResult.stageConfidence - enhancedResult.stageConfidence).toFixed(2));
  
  console.log('\n📝 Headline Summary:');
  console.log('  Standard:', standardResult.headlineSummary);
  console.log('  Enhanced:', enhancedResult.headlineSummary);
  
  console.log('\n🎯 Domain Ratings:');
  const domains = ['leadership', 'breadth', 'sentiment', 'volatility', 'creditLiquidity', 'macroTrend'];
  domains.forEach(domain => {
    const stdRating = standardResult[`${domain}Rating`];
    const enhRating = enhancedResult[`${domain}Rating`];
    const match = stdRating === enhRating ? '✅' : '⚠️';
    console.log(`  ${domain.padEnd(20)} Standard: ${stdRating?.padEnd(10)} Enhanced: ${enhRating?.padEnd(10)} ${match}`);
  });
  
  console.log('\n💬 Overall Summary:');
  console.log('  Standard:', standardResult.overallSummary.substring(0, 100) + '...');
  console.log('  Enhanced:', enhancedResult.overallSummary.substring(0, 100) + '...');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Comparison Complete!');
  console.log('='.repeat(80));
}

compareGammaModes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

