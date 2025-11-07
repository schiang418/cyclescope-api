import { runGammaAnalysis } from './server/assistants/gamma.js';

console.log('Testing Gamma analysis locally...\n');

try {
  const result = await runGammaAnalysis('engine');
  
  console.log('=== GAMMA RESULT ===');
  console.log('Cycle Stage:', result.cycleStagePrimary);
  console.log('Posture:', result.macroPostureLabel);
  
  const level2 = result.fullAnalysis?.level2;
  if (level2?.domain_details) {
    console.log('\n=== DOMAIN OBSERVATIONS ===');
    for (const domain of level2.domain_details.slice(0, 3)) {
      console.log(`\n${domain.domain_name}:`);
      console.log(`  Observations: ${domain.observations}`);
    }
  }
  
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
