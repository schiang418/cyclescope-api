import OpenAI from 'openai';

async function testSingleImage() {
  console.log('='.repeat(60));
  console.log('Testing Assistant with Single Image');
  console.log('='.repeat(60));
  
  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.GAMMA_ASSISTANT_ID || 'asst_Ynyur2GgkCWgLKmuqiM8zIt2';
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set!');
    process.exit(1);
  }
  
  const client = new OpenAI({ apiKey });
  
  try {
    console.log('\n1. Creating thread...');
    const thread = await client.beta.threads.create();
    console.log(`   ✓ Thread created: ${thread.id}`);
    
    console.log('\n2. Sending message with 1 image...');
    const imageUrl = 'https://cyclescope-dashboard-production.up.railway.app/charts/01_SPX_Secular_Trend.png';
    
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'engine\n\nPlease analyze this chart and return a brief JSON response with your observation.'
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        }
      ]
    });
    console.log(`   ✓ Message sent with image: ${imageUrl}`);
    
    console.log('\n3. Running assistant...');
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
      response_format: { type: 'text' }
    });
    console.log(`   ✓ Run created: ${run.id}`);
    
    console.log('\n4. Waiting for completion...');
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    
    while (runStatus.status !== 'completed' && attempts < 60) {
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
        console.error(`\n❌ Run failed with status: ${runStatus.status}`);
        console.error(`   Last error:`, JSON.stringify(runStatus.last_error, null, 2));
        console.error(`   Full status:`, JSON.stringify(runStatus, null, 2));
        process.exit(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(`   Status: ${runStatus.status}`);
      attempts++;
    }
    
    if (runStatus.status === 'completed') {
      console.log(`\n✓ Run completed successfully!`);
      
      const messages = await client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
        console.log('\n5. Assistant response:');
        console.log('---');
        console.log(assistantMessage.content[0].text.value);
        console.log('---');
      }
    } else {
      console.error(`\n❌ Timeout after ${attempts} attempts`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Status: ${error.status}`);
    if (error.response) {
      console.error(`   Response:`, JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

testSingleImage();

