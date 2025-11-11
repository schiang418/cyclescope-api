// server/assistants/csvUploader.ts
// CSV Upload Utility for Enhanced Analysis

import OpenAI from 'openai';

// Lazy initialization to ensure env vars are loaded
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',  // Explicitly use OpenAI official API
    });
  }
  return openai;
}

// cyclescope-downloader base URL
const DOWNLOADER_BASE_URL = 'https://cyclescope-downloader-production.up.railway.app';

/**
 * Get the latest date from cyclescope-downloader
 * @returns Latest date string (YYYY-MM-DD)
 */
export async function getLatestCSVDate(): Promise<string> {
  console.log('[CSV] Fetching latest date from downloader...');
  
  try {
    const response = await fetch(`${DOWNLOADER_BASE_URL}/debug/files`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file list: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Find all date directories (YYYY-MM-DD format)
    const dateDirs = data.contents
      .filter((item: any) => 
        item.type === 'directory' && 
        /^\d{4}-\d{2}-\d{2}$/.test(item.name)
      )
      .map((item: any) => item.name)
      .sort()
      .reverse();
    
    if (dateDirs.length === 0) {
      throw new Error('No date directories found in downloader');
    }
    
    const latestDate = dateDirs[0];
    console.log(`[CSV] Latest date: ${latestDate}`);
    
    return latestDate;
  } catch (error) {
    console.error('[CSV] Failed to get latest date:', error);
    throw error;
  }
}

/**
 * Trim CSV to keep first 2 rows (metadata + headers) + last N data rows
 * This reduces data volume while preserving the most recent data
 * @param csvContent - Full CSV content as string
 * @param n - Number of recent data rows to keep (default: 100)
 * @returns Trimmed CSV content
 */
function trimCSVToLastNRows(csvContent: string, n: number = 100): string {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length <= n + 2) {
    // If CSV has fewer than n+2 lines (2 header rows + n data rows), return as-is
    console.log(`[CSV Trim] CSV has ${lines.length} lines, no trimming needed`);
    return csvContent;
  }
  
  // Keep first 2 rows (metadata + column headers) + last n data rows
  const metadataRow = lines[0];      // Row 1: e.g., "$CPCE,Daily"
  const headerRow = lines[1];        // Row 2: e.g., "Date,Open,High,Low,Close,Volume"
  const lastNDataRows = lines.slice(-n);  // Last n data rows (most recent)
  
  const trimmedLines = [metadataRow, headerRow, ...lastNDataRows];
  console.log(`[CSV Trim] Trimmed from ${lines.length} to ${trimmedLines.length} lines (kept last ${n} data rows)`);
  
  return trimmedLines.join('\n');
}

/**
 * Upload a single CSV file to OpenAI Files API
 * @param csvUrl - Full URL to CSV file
 * @param filename - CSV filename
 * @returns OpenAI file_id
 */
export async function uploadCSVToOpenAI(
  csvUrl: string,
  filename: string
): Promise<string> {
  console.log(`[CSV Upload] Fetching ${filename} from ${csvUrl}`);
  
  try {
    // 1. Download CSV from cyclescope-downloader
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    const originalSizeKB = (csvContent.length / 1024).toFixed(2);
    console.log(`[CSV Upload] Downloaded ${filename} (${originalSizeKB} KB)`);
    
    // 2. Trim CSV to last 5 rows to reduce data volume (extreme test)
    const trimmedCSV = trimCSVToLastNRows(csvContent, 5);
    const trimmedSizeKB = (trimmedCSV.length / 1024).toFixed(2);
    console.log(`[CSV Upload] Trimmed ${filename} from ${originalSizeKB} KB to ${trimmedSizeKB} KB`);
    
    // 3. Upload to OpenAI Files API
    const client = getOpenAI();
    const file = await client.files.create({
      file: new File([trimmedCSV], filename, { type: 'text/csv' }),
      purpose: 'assistants'
    });
    
    console.log(`[CSV Upload] ✅ Uploaded ${filename}, file_id: ${file.id}`);
    return file.id;
  } catch (error) {
    console.error(`[CSV Upload] ❌ Failed to upload ${filename}:`, error);
    throw error;
  }
}

/**
 * Upload multiple CSV files in sequence
 * @param date - Date string (YYYY-MM-DD)
 * @param csvFilenames - Array of CSV filenames
 * @returns Array of OpenAI file_ids
 */
export async function uploadAllCSVs(
  date: string,
  csvFilenames: string[]
): Promise<string[]> {
  const baseUrl = `${DOWNLOADER_BASE_URL}/download/${date}/`;
  const fileIds: string[] = [];
  
  console.log(`[CSV Upload] Starting batch upload: ${csvFilenames.length} files from ${date}`);
  
  for (let i = 0; i < csvFilenames.length; i++) {
    const filename = csvFilenames[i];
    const csvUrl = `${baseUrl}${filename}`;
    
    try {
      const fileId = await uploadCSVToOpenAI(csvUrl, filename);
      fileIds.push(fileId);
      console.log(`[CSV Upload] Progress: ${i + 1}/${csvFilenames.length} files uploaded`);
    } catch (error) {
      console.error(`[CSV Upload] Failed to upload ${filename}, continuing with others...`);
      // Continue with other files instead of failing completely
    }
  }
  
  console.log(`[CSV Upload] ✅ Batch upload complete: ${fileIds.length}/${csvFilenames.length} files successful`);
  
  if (fileIds.length === 0) {
    throw new Error('Failed to upload any CSV files');
  }
  
  return fileIds;
}

/**
 * Upload multiple CSV files in parallel (faster but may hit rate limits)
 * @param date - Date string (YYYY-MM-DD)
 * @param csvFilenames - Array of CSV filenames
 * @returns Array of OpenAI file_ids
 */
export async function uploadAllCSVsParallel(
  date: string,
  csvFilenames: string[]
): Promise<string[]> {
  const baseUrl = `${DOWNLOADER_BASE_URL}/download/${date}/`;
  
  console.log(`[CSV Upload] Starting parallel upload: ${csvFilenames.length} files from ${date}`);
  
  const uploadPromises = csvFilenames.map(async (filename) => {
    const csvUrl = `${baseUrl}${filename}`;
    try {
      return await uploadCSVToOpenAI(csvUrl, filename);
    } catch (error) {
      console.error(`[CSV Upload] Failed to upload ${filename}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(uploadPromises);
  const fileIds = results.filter((id): id is string => id !== null);
  
  console.log(`[CSV Upload] ✅ Parallel upload complete: ${fileIds.length}/${csvFilenames.length} files successful`);
  
  if (fileIds.length === 0) {
    throw new Error('Failed to upload any CSV files');
  }
  
  return fileIds;
}

