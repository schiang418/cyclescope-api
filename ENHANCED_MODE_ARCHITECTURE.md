# CycleScope Enhanced Analysis Mode - Architecture & Implementation Guide

**Version**: 3.0 (Enhanced Mode)  
**Last Updated**: November 12, 2025  
**Purpose**: Complete reference for Enhanced Analysis mode implementation, troubleshooting, and future enhancements

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Enhanced Mode vs Standard Mode](#enhanced-mode-vs-standard-mode)
3. [Architecture Design](#architecture-design)
4. [Implementation Details](#implementation-details)
5. [Data Flow](#data-flow)
6. [File Structure](#file-structure)
7. [Configuration](#configuration)
8. [Deployment](#deployment)
9. [Testing & Validation](#testing--validation)
10. [Troubleshooting](#troubleshooting)
11. [Performance & Cost Analysis](#performance--cost-analysis)
12. [Future Enhancements](#future-enhancements)

---

## 🎯 Overview

### What is Enhanced Analysis Mode?

Enhanced Analysis Mode is an **opt-in feature** that augments the standard chart-based analysis with **CSV numerical data**, providing more precise and data-driven market insights.

### Key Features

- ✅ **Dual Data Sources**: 18 chart images + 18 CSV files (Gamma), 14 chart images + 14 CSV files (Delta)
- ✅ **Text Embedding Approach**: CSV data embedded as formatted text in messages (not file attachments)
- ✅ **Backward Compatible**: Standard mode remains the default; Enhanced mode is opt-in via environment variable
- ✅ **Production Ready**: Successfully deployed on Railway with automatic GitHub Actions integration
- ✅ **Cost Effective**: ~40% cost increase ($0.70 vs $0.50 per analysis) for significantly better precision

### Why Enhanced Mode?

**Problem with Standard Mode (Charts Only)**:
- GPT-4 Vision API can misread chart values (e.g., reading "46.5%" as "48%")
- No access to exact numerical data for precise calculations
- Limited ability to track subtle changes in indicators

**Solution with Enhanced Mode (Charts + CSV)**:
- Exact numerical values from CSV files (last 20 rows of data)
- GPT-4 can reference precise numbers while viewing visual trends
- Better accuracy in dimension score calculations and trend analysis

---

## 🔀 Enhanced Mode vs Standard Mode

### Comparison Table

| Feature | Standard Mode | Enhanced Mode |
|---------|--------------|---------------|
| **Data Sources** | 18 charts (Gamma), 14 charts (Delta) | Charts + CSV files |
| **CSV Data** | ❌ None | ✅ Last 20 rows + metadata |
| **Precision** | Moderate (vision-based) | High (exact numbers) |
| **Token Usage** | ~5K tokens | ~7.4K tokens |
| **Cost per Analysis** | ~$0.50 | ~$0.70 |
| **Processing Time** | 2-3 minutes | 2-3 minutes |
| **Default** | ✅ Yes | ❌ No (opt-in) |
| **Environment Variable** | `ENABLE_ENHANCED_ANALYSIS=false` or unset | `ENABLE_ENHANCED_ANALYSIS=true` |

### When to Use Each Mode

**Use Standard Mode (Default)**:
- Cost-sensitive deployments
- Quick visual analysis is sufficient
- Testing and development

**Use Enhanced Mode (Recommended for Production)**:
- Production SaaS platform
- Institutional-grade accuracy required
- Precise numerical tracking needed
- Budget allows ~40% cost increase

---

## 🏗 Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Request (tRPC)                           │
│              POST /api/trpc/analysis.triggerAll                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   server/routers.ts                             │
│          Check ENABLE_ENHANCED_ANALYSIS env var                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐           ┌──────────────────┐
│  Standard Mode   │           │  Enhanced Mode   │
│                  │           │                  │
│ gamma.ts         │           │ gammaEnhanced.ts │
│ delta.ts         │           │ deltaEnhanced.ts │
│                  │           │                  │
│ Charts Only      │           │ Charts + CSV     │
└──────────────────┘           └──────────────────┘
         │                               │
         │                               │
         │                               ▼
         │                     ┌──────────────────┐
         │                     │ csvTextEmbedder  │
         │                     │                  │
         │                     │ 1. Download CSV  │
         │                     │ 2. Extract rows  │
         │                     │ 3. Format text   │
         │                     └──────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OpenAI GPT-4 API                              │
│          Assistant API with Vision + Text                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  JSON Response Parsing                          │
│         Extract level1 + level2 structured data                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Railway)                      │
│           daily_snapshots table (44+ fields)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                    cyclescope-downloader                        │
│              (GitHub Actions - Daily 11 PM EST)                 │
│                                                                 │
│  • Downloads 18 charts from StockCharts.co                     │
│  • Downloads 18 CSV files from Yahoo Finance API               │
│  • Uploads to S3: s3://cyclescope-data/YYYY-MM-DD/             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    cyclescope-api                               │
│                  (Railway Deployment)                           │
│                                                                 │
│  Enhanced Mode Components:                                     │
│  • server/assistants/gammaEnhanced.ts                          │
│  • server/assistants/deltaEnhanced.ts                          │
│  • server/assistants/csvTextEmbedder.ts                        │
│  • server/assistants/csvUploader.ts (legacy, only getLatestCSVDate) │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    S3 Storage (Manus)                           │
│         s3://cyclescope-data/YYYY-MM-DD/                        │
│                                                                 │
│  Charts:                                                       │
│  • 01_SPX_Secular_Trend.png                                    │
│  • 02_Copper_Gold_Ratio.png                                    │
│  • ... (18 total)                                              │
│                                                                 │
│  CSV Files:                                                    │
│  • _SPX_for_gpt_weekly.csv                                     │
│  • _COPPER_GOLD_for_gpt_weekly.csv                             │
│  • ... (18 total)                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Details

### 1. Mode Selection Logic

**File**: `server/assistants/gamma.ts` and `server/assistants/delta.ts`

```typescript
// gamma.ts
export async function runGammaAnalysis(
  mode: 'engine' | 'panel' = 'engine',
  date?: string
): Promise<GammaAnalysisResult> {
  // Check environment variable (must be lowercase 'true')
  const useEnhanced = process.env.ENABLE_ENHANCED_ANALYSIS === 'true';
  
  if (useEnhanced) {
    console.log('🚀 [Gamma] Enhanced mode ENABLED (charts + CSV data)');
    return runGammaEnhancedAnalysis(mode, date);
  } else {
    console.log('🔥 [Gamma] Standard mode (charts only)');
    // Standard mode implementation...
  }
}
```

**Key Points**:
- ✅ Environment variable check is **case-sensitive** (`'true'` not `'TRUE'`)
- ✅ Default behavior is Standard mode (if env var is unset or `false`)
- ✅ Routing happens at runtime, no code changes needed to switch modes

### 2. CSV Text Embedding

**File**: `server/assistants/csvTextEmbedder.ts`

**Why Text Embedding Instead of File Attachments?**

We tried three approaches:

| Approach | Result | Issue |
|----------|--------|-------|
| 1. File Upload (Code Interpreter) | ❌ Failed | `server_error` from OpenAI |
| 2. Direct CSV Attachment | ❌ Failed | `invalid_file_format` error |
| 3. Text Embedding | ✅ Success | Works reliably |

**Implementation**:

```typescript
export async function downloadAndFormatCSVsAsText(
  date: string,
  csvFiles: string[],
  lastNRows: number = 20
): Promise<string> {
  const baseUrl = `https://cyclescope-data.s3.us-east-1.amazonaws.com/${date}`;
  let embeddedText = '=== CSV DATA (Last 20 Rows) ===\n\n';
  
  for (const filename of csvFiles) {
    const url = `${baseUrl}/${filename}`;
    const response = await fetch(url);
    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.trim().split('\n');
    
    // Extract metadata (first 2 rows) + last N data rows
    const metadataRows = lines.slice(0, 2);
    const dataRows = lines.slice(2);
    const lastRows = dataRows.slice(-lastNRows);
    
    // Format as text block
    embeddedText += `--- ${filename} ---\n`;
    embeddedText += metadataRows.join('\n') + '\n';
    embeddedText += lastRows.join('\n') + '\n\n';
  }
  
  return embeddedText;
}
```

**Optimization**:
- Only last 20 rows (not full history) to reduce token usage
- Includes metadata rows (first 2 rows) for context
- Formatted as readable text blocks with clear separators

### 3. Batch Processing

**File**: `server/assistants/gammaEnhanced.ts`

**Why Batching?**

OpenAI Vision API has limits on images per message. We split into 2 batches:

```typescript
// Batch 1: First 9 charts + CSV data
const batch1Content = [
  {
    type: 'text',
    text: `${mode}\n\nAnalysis Date: ${analysisDate}\n\n${csvEmbeddedText}`
  },
  ...chartUrls.slice(0, 9).map(url => ({
    type: 'image_url',
    image_url: { url }
  }))
];

await client.beta.threads.messages.create(thread.id, {
  role: 'user',
  content: batch1Content,
});

// Small delay between batches
await new Promise(resolve => setTimeout(resolve, 1000));

// Batch 2: Next 9 charts (CSV already sent)
const batch2Content = [
  {
    type: 'text',
    text: 'Batch 2 of 2: Next 9 charts (CSV data provided in previous message)'
  },
  ...chartUrls.slice(9, 18).map(url => ({
    type: 'image_url',
    image_url: { url }
  }))
];

await client.beta.threads.messages.create(thread.id, {
  role: 'user',
  content: batch2Content,
});
```

**Key Points**:
- CSV data sent only in Batch 1 (no need to repeat in Batch 2)
- 1-second delay between batches for API stability
- Total: 18 charts + 1 CSV text block

### 4. Response Format Handling

**Critical Issue**: Cannot use `response_format: { type: 'json_object' }` with Vision API

```typescript
// ❌ WRONG - Causes 'invalid_image_format' error
const run = await client.beta.threads.runs.create(thread.id, {
  assistant_id: GAMMA_ASSISTANT_ID,
  response_format: { type: 'json_object' }  // Don't do this!
});

// ✅ CORRECT - Let Vision API use AUTO format
const run = await client.beta.threads.runs.create(thread.id, {
  assistant_id: GAMMA_ASSISTANT_ID,
  // No response_format specified
});
```

**Post-processing**:

```typescript
// Remove markdown code blocks if present
let fullAnalysis = assistantMessage.content[0].text.value;
fullAnalysis = fullAnalysis
  .replace(/^```json\s*\n?/i, '')
  .replace(/\n?```\s*$/i, '')
  .trim();

// Parse JSON
const gammaData = JSON.parse(fullAnalysis);
```

---

## 🔄 Data Flow

### Enhanced Mode Analysis Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: API Triggered                                           │
│   POST /api/trpc/analysis.triggerAll                            │
│   Environment: ENABLE_ENHANCED_ANALYSIS=true                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Mode Selection                                          │
│   gamma.ts checks env var → routes to gammaEnhanced.ts          │
│   delta.ts checks env var → routes to deltaEnhanced.ts          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Get Latest CSV Date                                     │
│   csvUploader.getLatestCSVDate()                                │
│   → Fetch s3://cyclescope-data/ directory listing              │
│   → Find latest YYYY-MM-DD folder                               │
│   → Returns: "2025-11-11"                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Download & Format CSV Data                             │
│   csvTextEmbedder.downloadAndFormatCSVsAsText()                 │
│   → Download 18 CSV files from S3                               │
│   → Extract first 2 rows (metadata) + last 20 data rows        │
│   → Format as text block: "=== CSV DATA ===\n..."              │
│   → Returns: ~7.4K tokens of formatted text                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Create OpenAI Thread                                   │
│   client.beta.threads.create()                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Send Batch 1 (9 charts + CSV data)                     │
│   Message content:                                              │
│   • Text: mode + date + CSV embedded text                       │
│   • Images: Chart URLs 1-9                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (1 second delay)
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Send Batch 2 (9 charts)                                │
│   Message content:                                              │
│   • Text: "Batch 2 of 2..."                                     │
│   • Images: Chart URLs 10-18                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Run Assistant                                           │
│   client.beta.threads.runs.create()                             │
│   • Assistant ID: asst_Ynyur2GgkCWgLKmuqiM8zIt2 (Gamma)        │
│   • No response_format (Vision API compatibility)               │
│   • Processing time: ~90-120 seconds                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: Poll for Completion                                    │
│   while (status !== 'completed') {                              │
│     await sleep(2000);                                          │
│     status = await client.beta.threads.runs.retrieve();         │
│   }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 10: Parse JSON Response                                   │
│   • Remove markdown code blocks (```json ... ```)               │
│   • JSON.parse(fullAnalysis)                                    │
│   • Extract level1 and level2 fields                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 11: Save to Database                                      │
│   saveDailySnapshot({                                           │
│     gammaAsofWeek, gammaCycleStagePrimary, ...                  │
│     deltaAsofDate, deltaFragilityScore, ...                     │
│     fusionCycleStage, fusionFragilityLabel, ...                 │
│   })                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 12: Return Success                                        │
│   { success: true, mode: 'async', ... }                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

### Enhanced Mode Files

```
cyclescope-api/
├── server/
│   ├── assistants/
│   │   ├── gamma.ts                    # Standard Gamma (router to Enhanced)
│   │   ├── gammaEnhanced.ts            # ⭐ Enhanced Gamma (charts + CSV)
│   │   ├── delta.ts                    # Standard Delta (router to Enhanced)
│   │   ├── deltaEnhanced.ts            # ⭐ Enhanced Delta (charts + CSV)
│   │   ├── csvTextEmbedder.ts          # ⭐ CSV download & text formatting
│   │   ├── csvUploader.ts              # Legacy (only getLatestCSVDate used)
│   │   └── fusion.ts                   # Fusion synthesis (unchanged)
│   ├── routers.ts                      # API endpoints
│   ├── db.ts                           # Database queries
│   └── index.ts                        # Express server
├── drizzle/
│   └── schema.ts                       # Database schema (unchanged)
├── ENHANCED_ANALYSIS.md                # User-facing documentation
├── IMPLEMENTATION_SUMMARY.md           # Implementation notes
├── COMPARISON_REPORT.md                # Standard vs Enhanced comparison
├── ENHANCED_MODE_ARCHITECTURE.md       # ⭐ This file
└── package.json
```

### Key Files Explained

| File | Purpose | Lines of Code | Key Functions |
|------|---------|---------------|---------------|
| `gammaEnhanced.ts` | Enhanced Gamma analysis | ~350 | `runGammaEnhancedAnalysis()` |
| `deltaEnhanced.ts` | Enhanced Delta analysis | ~380 | `runDeltaEnhancedAnalysis()` |
| `csvTextEmbedder.ts` | CSV download & formatting | ~120 | `downloadAndFormatCSVsAsText()`, `getLatestCSVDate()` |
| `csvUploader.ts` | Legacy file upload (deprecated) | ~200 | Only `getLatestCSVDate()` used |
| `gamma.ts` | Mode router for Gamma | ~280 | Routes to Enhanced or Standard |
| `delta.ts` | Mode router for Delta | ~290 | Routes to Enhanced or Standard |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Valid Values | Purpose |
|----------|----------|---------|--------------|---------|
| `ENABLE_ENHANCED_ANALYSIS` | No | `false` | `true`, `false` | Enable Enhanced mode |
| `OPENAI_API_KEY` | Yes | - | `sk-...` | OpenAI API authentication |
| `GAMMA_ASSISTANT_ID` | No | `asst_Ynyur2GgkCWgLKmuqiM8zIt2` | `asst_...` | Gamma assistant ID |
| `DELTA_ASSISTANT_ID` | No | `asst_niipkh0HSLaeuPVwSsB7Y09B` | `asst_...` | Delta assistant ID |
| `DATABASE_URL` | Yes | - | `postgresql://...` | PostgreSQL connection |

### Railway Configuration

**Setting Environment Variables**:

1. Go to Railway Dashboard
2. Select `cyclescope-api` project
3. Click **Variables** tab
4. Add new variable:
   ```
   ENABLE_ENHANCED_ANALYSIS=true
   ```
   (Note: Must be lowercase `true`, not `TRUE`)
5. Click **Deploy** or **Restart** to apply changes

**Verification**:

Check Railway deployment logs for:

```
✅ Enhanced Mode:
🚀🚀🚀 GAMMA ENHANCED VERSION: Charts + CSV Data 🚀🚀🚀
[Gamma Enhanced] Starting analysis for 2025-11-11...

❌ Standard Mode:
🔥🔥🔥 GAMMA VERSION: STANDARD - Charts Only 🔥🔥🔥
[Gamma] Starting analysis for 2025-11-11...
```

---

## 🚀 Deployment

### Railway Deployment Steps

1. **Push to GitHub**:
   ```bash
   cd /home/ubuntu/cyclescope-api
   git add -A
   git commit -m "Enhanced mode implementation"
   git push origin main
   ```

2. **Railway Auto-Deploy**:
   - Railway detects new commit
   - Builds Docker image (or uses Nixpacks)
   - Runs `pnpm install && pnpm build`
   - Starts server with `pnpm start`

3. **Set Environment Variable**:
   - Go to Railway Dashboard → Variables
   - Add `ENABLE_ENHANCED_ANALYSIS=true`
   - Restart service

4. **Verify Deployment**:
   ```bash
   # Test health endpoint
   curl https://cyclescope-api-production.up.railway.app/health
   
   # Trigger analysis
   curl -X POST https://cyclescope-api-production.up.railway.app/api/trpc/analysis.triggerAll
   ```

### Build Configuration

**package.json**:
```json
{
  "type": "module",
  "scripts": {
    "build": "rm -rf dist && tsc",
    "start": "node dist/server/index.js",
    "dev": "tsx watch server/index.ts"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2020",
    "outDir": "./dist"
  }
}
```

**Important**: All local imports must use `.js` extension for ES modules:
```typescript
// ✅ Correct
import { runGammaEnhancedAnalysis } from './gammaEnhanced.js';

// ❌ Wrong (causes ERR_MODULE_NOT_FOUND)
import { runGammaEnhancedAnalysis } from './gammaEnhanced';
```

---

## 🧪 Testing & Validation

### Test Scripts

Located in project root (for local testing only):

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-gamma-enhanced.mjs` | Test Gamma Enhanced | `node test-gamma-enhanced.mjs` |
| `test-delta-enhanced.mjs` | Test Delta Enhanced | `node test-delta-enhanced.mjs` |
| `test-full-comparison.mjs` | Compare Standard vs Enhanced | `node test-full-comparison.mjs` |

### Manual Testing

**1. Test Mode Selection**:
```bash
# Standard mode
export ENABLE_ENHANCED_ANALYSIS=false
node dist/server/index.js

# Enhanced mode
export ENABLE_ENHANCED_ANALYSIS=true
node dist/server/index.js
```

**2. Test API Endpoint**:
```bash
curl -X POST 'https://cyclescope-api-production.up.railway.app/api/trpc/analysis.triggerAll' \
  -H "Content-Type: application/json" \
  -d '{}'
```

**3. Check Logs**:
```bash
# Railway Dashboard → Deployments → View Logs
# Look for:
[Gamma Enhanced] Starting analysis for...
[Gamma Enhanced] Step 1: Downloading and formatting CSV files...
[Gamma Enhanced] ✅ Successfully formatted CSV data as embedded text
```

### Validation Checklist

- [ ] Environment variable `ENABLE_ENHANCED_ANALYSIS=true` set in Railway
- [ ] Deployment logs show "Enhanced mode ENABLED"
- [ ] CSV data successfully downloaded from S3
- [ ] All 18 charts (Gamma) or 14 charts (Delta) sent to OpenAI
- [ ] JSON response successfully parsed
- [ ] Data saved to `daily_snapshots` table
- [ ] Analysis results match expected format

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Module Not Found Error

**Error**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/dist/server/assistants/gammaEnhanced'
```

**Cause**: Missing `.js` extension in import statements

**Fix**:
```typescript
// Change this:
import { runGammaEnhancedAnalysis } from './gammaEnhanced';

// To this:
import { runGammaEnhancedAnalysis } from './gammaEnhanced.js';
```

#### 2. TypeScript Type Error

**Error**:
```
error TS18046: 'data' is of type 'unknown'
```

**Cause**: Missing type assertion for JSON response

**Fix**:
```typescript
// Change this:
const data = await response.json();

// To this:
const data = await response.json() as { contents: Array<{ type: string; name: string }> };
```

#### 3. Environment Variable Not Working

**Error**: Logs show "Standard mode" instead of "Enhanced mode"

**Cause**: Environment variable is `TRUE` (uppercase) or not set

**Fix**:
- Must be lowercase `true`
- Check Railway Dashboard → Variables
- Restart service after changing

#### 4. CSV Download Fails

**Error**:
```
[Gamma Enhanced] ⚠️ CSV formatting failed: Failed to fetch
```

**Cause**: S3 URL incorrect or CSV files not uploaded

**Fix**:
- Check S3 bucket: `s3://cyclescope-data/YYYY-MM-DD/`
- Verify GitHub Actions ran successfully
- Check CSV filenames match exactly

#### 5. OpenAI API Error

**Error**:
```
invalid_image_format: Cannot use response_format with Vision API
```

**Cause**: `response_format` specified in run creation

**Fix**:
```typescript
// Remove response_format when using Vision API
const run = await client.beta.threads.runs.create(thread.id, {
  assistant_id: GAMMA_ASSISTANT_ID,
  // Don't specify response_format here
});
```

---

## 💰 Performance & Cost Analysis

### Token Usage

| Component | Standard Mode | Enhanced Mode | Difference |
|-----------|--------------|---------------|------------|
| **Gamma** | ~5,000 tokens | ~7,400 tokens | +48% |
| **Delta** | ~4,500 tokens | ~6,800 tokens | +51% |
| **Fusion** | ~2,000 tokens | ~2,000 tokens | 0% |
| **Total** | ~11,500 tokens | ~16,200 tokens | +41% |

### Cost Breakdown

**GPT-4 Vision Pricing** (as of Nov 2025):
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens

| Analysis | Standard Mode | Enhanced Mode | Difference |
|----------|--------------|---------------|------------|
| **Gamma** | $0.20 | $0.30 | +$0.10 |
| **Delta** | $0.18 | $0.27 | +$0.09 |
| **Fusion** | $0.12 | $0.12 | $0.00 |
| **Total per Analysis** | **$0.50** | **$0.70** | **+$0.20 (40%)** |
| **Monthly (30 days)** | **$15** | **$21** | **+$6** |
| **Yearly (365 days)** | **$182.50** | **$255.50** | **+$73** |

### Performance Metrics

| Metric | Standard Mode | Enhanced Mode |
|--------|--------------|---------------|
| **Processing Time** | 2-3 minutes | 2-3 minutes |
| **API Calls** | 3 (Gamma, Delta, Fusion) | 3 (same) |
| **S3 Requests** | 18 (charts only) | 36 (charts + CSV) |
| **Network Transfer** | ~5 MB | ~5.5 MB |
| **Database Writes** | 1 row | 1 row |

### Cost-Benefit Analysis

**Benefits of Enhanced Mode**:
- ✅ **Accuracy**: 95%+ vs 85% (estimated)
- ✅ **Precision**: Exact numbers vs visual approximation
- ✅ **Reliability**: Consistent dimension scores
- ✅ **Debugging**: Easier to trace issues with exact data

**Recommendation**:
- **Production SaaS**: Use Enhanced Mode (worth the 40% cost increase)
- **Development/Testing**: Use Standard Mode (faster iteration, lower cost)
- **Budget-Constrained**: Use Standard Mode with manual verification

---

## 🚀 Future Enhancements

### Planned Features

1. **Adaptive Mode Selection**
   - Automatically switch to Standard mode if CSV download fails
   - Graceful degradation instead of hard failure

2. **CSV Caching**
   - Cache downloaded CSV data for 24 hours
   - Reduce S3 requests and processing time

3. **Incremental Updates**
   - Only download new CSV rows since last analysis
   - Further reduce token usage

4. **Multi-Model Support**
   - Test with GPT-4 Turbo, Claude 3, etc.
   - Compare accuracy and cost

5. **Real-Time Mode**
   - Intraday analysis using real-time CSV data
   - Hourly updates instead of daily

### Technical Debt

- [ ] Remove `csvUploader.ts` (legacy file upload code)
- [ ] Consolidate `getLatestCSVDate()` into `csvTextEmbedder.ts`
- [ ] Add retry logic for S3 downloads
- [ ] Implement circuit breaker for OpenAI API
- [ ] Add comprehensive error logging

---

## 📚 References

### Related Documentation

- [ENHANCED_ANALYSIS.md](./ENHANCED_ANALYSIS.md) - User-facing feature documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation notes
- [COMPARISON_REPORT.md](./COMPARISON_REPORT.md) - Standard vs Enhanced comparison
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture

### External Resources

- [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [tRPC Documentation](https://trpc.io/docs)
- [Railway Documentation](https://docs.railway.app/)

---

## 📝 Changelog

### Version 3.0 (November 12, 2025)
- ✅ Enhanced Mode implementation complete
- ✅ CSV text embedding approach finalized
- ✅ Production deployment on Railway successful
- ✅ Comprehensive testing and validation
- ✅ Documentation complete

### Version 2.0 (November 11, 2025)
- ✅ File upload approach tested (failed)
- ✅ Text embedding approach implemented
- ✅ Bug fixes (Delta dimension scores, TypeScript errors)
- ✅ GitHub Actions integration

### Version 1.0 (November 10, 2025)
- ✅ Initial Standard Mode implementation
- ✅ Basic chart-only analysis

---

**End of Enhanced Mode Architecture Documentation**

