import OpenAI from 'openai';

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'
});

const assistant = await client.beta.assistants.retrieve('asst_Ynyur2GgkCWgLKmuqiM8zIt2');

console.log('='.repeat(80));
console.log('GAMMA ASSISTANT CONFIGURATION');
console.log('='.repeat(80));
console.log('Model:', assistant.model);
console.log('Tools:', JSON.stringify(assistant.tools, null, 2));
console.log('Temperature:', assistant.temperature);
console.log('Instructions length:', assistant.instructions?.length || 0, 'characters');
console.log('\nInstructions preview (first 1000 chars):');
console.log('-'.repeat(80));
console.log(assistant.instructions?.substring(0, 1000));
console.log('...');
console.log('='.repeat(80));

