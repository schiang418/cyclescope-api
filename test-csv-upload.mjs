// test-csv-upload.mjs
// Test script for CSV uploader utility

import { getLatestCSVDate, uploadCSVToOpenAI, uploadAllCSVs } from './server/assistants/csvUploader.ts';

console.log('='.repeat(60));
console.log('CSV Uploader Test Suite');
console.log('='.repeat(60));

async function testGetLatestDate() {
  console.log('\n📅 Test 1: Get Latest Date');
  console.log('-'.repeat(60));
  
  try {
    const latestDate = await getLatestCSVDate();
    console.log(`✅ SUCCESS: Latest date is ${latestDate}`);
    return latestDate;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    throw error;
  }
}

async function testUploadSingleCSV(date) {
  console.log('\n📤 Test 2: Upload Single CSV');
  console.log('-'.repeat(60));
  
  try {
    const csvUrl = `https://cyclescope-downloader-production.up.railway.app/download/${date}/_SPX_for_gpt_weekly.csv`;
    const fileId = await uploadCSVToOpenAI(csvUrl, '_SPX_for_gpt_weekly.csv');
    console.log(`✅ SUCCESS: File uploaded with ID: ${fileId}`);
    return fileId;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    throw error;
  }
}

async function testUploadMultipleCSVs(date) {
  console.log('\n📦 Test 3: Upload Multiple CSVs (3 files)');
  console.log('-'.repeat(60));
  
  const testFiles = [
    '_SPX_for_gpt_weekly.csv',
    '_COPPER_GOLD_for_gpt_weekly.csv',
    '_DXY_for_gpt_weekly.csv'
  ];
  
  try {
    const fileIds = await uploadAllCSVs(date, testFiles);
    console.log(`✅ SUCCESS: Uploaded ${fileIds.length}/${testFiles.length} files`);
    console.log('File IDs:', fileIds);
    return fileIds;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    throw error;
  }
}

async function runTests() {
  try {
    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('\n❌ ERROR: OPENAI_API_KEY environment variable not set');
      console.log('\nPlease set it with:');
      console.log('export OPENAI_API_KEY="your-api-key"');
      process.exit(1);
    }
    
    // Run tests
    const latestDate = await testGetLatestDate();
    await testUploadSingleCSV(latestDate);
    await testUploadMultipleCSVs(latestDate);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Review the test results above');
    console.log('2. Verify file IDs are valid');
    console.log('3. Proceed to Step 2: Update Assistant Instructions');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ TEST SUITE FAILED');
    console.log('='.repeat(60));
    console.error('\nError:', error);
    process.exit(1);
  }
}

runTests();

