// cleanup-openai-files.mjs
// Script to clean up old files from OpenAI Files API

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
});

// Configuration
const MAX_AGE_DAYS = 7;  // Delete files older than 7 days
const DRY_RUN = process.argv.includes('--dry-run');  // Use --dry-run to preview without deleting

console.log('='.repeat(60));
console.log('OpenAI Files Cleanup Script');
console.log('='.repeat(60));
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'DELETE'}`);
console.log(`Max age: ${MAX_AGE_DAYS} days`);
console.log('='.repeat(60));

async function listAllFiles() {
  console.log('\n📋 Fetching all files from OpenAI...');
  
  const files = await openai.files.list();
  console.log(`Found ${files.data.length} files total`);
  
  return files.data;
}

async function cleanupOldFiles() {
  try {
    const files = await listAllFiles();
    
    if (files.length === 0) {
      console.log('\n✅ No files to clean up');
      return;
    }
    
    // Calculate cutoff timestamp
    const cutoffTime = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    const cutoffDate = new Date(cutoffTime);
    
    console.log(`\n🗓️  Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Files created before this date will be ${DRY_RUN ? 'marked for' : ''} deleted\n`);
    
    // Categorize files
    const oldFiles = [];
    const recentFiles = [];
    
    for (const file of files) {
      const createdAt = file.created_at * 1000;  // Convert to milliseconds
      const fileDate = new Date(createdAt);
      const ageInDays = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));
      
      if (createdAt < cutoffTime) {
        oldFiles.push({ ...file, fileDate, ageInDays });
      } else {
        recentFiles.push({ ...file, fileDate, ageInDays });
      }
    }
    
    console.log(`📊 Summary:`);
    console.log(`   Old files (>${MAX_AGE_DAYS} days): ${oldFiles.length}`);
    console.log(`   Recent files (<=${MAX_AGE_DAYS} days): ${recentFiles.length}`);
    
    if (oldFiles.length === 0) {
      console.log('\n✅ No old files to delete');
      return;
    }
    
    // Display old files
    console.log(`\n🗑️  Old files to ${DRY_RUN ? 'be' : ''} delete:`);
    console.log('-'.repeat(60));
    
    for (const file of oldFiles) {
      console.log(`   ${file.id}`);
      console.log(`   ├─ Filename: ${file.filename}`);
      console.log(`   ├─ Created: ${file.fileDate.toISOString()}`);
      console.log(`   ├─ Age: ${file.ageInDays} days`);
      console.log(`   └─ Size: ${(file.bytes / 1024).toFixed(2)} KB`);
      console.log('');
    }
    
    // Delete files (if not dry run)
    if (!DRY_RUN) {
      console.log('🗑️  Deleting old files...\n');
      
      let deleted = 0;
      let failed = 0;
      
      for (const file of oldFiles) {
        try {
          await openai.files.del(file.id);
          console.log(`   ✅ Deleted: ${file.id} (${file.filename})`);
          deleted++;
        } catch (error) {
          console.error(`   ❌ Failed to delete ${file.id}: ${error.message}`);
          failed++;
        }
      }
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ Cleanup complete!`);
      console.log(`   Deleted: ${deleted} files`);
      console.log(`   Failed: ${failed} files`);
      console.log(`   Remaining: ${recentFiles.length} files`);
      console.log('='.repeat(60));
    } else {
      console.log('='.repeat(60));
      console.log('ℹ️  DRY RUN MODE - No files were deleted');
      console.log('   Run without --dry-run to actually delete files');
      console.log('='.repeat(60));
    }
    
    // Display recent files
    if (recentFiles.length > 0) {
      console.log(`\n📌 Recent files (kept):`);
      console.log('-'.repeat(60));
      
      for (const file of recentFiles.slice(0, 5)) {  // Show first 5
        console.log(`   ${file.id}`);
        console.log(`   ├─ Filename: ${file.filename}`);
        console.log(`   ├─ Created: ${file.fileDate.toISOString()}`);
        console.log(`   └─ Age: ${file.ageInDays} days`);
        console.log('');
      }
      
      if (recentFiles.length > 5) {
        console.log(`   ... and ${recentFiles.length - 5} more recent files`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run cleanup
cleanupOldFiles();

