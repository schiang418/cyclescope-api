import OpenAI from 'openai';

async function testOpenAIConnection() {
  console.log('='.repeat(60));
  console.log('Testing OpenAI Connection');
  console.log('='.repeat(60));
  
  // Check environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.GAMMA_ASSISTANT_ID || 'asst_Ynyur2GgkCWgLKmuqiM8zIt2';
  
  console.log('\n1. Environment Variables:');
  console.log(`   OPENAI_API_KEY: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET'}`);
  console.log(`   GAMMA_ASSISTANT_ID: ${assistantId}`);
  
  if (!apiKey) {
    console.error('\n❌ OPENAI_API_KEY is not set!');
    process.exit(1);
  }
  
  // Initialize OpenAI client
  const client = new OpenAI({ apiKey });
  
  try {
    // Test 1: Retrieve assistant
    console.log('\n2. Testing Assistant Retrieval...');
    const assistant = await client.beta.assistants.retrieve(assistantId);
    console.log(`   ✓ Assistant found: ${assistant.name}`);
    console.log(`   ✓ Model: ${assistant.model}`);
    console.log(`   ✓ Response format: ${JSON.stringify(assistant.response_format)}`);
    
    // Test 2: Create a simple thread
    console.log('\n3. Testing Thread Creation...');
    const thread = await client.beta.threads.create();
    console.log(`   ✓ Thread created: ${thread.id}`);
    
    // Test 3: Send a simple message
    console.log('\n4. Testing Message Creation...');
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: 'Hello, this is a test message.'
    });
    console.log(`   ✓ Message sent`);
    
    // Test 4: Run assistant with simple message (no images)
    console.log('\n5. Testing Assistant Run (simple text)...');
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
      response_format: { type: 'text' }
    });
    console.log(`   ✓ Run created: ${run.id}`);
    console.log(`   ✓ Initial status: ${run.status}`);
    
    // Wait for completion
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    while (runStatus.status !== 'completed' && attempts < 30) {
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        console.error(`\n❌ Run failed with status: ${runStatus.status}`);
        console.error(`   Last error:`, JSON.stringify(runStatus.last_error, null, 2));
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(`   Status: ${runStatus.status}`);
      attempts++;
    }
    
    if (runStatus.status === 'completed') {
      console.log(`\n✓ Run completed successfully!`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Status: ${error.status}`);
    console.error(`   Full error:`, JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

testOpenAIConnection();

