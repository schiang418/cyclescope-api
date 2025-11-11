/**
 * Comparison test: Delta Standard vs Enhanced
 */

import { runDeltaAnalysis } from './server/assistants/delta.ts';

async function compareDeltaModes() {
  console.log('='.repeat(80));
  console.log('DELTA COMPARISON TEST: Standard vs Enhanced');
  console.log('='.repeat(80));
  
  // Test 1: Standard Mode
  console.log('\n📊 TEST 1: STANDARD MODE (charts only)');
  console.log('-'.repeat(80));
  process.env.ENABLE_ENHANCED_ANALYSIS = 'false';
  
  let standardResult;
  try {
    standardResult = await runDeltaAnalysis('engine');
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
    enhancedResult = await runDeltaAnalysis('engine');
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
  
  console.log('\n⚠️ Fragility:');
  console.log('  Standard:', `${standardResult.fragilityLabel} (${standardResult.fragilityScore})`);
  console.log('  Enhanced:', `${enhancedResult.fragilityLabel} (${enhancedResult.fragilityScore})`);
  console.log('  Score Match:', standardResult.fragilityScore === enhancedResult.fragilityScore ? '✅' : '⚠️');
  
  console.log('\n🎨 Fragility Color:');
  console.log('  Standard:', standardResult.fragilityColor);
  console.log('  Enhanced:', enhancedResult.fragilityColor);
  console.log('  Match:', standardResult.fragilityColor === enhancedResult.fragilityColor ? '✅' : '⚠️');
  
  console.log('\n📋 Template:');
  console.log('  Standard:', `${standardResult.templateName} (${standardResult.templateCode})`);
  console.log('  Enhanced:', `${enhancedResult.templateName} (${enhancedResult.templateCode})`);
  console.log('  Match:', standardResult.templateCode === enhancedResult.templateCode ? '✅' : '⚠️');
  
  console.log('\n🛡️ Posture:');
  console.log('  Standard:', `${standardResult.postureLabel} (${standardResult.postureCode})`);
  console.log('  Enhanced:', `${enhancedResult.postureLabel} (${enhancedResult.postureCode})`);
  console.log('  Match:', standardResult.postureCode === enhancedResult.postureCode ? '✅' : '⚠️');
  
  console.log('\n📝 Headline Summary:');
  console.log('  Standard:', standardResult.headlineSummary);
  console.log('  Enhanced:', enhancedResult.headlineSummary);
  
  console.log('\n🎯 Dimension Scores:');
  const dimensions = ['breadth', 'liquidity', 'volatility', 'leadership'];
  dimensions.forEach(dim => {
    const stdScore = standardResult[dim];
    const enhScore = enhancedResult[dim];
    const match = stdScore === enhScore ? '✅' : '⚠️';
    console.log(`  ${dim.padEnd(15)} Standard: ${stdScore}  Enhanced: ${enhScore}  ${match}`);
  });
  
  console.log('\n💬 Dimension Texts:');
  dimensions.forEach(dim => {
    const dimText = `${dim}Text`;
    console.log(`  ${dim}:`);
    console.log(`    Standard: ${standardResult[dimText] || '(empty)'}`);
    console.log(`    Enhanced: ${enhancedResult[dimText] || '(empty)'}`);
  });
  
  console.log('\n🔍 Phase:');
  console.log('  Standard:', `${standardResult.phaseUsed} (confidence: ${standardResult.phaseConfidence})`);
  console.log('  Enhanced:', `${enhancedResult.phaseUsed} (confidence: ${enhancedResult.phaseConfidence})`);
  
  console.log('\n🎯 Key Drivers:');
  console.log('  Standard:', standardResult.keyDrivers?.length || 0, 'drivers');
  standardResult.keyDrivers?.forEach((driver, i) => {
    console.log(`    ${i + 1}. ${driver}`);
  });
  console.log('  Enhanced:', enhancedResult.keyDrivers?.length || 0, 'drivers');
  enhancedResult.keyDrivers?.forEach((driver, i) => {
    console.log(`    ${i + 1}. ${driver}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Comparison Complete!');
  console.log('='.repeat(80));
}

compareDeltaModes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

