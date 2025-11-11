import { runDeltaAnalysis } from './server/assistants/delta.ts';

console.log('================================================================================');
console.log('DELTA ENHANCED - FULL OUTPUT TEST');
console.log('================================================================================');

// Set Enhanced mode
process.env.ENABLE_ENHANCED_ANALYSIS = 'true';

try {
  const result = await runDeltaAnalysis('engine');
  
  console.log('\n📊 DELTA ENHANCED RESULT:');
  console.log('================================================================================');
  console.log(JSON.stringify(result, null, 2));
  console.log('================================================================================');
  
  console.log('\n✅ Test completed successfully!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}

