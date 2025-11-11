/**
 * CSV Text Embedder
 * 
 * Downloads CSV files and formats them as embedded text (not file attachments)
 * to avoid OpenAI Assistants API issues with multiple CSV attachments + Code Interpreter
 */

const DOWNLOADER_BASE_URL = 'https://cyclescope-downloader-production.up.railway.app/download';

/**
 * Trim CSV to first 2 rows (headers) + last N data rows
 */
function trimCSVToText(csvContent: string, lastNRows: number = 20): string {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length <= lastNRows + 2) {
    // If CSV has fewer than lastNRows+2 lines, return as-is
    return csvContent;
  }
  
  // Keep first 2 rows (metadata + column headers) + last N data rows
  const metadataRow = lines[0];
  const headerRow = lines[1];
  const lastNDataRows = lines.slice(-lastNRows);
  
  return [metadataRow, headerRow, ...lastNDataRows].join('\n');
}

/**
 * Download and format all CSV files as embedded text
 */
export async function downloadAndFormatCSVsAsText(
  date: string,
  csvFilenames: string[],
  lastNRows: number = 20
): Promise<string> {
  console.log(`[CSV Text Embedder] Downloading ${csvFilenames.length} CSV files for ${date}...`);
  
  const csvTextBlocks: string[] = [];
  
  for (const filename of csvFilenames) {
    try {
      // 1. Download CSV from cyclescope-downloader
      const csvUrl = `${DOWNLOADER_BASE_URL}/${date}/${filename}`;
      console.log(`[CSV Text Embedder] Fetching ${filename}...`);
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        console.error(`[CSV Text Embedder] Failed to download ${filename}: ${response.status}`);
        continue;
      }
      
      const csvContent = await response.text();
      const originalLines = csvContent.split('\n').filter(line => line.trim() !== '').length;
      console.log(`[CSV Text Embedder] Downloaded ${filename} (${originalLines} lines)`);
      
      // 2. Trim to first 2 rows + last N rows
      const trimmedCSV = trimCSVToText(csvContent, lastNRows);
      const trimmedLines = trimmedCSV.split('\n').filter(line => line.trim() !== '').length;
      console.log(`[CSV Text Embedder] Trimmed ${filename} from ${originalLines} to ${trimmedLines} lines`);
      
      // 3. Format as text block
      csvTextBlocks.push(`### ${filename}\n\`\`\`csv\n${trimmedCSV}\n\`\`\``);
      
    } catch (error) {
      console.error(`[CSV Text Embedder] Error processing ${filename}:`, error);
    }
  }
  
  console.log(`[CSV Text Embedder] ✅ Successfully formatted ${csvTextBlocks.length}/${csvFilenames.length} CSV files as text`);
  
  // 4. Combine all CSV blocks into one text section
  const combinedText = [
    '## CSV Data Files (Latest Values)',
    '',
    'Below are the CSV data files with headers and the last 20 rows of data for each indicator.',
    'Use these numerical values as the authoritative source for exact readings.',
    '',
    ...csvTextBlocks
  ].join('\n');
  
  return combinedText;
}

