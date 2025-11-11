import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('Testing OpenAI API connection...');

try {
  // Test 1: List models
  console.log('\n1. Testing models endpoint...');
  const models = await openai.models.list();
  console.log('✅ Models API works, found', models.data.length, 'models');
  
  // Test 2: Check files endpoint
  console.log('\n2. Testing files endpoint...');
  const files = await openai.files.list();
  console.log('✅ Files API works, found', files.data.length, 'files');
  
  console.log('\n✅ OpenAI API connection successful!');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Status:', error.status);
  console.error('Headers:', error.headers);
}
