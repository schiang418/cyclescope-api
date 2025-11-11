import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'  // Explicit base URL
});

console.log('Testing with explicit base URL...');
console.log('Base URL:', openai.baseURL);

try {
  const models = await openai.models.list();
  console.log('✅ Success! Found', models.data.length, 'models');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Status:', error.status);
  console.error('Type:', error.constructor.name);
}
