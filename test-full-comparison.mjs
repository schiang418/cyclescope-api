import { runGammaAnalysis } from './server/assistants/gamma.ts';
import { runDeltaAnalysis } from './server/assistants/delta.ts';

console.log('================================================================================');
console.log('COMPREHENSIVE COMPARISON: Standard vs Enhanced (Gamma + Delta)');
console.log('================================================================================\n');

// Test Gamma
console.log('📊 GAMMA ANALYSIS');
console.log('================================================================================\n');

console.log('🔹 Test 1: Gamma STANDARD MODE');
console.log('--------------------------------------------------------------------------------');
process.env.ENABLE_ENHANCED_ANALYSIS = 'false';
const gammaStandard = await runGammaAnalysis('engine');
console.log('✅ Gamma Standard Complete\n');

console.log('🔹 Test 2: Gamma ENHANCED MODE');
console.log('--------------------------------------------------------------------------------');
process.env.ENABLE_ENHANCED_ANALYSIS = 'true';
const gammaEnhanced = await runGammaAnalysis('engine');
console.log('✅ Gamma Enhanced Complete\n');

// Test Delta
console.log('\n📊 DELTA ANALYSIS');
console.log('================================================================================\n');

console.log('🔹 Test 3: Delta STANDARD MODE');
console.log('--------------------------------------------------------------------------------');
process.env.ENABLE_ENHANCED_ANALYSIS = 'false';
const deltaStandard = await runDeltaAnalysis('engine');
console.log('✅ Delta Standard Complete\n');

console.log('🔹 Test 4: Delta ENHANCED MODE');
console.log('--------------------------------------------------------------------------------');
process.env.ENABLE_ENHANCED_ANALYSIS = 'true';
const deltaEnhanced = await runDeltaAnalysis('engine');
console.log('✅ Delta Enhanced Complete\n');

// Comparison Report
console.log('\n================================================================================');
console.log('COMPARISON REPORT');
console.log('================================================================================\n');

console.log('📊 GAMMA COMPARISON');
console.log('--------------------------------------------------------------------------------');
console.log('Cycle Stage:');
console.log(`  Standard:  ${gammaStandard.cycleStagePrimary}`);
console.log(`  Enhanced:  ${gammaEnhanced.cycleStagePrimary}`);
console.log(`  Match:     ${gammaStandard.cycleStagePrimary === gammaEnhanced.cycleStagePrimary ? '✅' : '⚠️'}\n`);

console.log('Macro Posture:');
console.log(`  Standard:  ${gammaStandard.macroPosture}`);
console.log(`  Enhanced:  ${gammaEnhanced.macroPosture}`);
console.log(`  Match:     ${gammaStandard.macroPosture === gammaEnhanced.macroPosture ? '✅' : '⚠️'}\n`);

console.log('Headline Summary:');
console.log(`  Standard:  ${gammaStandard.headlineSummary}`);
console.log(`  Enhanced:  ${gammaEnhanced.headlineSummary}\n`);

console.log('Domains:');
console.log(`  Standard:  ${gammaStandard.domains.length} domains`);
console.log(`  Enhanced:  ${gammaEnhanced.domains.length} domains\n`);

console.log('\n📊 DELTA COMPARISON');
console.log('--------------------------------------------------------------------------------');
console.log('Fragility:');
console.log(`  Standard:  ${deltaStandard.fragilityLabel} (${deltaStandard.fragilityScore})`);
console.log(`  Enhanced:  ${deltaEnhanced.fragilityLabel} (${deltaEnhanced.fragilityScore})`);
console.log(`  Match:     ${deltaStandard.fragilityScore === deltaEnhanced.fragilityScore ? '✅' : '⚠️'}\n`);

console.log('Template:');
console.log(`  Standard:  ${deltaStandard.templateName} (${deltaStandard.templateCode})`);
console.log(`  Enhanced:  ${deltaEnhanced.templateName} (${deltaEnhanced.templateCode})`);
console.log(`  Match:     ${deltaStandard.templateCode === deltaEnhanced.templateCode ? '✅' : '⚠️'}\n`);

console.log('Posture:');
console.log(`  Standard:  ${deltaStandard.postureLabel} (${deltaStandard.postureCode})`);
console.log(`  Enhanced:  ${deltaEnhanced.postureLabel} (${deltaEnhanced.postureCode})`);
console.log(`  Match:     ${deltaStandard.postureCode === deltaEnhanced.postureCode ? '✅' : '⚠️'}\n`);

console.log('Dimension Scores:');
console.log(`  Breadth:     Standard=${deltaStandard.breadth}  Enhanced=${deltaEnhanced.breadth}  ${deltaStandard.breadth === deltaEnhanced.breadth ? '✅' : '⚠️'}`);
console.log(`  Liquidity:   Standard=${deltaStandard.liquidity}  Enhanced=${deltaEnhanced.liquidity}  ${deltaStandard.liquidity === deltaEnhanced.liquidity ? '✅' : '⚠️'}`);
console.log(`  Volatility:  Standard=${deltaStandard.volatility}  Enhanced=${deltaEnhanced.volatility}  ${deltaStandard.volatility === deltaEnhanced.volatility ? '✅' : '⚠️'}`);
console.log(`  Leadership:  Standard=${deltaStandard.leadership}  Enhanced=${deltaEnhanced.leadership}  ${deltaStandard.leadership === deltaEnhanced.leadership ? '✅' : '⚠️'}\n`);

console.log('Headline Summary:');
console.log(`  Standard:  ${deltaStandard.headlineSummary}`);
console.log(`  Enhanced:  ${deltaEnhanced.headlineSummary}\n`);

console.log('================================================================================');
console.log('✅ Full Comparison Complete!');
console.log('================================================================================');

