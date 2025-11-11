/**
 * Test script for Delta Enhanced Analysis
 * Tests the enhanced version with 14 charts + 14 CSV files (text-embedded)
 */

import { runDeltaEnhancedAnalysis } from './server/assistants/deltaEnhanced.ts';

async function testDeltaEnhanced() {
  try {
    console.log('🧪 Testing Delta Enhanced Analysis...\n');
    console.log('='.repeat(60));
    console.log('TEST: Delta Enhanced (14 charts + 14 CSV files)');
    console.log('='.repeat(60));
    
    const result = await runDeltaEnhancedAnalysis('engine');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Delta Enhanced Analysis Complete!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Analysis Summary:');
    console.log('  As of Date:', result.asofDate);
    console.log('  Fragility:', result.fragilityLabel, `(${result.fragilityScore})`);
    console.log('  Fragility Color:', result.fragilityColor);
    console.log('  Template:', result.templateName, `(${result.templateCode})`);
    console.log('  Posture:', result.postureLabel, `(${result.postureCode})`);
    console.log('  Phase Used:', result.phaseUsed);
    console.log('  Phase Confidence:', result.phaseConfidence);
    
    console.log('\n📝 Headline Summary:');
    console.log(' ', result.headlineSummary);
    
    console.log('\n🎯 Key Drivers:');
    result.keyDrivers.forEach((driver, i) => {
      console.log(`  ${i + 1}. ${driver}`);
    });
    
    console.log('\n📊 Dimension Scores:');
    console.log('  Breadth:', result.breadth);
    console.log('  Liquidity:', result.liquidity);
    console.log('  Volatility:', result.volatility);
    console.log('  Leadership:', result.leadership);
    
    console.log('\n💬 Dimension Texts:');
    console.log('  Breadth:', result.breadthText);
    console.log('  Liquidity:', result.liquidityText);
    console.log('  Volatility:', result.volatilityText);
    console.log('  Leadership:', result.leadershipText);
    
    console.log('\n📄 Full Analysis Object Keys:');
    console.log(' ', Object.keys(result.fullAnalysis));
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testDeltaEnhanced();

