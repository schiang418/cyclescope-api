# CycleScope - System Architecture & Design Overview (ENHANCED)

**Version**: 2.0 (Enhanced)  
**Last Updated**: November 11, 2025  
**Purpose**: Complete reference for AI agents and developers to understand the entire system, troubleshoot issues, and add features

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Details](#component-details)
4. [Database Design](#database-design)
5. [Data Flow](#data-flow)
6. [API Design](#api-design)
7. [Frontend Architecture](#frontend-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [**GitHub Actions Automation** ⭐ NEW](#github-actions-automation)
10. [Key Design Decisions](#key-design-decisions)
11. [File Structure](#file-structure)
12. [Configuration & Secrets](#configuration--secrets)
13. [Monitoring & Maintenance](#monitoring--maintenance)
14. [**Troubleshooting Guide** ⭐ NEW](#troubleshooting-guide)
15. [**Common Issues & Solutions** ⭐ NEW](#common-issues--solutions)

---

## 🎯 System Overview

### What is CycleScope?

CycleScope is a market cycle analysis SaaS platform that provides institutional-grade market intelligence through three analytical lenses:

1. **Gamma** - Macro cycle positioning across 6 market domains
2. **Delta** - Real-time market fragility classification  
3. **Fusion** - Synthesized market view with actionable guidance

### Core Value Proposition

- Daily automated analysis using OpenAI GPT-4
- Historical trend tracking (30/60/90 day views)
- Multi-layer insights (Layer 1: Quick view, Layer 2: Deep analysis)
- Professional UI with responsive design

### Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) | Static website with dynamic data loading |
| Backend | Node.js, TypeScript, tRPC | Type-safe API server |
| Database | PostgreSQL (Railway) | Daily snapshot storage |
| AI Engine | OpenAI GPT-4 | Market analysis generation |
| Deployment | Railway | Cloud hosting for both frontend and backend |
| Automation | GitHub Actions | Daily data updates and chart backups |

---

## 🏗 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          End Users                              │
│                   (Investors, Analysts)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    cyclescope-portal                            │
│                  (Static HTML Frontend)                         │
│  Repository: github.com/schiang418/cyclescope-portal            │
│  URL: https://cyclescope-portal-production.up.railway.app       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • index.html - Dashboard (Fusion/Gamma/Delta)            │  │
│  │ • trends.html - Trend Analysis Charts                    │  │
│  │ • js/update-portal.js - Dynamic data loading             │  │
│  │ • js/api-client.js - API communication                   │  │
│  │ • css/style.css - Styling & theming                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         │ GET /api/trpc/analysis.latest
                         │ GET /api/trpc/analysis.history
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     cyclescope-api                              │
│                 (Node.js tRPC Server)                           │
│  Repository: github.com/schiang418/cyclescope-api               │
│  URL: https://cyclescope-api-production.up.railway.app          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ server/routers.ts - API endpoints                        │  │
│  │ server/db.ts - Database queries                          │  │
│  │ server/assistants/gamma.ts - Gamma analysis              │  │
│  │ server/assistants/delta.ts - Delta analysis              │  │
│  │ server/assistants/fusion.ts - Fusion analysis            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ SQL Queries
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                            │
│                    (Railway Managed)                            │
│  Connection: postgresql://postgres:QTUFBpWfMQNRocCgDLNsbOTQdSA  │
│             kYbvc@maglev.proxy.rlwy.net:39797/railway           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Table: daily_snapshots                                   │  │
│  │ • Stores all Gamma/Delta/Fusion analysis results         │  │
│  │ • One row per day                                        │  │
│  │ • JSONB columns for complex data structures              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Cron Job (Daily 11:00 PM EST)
                         │ + GitHub Actions (Daily 9:30 PM ET)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OpenAI GPT-4                               │
│                  (External AI Service)                          │
│  • Analyzes market data                                         │
│  • Generates Gamma/Delta/Fusion insights                        │
│  • Returns structured JSON responses                            │
└─────────────────────────────────────────────────────────────────┘
                         ▲
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                 cyclescope-automation                           │
│                   (GitHub Actions)                              │
│  Repository: github.com/schiang418/cyclescope-automation        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Triggers Dashboard/Delta/Portal analysis daily         │  │
│  │ • Downloads and backs up generated charts                │  │
│  │ • Creates historical artifacts (30-day retention)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Component Details

### 1. cyclescope-portal (Frontend)

**Type**: Static HTML website with JavaScript  
**Repository**: https://github.com/schiang418/cyclescope-portal  
**Deployment**: Railway (https://cyclescope-portal-production.up.railway.app)  
**Port**: 3000 (auto-injected by Railway)

#### Key Files

```
cyclescope-portal/
├── index.html              # Main dashboard page
├── trends.html             # Trend analysis page
├── css/
│   └── style.css          # Global styles, dark theme, responsive design
├── js/
│   ├── api-client.js      # API communication layer
│   └── update-portal.js   # DOM manipulation & data rendering
├── server.js              # Express.js static file server
├── package.json           # Dependencies (express, cors)
└── railway.json           # Railway deployment config
```

#### Responsibilities

1. **Display Market Analysis**
   - Fusion: Market synthesis with cycle stage, fragility, guidance
   - Gamma: 6-domain macro view with Layer 1 & 2 details
   - Delta: Fragility tracking with Layer 1 & 2 breakdowns

2. **Trend Visualization**
   - Gamma 6 Domain Trends (30/60/90 days)
   - Fragility Trend Chart (30/60/90 days)
   - Interactive time range selection

3. **User Interface**
   - Responsive card-based layout
   - Dark theme with gradient backgrounds
   - Layer toggle buttons (Layer 1 ↔ Layer 2)
   - Loading states and error handling

#### Data Loading Flow

```javascript
// 1. Fetch latest analysis
const data = await fetchLatestAnalysis();

// 2. Update each section
updateFusionSection(data.fusion);
updateGammaSection(data.gamma);
updateDeltaSection(data.delta);

// 3. Handle layer switching
document.getElementById('gammaLayer1Btn').addEventListener('click', () => {
  showLayer('gamma', 1);
});
```

---

### 2. cyclescope-api (Backend)

**Type**: Node.js TypeScript server with tRPC  
**Repository**: https://github.com/schiang418/cyclescope-api  
**Deployment**: Railway (https://cyclescope-api-production.up.railway.app)  
**Port**: 3001 (auto-injected by Railway)

#### Key Files

```
cyclescope-api/
├── server/
│   ├── index.ts           # Express + tRPC server setup
│   ├── routers.ts         # API endpoint definitions
│   ├── db.ts              # Database query functions
│   └── assistants/
│       ├── gamma.ts       # Gamma analysis logic
│       ├── delta.ts       # Delta analysis logic
│       └── fusion.ts      # Fusion analysis logic
├── drizzle/
│   ├── schema.ts          # Database schema definition
│   └── migrations/        # SQL migration files
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript configuration
├── drizzle.config.ts      # Drizzle ORM config
└── railway.json           # Railway deployment config
```

#### Responsibilities

1. **API Endpoints**
   - `analysis.latest` - Return latest market analysis
   - `analysis.history` - Return historical data (30/60/90 days)
   - `dashboard.triggerAll` - Trigger Dashboard analysis generation
   - `delta.triggerAll` - Trigger Delta analysis generation
   - `analysis.triggerAll` - Trigger Portal data processing

2. **Data Processing**
   - Query PostgreSQL database
   - Transform data for frontend consumption
   - Handle JSONB field parsing

3. **AI Analysis Generation (Cron Job)**
   - Call OpenAI GPT-4 API
   - Parse structured JSON responses
   - Store results in database

#### API Endpoint Implementation

```typescript
// server/routers.ts
export const appRouter = router({
  analysis: router({
    // Get latest analysis
    latest: publicProcedure.query(async () => {
      const snapshot = await getLatestSnapshot();
      return transformSnapshot(snapshot);
    }),

    // Get historical data
    history: publicProcedure
      .input(z.object({ days: z.number().min(1).max(365) }))
      .query(async ({ input }) => {
        const snapshots = await getSnapshotHistory(input.days);
        return snapshots.map(transformSnapshot);
      }),

    // Trigger Portal processing (async)
    triggerAll: publicProcedure.mutation(async () => {
      // Fire-and-forget async processing
      processAnalysis().catch(console.error);
      return {
        success: true,
        message: "Analysis started in background",
        mode: "async"
      };
    }),
  }),

  dashboard: router({
    // Trigger Dashboard analysis
    triggerAll: publicProcedure.mutation(async () => {
      // Async processing to avoid Railway 5-min timeout
      generateDashboardAnalysis().catch(console.error);
      return { success: true };
    }),
  }),

  delta: router({
    // Trigger Delta analysis
    triggerAll: publicProcedure.mutation(async () => {
      generateDeltaAnalysis().catch(console.error);
      return { success: true };
    }),
  }),
});
```

---

### 3. PostgreSQL Database

**Type**: Managed PostgreSQL on Railway  
**Connection String**: `postgresql://postgres:QTUFBpWfMQNRocCgDLNsbOTQdSAkYbvc@maglev.proxy.rlwy.net:39797/railway`  
**Environment Variable**: `DATABASE_URL`  
**ORM**: Drizzle ORM  
**Migration Tool**: `pnpm drizzle-kit`

#### Schema Design

**Table: `daily_snapshots`**

```sql
CREATE TABLE daily_snapshots (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL UNIQUE,
  
  -- Fusion fields (10 columns)
  fusion_asof_date TEXT,
  fusion_cycle_stage TEXT,
  fusion_fragility_color TEXT,
  fusion_fragility_label TEXT,
  fusion_guidance_label TEXT,
  fusion_headline_summary TEXT,
  fusion_cycle_tone TEXT,
  fusion_narrative_summary TEXT,
  fusion_guidance_bullets JSONB,
  fusion_watch_commentary TEXT,
  
  -- Gamma fields (10 columns)
  gamma_asof_week TEXT,
  gamma_cycle_stage_primary TEXT,
  gamma_cycle_stage_transition TEXT,
  gamma_macro_posture_label TEXT,
  gamma_headline_summary TEXT,
  gamma_domains JSONB,              -- Array of 6 domains
  gamma_phase_confidence TEXT,
  gamma_cycle_tone TEXT,
  gamma_overall_summary TEXT,
  gamma_domain_details JSONB,       -- Object with domain keys
  
  -- Delta fields (22 columns)
  delta_asof_date TEXT,
  delta_fragility_color TEXT,
  delta_fragility_label TEXT,
  delta_fragility_score INTEGER,
  delta_template_code TEXT,
  delta_template_name TEXT,
  delta_pattern_plain TEXT,
  delta_posture_code TEXT,
  delta_posture_label TEXT,
  delta_headline_summary TEXT,
  delta_key_drivers JSONB,
  delta_next_watch_display JSONB,
  delta_phase_used TEXT,
  delta_phase_confidence TEXT,
  delta_breadth INTEGER,
  delta_liquidity INTEGER,
  delta_volatility INTEGER,
  delta_leadership INTEGER,
  delta_breadth_text TEXT,
  delta_liquidity_text TEXT,
  delta_volatility_text TEXT,
  delta_leadership_text TEXT,
  delta_rationale_bullets JSONB,
  delta_plain_english_summary TEXT,
  delta_next_triggers_detail JSONB,
  
  -- Metadata
  full_analysis JSONB,              -- Complete JSON from OpenAI
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_daily_snapshots_date ON daily_snapshots(date DESC);
CREATE INDEX idx_daily_snapshots_created_at ON daily_snapshots(created_at DESC);
```

#### JSONB Field Structures

**`gamma_domains` (Array)**:
```json
[
  {
    "domain_name": "Leadership",
    "bias": "Bearish",
    "bias_emoji": "🔴",
    "color_code": "🔴"
  },
  // ... 5 more domains (Breadth, Sentiment, Volatility, Credit, Macro)
]
```

**`gamma_domain_details` (Object)**:
```json
{
  "breadth": {
    "analysis": "Market breadth is narrowing...",
    "key_takeaway": "Concentration risk rising",
    "observations": "SPXA50R at 44%..."
  },
  // ... 5 more domains
}
```

**`delta_key_drivers` (Array)**:
```json
[
  "Breadth remains thin with SPXA50R at 46.5%.",
  "Liquidity indicators show softening with HYG/IEF at 1.01.",
  "Volatility spiking with VIX at 18.5, indicating rising fear."
]
```

#### Database Access

```bash
# Connect via psql
psql "postgresql://postgres:QTUFBpWfMQNRocCgDLNsbOTQdSAkYbvc@maglev.proxy.rlwy.net:39797/railway"

# Common queries
SELECT date, fusion_cycle_stage, delta_fragility_score FROM daily_snapshots ORDER BY date DESC LIMIT 10;

SELECT COUNT(*) FROM daily_snapshots;

SELECT date FROM daily_snapshots ORDER BY date DESC LIMIT 1;
```

---

## 🔄 Data Flow

### 1. Daily Analysis Generation (Cron Job)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Cron Job Triggers (11:00 PM EST daily)                 │
│         Railway Cron: node dist/server/index.js --cron         │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Call OpenAI GPT-4 API (3 separate calls)               │
│  • generateGammaAnalysis() → Gamma JSON                        │
│  • generateDeltaAnalysis() → Delta JSON                        │
│  • generateFusionAnalysis(gamma, delta) → Fusion JSON          │
│  Processing time: ~8-10 minutes total                          │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Parse & Validate JSON Responses                        │
│  • Extract level1 and level2 data                              │
│  • Validate required fields                                    │
│  • Handle missing/null values                                  │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Upsert to Database                                     │
│  • INSERT or UPDATE daily_snapshots                            │
│  • Store JSONB fields for complex structures                   │
│  • Save full_analysis for debugging                            │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Data Available for API Queries                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. User Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User Opens Portal (index.html or trends.html)          │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: JavaScript Calls API                                   │
│  • fetchLatestAnalysis() or fetchHistoricalAnalysis(days)      │
│  • HTTPS GET to cyclescope-api                                 │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: tRPC Router Handles Request                            │
│  • analysis.latest → getLatestSnapshot()                       │
│  • analysis.history → getSnapshotHistory(days)                 │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Database Query (PostgreSQL)                            │
│  • SELECT * FROM daily_snapshots ORDER BY date DESC LIMIT 1    │
│  • SELECT * FROM daily_snapshots WHERE date >= cutoff          │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Transform Data for Frontend                            │
│  • Parse JSONB fields                                          │
│  • Convert snake_case to camelCase                             │
│  • Return JSON response                                        │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Portal Renders Data                                    │
│  • updateFusionSection(data.fusion)                            │
│  • updateGammaSection(data.gamma)                              │
│  • updateDeltaSection(data.delta)                              │
│  • Update DOM elements with data                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌐 API Design

### tRPC Router Structure

```typescript
export const appRouter = router({
  analysis: router({
    latest: publicProcedure.query(async () => { /* ... */ }),
    history: publicProcedure.input(z.object({ days: z.number() })).query(async ({ input }) => { /* ... */ }),
    triggerAll: publicProcedure.mutation(async () => { /* ... */ }),
  }),
  dashboard: router({
    triggerAll: publicProcedure.mutation(async () => { /* ... */ }),
  }),
  delta: router({
    triggerAll: publicProcedure.mutation(async () => { /* ... */ }),
  }),
});

export type AppRouter = typeof appRouter;
```

### API Endpoints

| Endpoint | Method | Purpose | Response Time | Notes |
|----------|--------|---------|---------------|-------|
| `/api/trpc/analysis.latest` | GET | Get latest analysis | ~500ms | Returns Fusion + Gamma + Delta |
| `/api/trpc/analysis.history` | GET | Get historical data | ~1-2s | Query param: `days=30/60/90` |
| `/api/trpc/analysis.triggerAll` | POST | Trigger Portal processing | ~300ms | Async (2-3 min processing) |
| `/api/trpc/dashboard.triggerAll` | POST | Trigger Dashboard analysis | ~300ms | Async (8-10 min processing) |
| `/api/trpc/delta.triggerAll` | POST | Trigger Delta analysis | ~300ms | Async (8-10 min processing) |

### API Response Format

**GET /api/trpc/analysis.latest**

```json
{
  "result": {
    "data": {
      "fusion": {
        "asofDate": "2025-11-07",
        "cycleStage": "Late-Cycle",
        "fragilityColor": "ORANGE",
        "fragilityLabel": "Elevated Internal Risk",
        "guidanceLabel": "Defensive Tilt",
        "headlineSummary": "...",
        "cycleTone": "...",
        "narrativeSummary": "...",
        "guidanceBullets": ["...", "..."],
        "watchCommentary": "..."
      },
      "gamma": {
        "asofWeek": "Week of November 4, 2025",
        "cycleStagePrimary": "Late-Cycle",
        "cycleStageTransition": "Topping",
        "macroPostureLabel": "Neutral-Bearish",
        "headlineSummary": "...",
        "domains": [
          { "domain_name": "Leadership", "bias": "Bearish", "bias_emoji": "🔴", "color_code": "🔴" },
          // ... 5 more domains
        ],
        "phaseConfidence": "0.65",
        "cycleTone": "...",
        "overallSummary": "...",
        "domainDetails": {
          "breadth": { "analysis": "...", "key_takeaway": "...", "observations": "..." },
          // ... 5 more domains
        }
      },
      "delta": {
        "asofDate": "2025-11-07",
        "fragilityScore": 5,
        "fragilityColor": "ORANGE",
        "fragilityLabel": "Elevated Internal Risk (5/8)",
        "patternPlain": "Liquidity Stress",
        "postureLabel": "Defensive",
        "headlineSummary": "...",
        "keyDrivers": ["...", "...", "..."],
        "nextWatchDisplay": ["...", "..."],
        "phaseUsed": "Late-Cycle → Topping",
        "phaseConfidence": "0.65",
        "breadth": 1,
        "liquidity": 2,
        "volatility": 1,
        "leadership": 1,
        "breadthText": "Thin",
        "liquidityText": "Softening",
        "volatilityText": "Elevated",
        "leadershipText": "Narrow",
        "rationaleBullets": ["...", "..."],
        "plainEnglishSummary": "...",
        "nextTriggersDetail": ["...", "..."]
      }
    }
  }
}
```

---

## 🚀 Deployment Architecture

### Railway Deployment

Both frontend and backend are deployed on Railway with automatic deployments from GitHub.

#### cyclescope-portal Deployment

**railway.json**:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables**:
- `PORT=3000` (auto-injected by Railway)

**Build Process**:
1. Railway detects `package.json`
2. Runs `npm install`
3. Starts `node server.js`
4. Serves static files from root directory

---

#### cyclescope-api Deployment

**railway.json**:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/server/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables**:
- `DATABASE_URL=postgresql://...` (Railway PostgreSQL)
- `OPENAI_API_KEY=sk-...` (OpenAI API key)
- `PORT=3001` (auto-injected by Railway)

**Build Process**:
1. Railway detects `package.json`
2. Runs `pnpm install`
3. Runs `pnpm build` (TypeScript compilation)
4. Starts `node dist/server/index.js`

---

### Database Deployment

**Railway PostgreSQL Plugin**:
- Automatically provisioned
- Connection string injected as `DATABASE_URL`
- Managed backups and scaling
- Accessible via Railway dashboard

**Migration Process**:
```bash
# Run migrations manually or via Railway
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

### Cron Job Setup

**Railway Cron Jobs**:
- Schedule: `0 23 * * *` (11:00 PM EST daily)
- Command: `node dist/server/index.js --cron`
- Triggers daily analysis generation

---

## 🤖 GitHub Actions Automation

**Repository**: https://github.com/schiang418/cyclescope-automation  
**Purpose**: Automated daily data updates and chart backups

### Workflow: Update CycleScope Charts & Portal

**File**: `.github/workflows/update-charts.yml`  
**Schedule**: Daily at 9:30 PM ET (1:30 AM UTC)  
**Trigger**: Cron `30 1 * * *` + Manual workflow_dispatch

### Workflow Steps

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Trigger Dashboard Update                               │
│  POST /api/trpc/dashboard.triggerAll                           │
│  Response: HTTP 200 (async processing starts)                  │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Trigger Delta Update                                   │
│  POST /api/trpc/delta.triggerAll                               │
│  Response: HTTP 200 (async processing starts)                  │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Wait 8 minutes                                         │
│  Allows chart generation to complete                           │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Download Charts                                        │
│  • 18 Dashboard charts                                         │
│  • 14 Delta charts                                             │
│  Total: 32 charts                                              │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Create Backup Artifact                                 │
│  Upload to GitHub Actions artifacts (30-day retention)         │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Wait 30 seconds                                        │
│  Avoid Railway rate limiting                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: Trigger Portal Processing                              │
│  POST /api/trpc/analysis.triggerAll                            │
│  Response: HTTP 200 (async processing starts)                  │
│  ✅ FIXED: URL sanitization added (Nov 11, 2025)               │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Verify Portal Accessible                               │
│  GET / (health check)                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Fix: URL Sanitization (Nov 11, 2025)

**Problem**: GitHub Secret `CYCLESCOPE_API_ENDPOINT` contained trailing whitespace/newlines, causing `curl: (3) URL rejected: Malformed input to a URL function`

**Solution**:
```bash
# Clean the endpoint URL (remove trailing whitespace/newlines)
ENDPOINT=$(echo "${{ secrets.CYCLESCOPE_API_ENDPOINT }}" | tr -d '\n\r' | xargs)
API_URL="${ENDPOINT}/api/trpc/analysis.triggerAll"

# Use cleaned URL
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n%{http_code}" \
  -s \
  "$API_URL"
```

**Result**: HTTP 200 success, workflow runs successfully

### GitHub Secrets

| Secret | Value | Purpose |
|--------|-------|---------|
| `CYCLESCOPE_API_ENDPOINT` | `https://cyclescope-api-production.up.railway.app` | API base URL |

**⚠️ Important**: Ensure no trailing whitespace or newlines in secret values!

### Workflow Logs

View at: https://github.com/schiang418/cyclescope-automation/actions

**Successful Run Example**:
- Status: ✅ Success
- HTTP Status: 200
- Duration: ~1m 40s
- All steps completed

---

## 🎯 Key Design Decisions

### 1. Why Static HTML Frontend?

**Decision**: Use static HTML/CSS/JS instead of React/Vue

**Rationale**:
- **Simplicity**: No build process, easy to deploy
- **Performance**: Fast page loads, minimal JavaScript
- **Maintainability**: Easy for non-developers to understand
- **Cost**: Lower hosting costs (static files)

**Trade-offs**:
- Manual DOM manipulation (no virtual DOM)
- Less code reusability (no components)
- More verbose code for complex interactions

---

### 2. Why tRPC for API?

**Decision**: Use tRPC instead of REST or GraphQL

**Rationale**:
- **Type Safety**: End-to-end TypeScript types
- **Developer Experience**: No code generation needed
- **Simplicity**: Less boilerplate than REST
- **Performance**: Efficient serialization with superjson

**Trade-offs**:
- Requires TypeScript on both ends
- Less suitable for public APIs (designed for internal use)

---

### 3. Why PostgreSQL?

**Decision**: Use PostgreSQL instead of MongoDB/MySQL

**Rationale**:
- **JSONB Support**: Native JSON storage and querying
- **Reliability**: ACID compliance for data integrity
- **Scalability**: Handles large datasets efficiently
- **Railway Integration**: Managed PostgreSQL plugin

**Trade-offs**:
- More complex schema migrations
- Higher resource usage than SQLite

---

### 4. Why Daily Snapshots?

**Decision**: Store one snapshot per day instead of real-time updates

**Rationale**:
- **Cost Efficiency**: Reduce OpenAI API calls
- **Data Stability**: Consistent daily analysis
- **Historical Tracking**: Easy to query trends

**Trade-offs**:
- Not suitable for intraday trading
- Delayed updates (once per day)

---

### 5. Why Layer 1 & Layer 2?

**Decision**: Split analysis into two layers (quick view vs. deep dive)

**Rationale**:
- **User Experience**: Progressive disclosure of complexity
- **Performance**: Load Layer 1 first, Layer 2 on demand
- **Information Architecture**: Separate high-level from detailed insights

**Trade-offs**:
- More complex UI logic (layer switching)
- Duplicate data in some cases

---

## 📁 File Structure

### cyclescope-portal

```
cyclescope-portal/
├── index.html              # Dashboard page
├── trends.html             # Trend analysis page
├── server.js               # Express.js static server
├── package.json            # Dependencies
├── railway.json            # Railway deployment config
├── css/
│   └── style.css          # Global styles
├── js/
│   ├── api-client.js      # API communication
│   └── update-portal.js   # DOM manipulation
└── README.md              # Documentation
```

---

### cyclescope-api

```
cyclescope-api/
├── server/
│   ├── index.ts           # Express + tRPC server
│   ├── routers.ts         # API endpoints
│   ├── db.ts              # Database queries
│   └── assistants/
│       ├── gamma.ts       # Gamma analysis
│       ├── delta.ts       # Delta analysis
│       └── fusion.ts      # Fusion analysis
├── drizzle/
│   ├── schema.ts          # Database schema
│   └── migrations/        # SQL migrations
├── dist/                  # Compiled JavaScript (gitignored)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── drizzle.config.ts      # Drizzle ORM config
├── railway.json           # Railway deployment config
└── README.md              # Documentation
```

---

### cyclescope-automation

```
cyclescope-automation/
├── .github/workflows/
│   ├── update-charts.yml          # Main workflow (FIXED)
│   ├── test-api.yml              # API connection test
│   └── test-secret.yml           # Secret verification test
├── CHANGELOG.md                   # Version history
├── README.md                      # User guide
├── REVISION_SUMMARY.md            # Detailed fix documentation
└── ASYNC_FIX_DOCUMENTATION.md     # Async processing notes
```

---

## 🔐 Configuration & Secrets

### Environment Variables

#### cyclescope-portal

```bash
# Railway auto-injected
PORT=3000
```

---

#### cyclescope-api

```bash
# Database connection
DATABASE_URL=postgresql://postgres:QTUFBpWfMQNRocCgDLNsbOTQdSAkYbvc@maglev.proxy.rlwy.net:39797/railway

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Server port (Railway auto-injected)
PORT=3001
```

---

### Secrets Management

**Railway Secrets**:
- All environment variables stored in Railway dashboard
- Encrypted at rest
- Injected at runtime
- Not committed to Git

**Local Development**:
```bash
# .env (gitignored)
DATABASE_URL=postgresql://localhost:5432/cyclescope
OPENAI_API_KEY=sk-proj-...
PORT=3001
```

---

## 📊 Monitoring & Maintenance

### Health Checks

**Frontend**:
- Railway monitors HTTP response on `PORT`
- Auto-restart on failure

**Backend**:
- Railway monitors HTTP response on `PORT`
- Auto-restart on failure
- Database connection health check in `server/index.ts`

---

### Logging

**Frontend**:
- Browser console logs for debugging
- Error tracking in `update-portal.js`

**Backend**:
- Console logs for all database queries
- Error logs for OpenAI API failures
- Cron job execution logs

---

### Database Maintenance

**Backup Strategy**:
- Railway automatic daily backups
- 7-day retention
- Point-in-time recovery available

**Data Cleanup**:
- No automatic cleanup (all historical data retained)
- Manual cleanup via SQL if needed

---

### Performance Monitoring

**Metrics to Track**:
- API response time (should be < 500ms)
- Database query time (should be < 100ms)
- OpenAI API call time (typically 5-20 seconds)
- Frontend page load time (should be < 2 seconds)

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. GitHub Actions Workflow Failing

**Symptom**: Workflow fails with `curl: (3) URL rejected: Malformed input to a URL function`

**Cause**: GitHub Secret `CYCLESCOPE_API_ENDPOINT` contains trailing whitespace or newlines

**Solution**:
1. Go to GitHub repository Settings → Secrets → Actions
2. Edit `CYCLESCOPE_API_ENDPOINT`
3. Remove any trailing spaces or newlines
4. Ensure value is exactly: `https://cyclescope-api-production.up.railway.app`
5. Save and re-run workflow

**Reference**: See `CHANGELOG.md` in cyclescope-automation repository

---

#### 2. Portal Shows "Loading..." Forever

**Symptom**: Portal displays loading state but never shows data

**Possible Causes**:
1. **API is down**: Check https://cyclescope-api-production.up.railway.app/
2. **Database is empty**: No data in `daily_snapshots` table
3. **CORS issue**: API not allowing requests from Portal domain
4. **Network error**: Check browser console for errors

**Debugging Steps**:
```javascript
// Open browser console on Portal
// Check for errors
console.log('Checking API...');

// Test API directly
fetch('https://cyclescope-api-production.up.railway.app/api/trpc/analysis.latest')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Solution**:
- If API is down: Check Railway dashboard, restart service
- If database is empty: Run cron job manually or wait for next scheduled run
- If CORS issue: Check `server/index.ts` CORS configuration
- If network error: Check browser network tab for details

---

#### 3. Cron Job Not Running

**Symptom**: No new data in database after 11:00 PM EST

**Possible Causes**:
1. **Railway cron not configured**: Check Railway dashboard
2. **OpenAI API key expired**: Check API key validity
3. **Database connection failed**: Check `DATABASE_URL`
4. **Script error**: Check Railway logs

**Debugging Steps**:
1. Check Railway dashboard → cyclescope-api → Cron Jobs
2. View cron job logs
3. Manually trigger: `node dist/server/index.js --cron`

**Solution**:
- If cron not configured: Set up in Railway dashboard
- If API key expired: Update `OPENAI_API_KEY` in Railway
- If database connection failed: Verify `DATABASE_URL`
- If script error: Check logs and fix code

---

#### 4. Missing Charts in Trends Page

**Symptom**: Trends page shows "No data available"

**Possible Causes**:
1. **Insufficient historical data**: Less than 30 days of data
2. **API returning empty array**: Database query issue
3. **Frontend parsing error**: Check browser console

**Debugging Steps**:
```sql
-- Check how many days of data exist
SELECT COUNT(*) FROM daily_snapshots;

-- Check date range
SELECT MIN(date), MAX(date) FROM daily_snapshots;
```

**Solution**:
- If insufficient data: Wait for more daily snapshots to accumulate
- If API issue: Check `getSnapshotHistory()` function in `server/db.ts`
- If parsing error: Check `update-portal.js` for errors

---

#### 5. Database Connection Timeout

**Symptom**: API returns 500 error with "Connection timeout"

**Possible Causes**:
1. **Railway database sleeping**: Cold start delay
2. **Connection pool exhausted**: Too many concurrent connections
3. **Network issue**: Railway network problem

**Solution**:
```typescript
// server/db.ts - Add connection retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

#### 6. OpenAI API Rate Limit

**Symptom**: Cron job fails with "Rate limit exceeded"

**Possible Causes**:
1. **Too many API calls**: Multiple cron jobs running simultaneously
2. **OpenAI account limit**: Exceeded monthly quota

**Solution**:
- Check OpenAI dashboard for usage
- Implement exponential backoff retry logic
- Increase OpenAI API quota if needed

---

### Debugging Tools

**Railway CLI**:
```bash
# View logs
railway logs

# Connect to database
railway run psql

# Restart service
railway restart
```

**Database Queries**:
```sql
-- Check latest snapshot
SELECT date, fusion_cycle_stage, delta_fragility_score 
FROM daily_snapshots 
ORDER BY date DESC 
LIMIT 1;

-- Check data completeness
SELECT 
  date,
  CASE WHEN fusion_asof_date IS NOT NULL THEN '✓' ELSE '✗' END AS fusion,
  CASE WHEN gamma_asof_week IS NOT NULL THEN '✓' ELSE '✗' END AS gamma,
  CASE WHEN delta_asof_date IS NOT NULL THEN '✓' ELSE '✗' END AS delta
FROM daily_snapshots
ORDER BY date DESC
LIMIT 10;
```

**API Testing**:
```bash
# Test latest analysis
curl https://cyclescope-api-production.up.railway.app/api/trpc/analysis.latest

# Test history
curl "https://cyclescope-api-production.up.railway.app/api/trpc/analysis.history?input=%7B%22days%22%3A30%7D"

# Trigger Portal processing
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://cyclescope-api-production.up.railway.app/api/trpc/analysis.triggerAll
```

---

## 📚 Additional Resources

### Documentation

- **cyclescope-portal**: https://github.com/schiang418/cyclescope-portal/blob/main/README.md
- **cyclescope-api**: https://github.com/schiang418/cyclescope-api/blob/main/README.md
- **cyclescope-automation**: https://github.com/schiang418/cyclescope-automation/blob/main/README.md

### External Services

- **Railway Dashboard**: https://railway.app/dashboard
- **OpenAI Platform**: https://platform.openai.com/
- **GitHub Actions**: https://github.com/schiang418/cyclescope-automation/actions

### Support

For issues or questions:
1. Check this architecture document
2. Review CHANGELOG.md in respective repositories
3. Check GitHub Actions logs for automation issues
4. Review Railway logs for deployment issues

---

**Document Version**: 2.0 (Enhanced)  
**Last Updated**: November 11, 2025  
**Maintained By**: CycleScope Development Team

