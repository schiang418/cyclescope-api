# CycleScope API

**Automated Market Intelligence Analysis System**

CycleScope API integrates three OpenAI Assistants (Gamma, Delta, Fusion) to perform comprehensive market analysis by processing 32 charts from two Railway-deployed dashboards. Results are stored in PostgreSQL and served via type-safe tRPC endpoints.

---

## 🏗️ Architecture

```
GitHub Actions (daily 00:00 UTC)
    ↓
Update Dashboards (8-9 min)
    ├─ Gamma Dashboard: 18 charts (6 domains)
    └─ Delta Dashboard: 14 charts (4 dimensions)
    ↓
POST /api/trpc/analysis.triggerAll
    ↓
CycleScope API (Node.js + tRPC)
    ├─ Gamma Assistant → Analyze 18 charts
    ├─ Delta Assistant → Analyze 14 charts
    └─ Fusion Assistant → Synthesize results
    ↓
PostgreSQL Database
    ├─ daily_snapshots (complete analysis)
    └─ status_changes (field changes tracking)
    ↓
Portal Frontend (reads via tRPC)
```

---

## 📊 Data Sources

### Gamma Dashboard (18 Charts)
**URL**: `https://cyclescope-dashboard-production.up.railway.app/charts/`

- **MACRO** (3): SPX Secular Trend, Yield Curve, Dollar Index
- **LEADERSHIP** (3): SPX vs EW, Tech Leadership, Cyclical/Defensive
- **BREADTH** (3): Advance/Decline, New Highs/Lows, % Above MA
- **CREDIT** (3): Credit Spreads, High Yield, TED Spread
- **VOLATILITY** (3): VIX, VVIX, Put/Call Ratio
- **SENTIMENT** (3): AAII Survey, CNN Fear/Greed, Margin Debt

### Delta Dashboard (14 Charts)
**URL**: `https://cyclescope-delta-dashboard-production.up.railway.app/charts/`

- **BREADTH** (3): SPXA50R, SPXA200R, NYHL
- **LIQUIDITY/CREDIT** (2): HYG/LQD, TLT
- **VOLATILITY** (3): VIX, VIX9D, VVIX
- **LEADERSHIP** (2): XLY/XLP, IWM/SPY
- **OPTIONALS** (4): DXY, GLD, CL, USD

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL database
- OpenAI API key with access to the three Assistants

### Local Development

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
pnpm run db:push

# Start development server
pnpm run dev
```

Server runs on `http://localhost:3000`

---

## 🌐 Railway Deployment

### Step 1: Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: CycleScope API"
git remote add origin https://github.com/YOUR_USERNAME/cyclescope-api.git
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `cyclescope-api`

### Step 3: Add PostgreSQL Database

1. In Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for provisioning (DATABASE_URL auto-injected)

### Step 4: Set Environment Variables

In Railway project settings, add:

```
OPENAI_API_KEY=<your-openai-api-key>
GAMMA_ASSISTANT_ID=asst_Ynyur2GgkCWgLKmuqiM8zIt2
DELTA_ASSISTANT_ID=asst_niipkh0HSLaeuPWwS5B7Y098
FUSION_ASSISTANT_ID=asst_n5pAPgQbIwbSrFx76PgtEsPY
```

### Step 5: Deploy

Railway will automatically:
- Build Docker image
- Install dependencies
- Build TypeScript
- Start server

Access: `https://your-app.railway.app/health`

---

## 📡 API Endpoints

### tRPC Endpoints

Base URL: `/api/trpc`

#### `analysis.triggerAll` (mutation)
Trigger complete analysis pipeline (Gamma + Delta + Fusion)

**Response:**
```typescript
{
  success: boolean;
  snapshotId: number;
  timestamp: Date;
  results: {
    fusion: { phase, fragility, guidance };
    gamma: { macro, leadership, breadth, credit, volatility, sentiment };
    delta: { status, breadth, liquidityCredit, volatility, leadership };
  };
}
```

#### `analysis.latest` (query)
Get latest snapshot

**Response:**
```typescript
{
  id: number;
  date: Date;
  fusion: { phase, fragility, guidance };
  gamma: { macro, leadership, breadth, credit, volatility, sentiment };
  delta: { status, breadth, liquidityCredit, volatility, leadership };
  fullAnalysis: object;
  createdAt: Date;
}
```

#### `analysis.history` (query)
Get snapshot history

**Input:**
```typescript
{ days: number } // 1-365, default 30
```

**Response:**
```typescript
Array<{
  id: number;
  date: Date;
  fusionPhase: string;
  fusionFragility: string;
  deltaStatus: string;
  createdAt: Date;
}>
```

#### `analysis.changes` (query)
Get recent status changes

**Input:**
```typescript
{ limit: number } // 1-100, default 10
```

**Response:**
```typescript
Array<{
  id: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  changedAt: Date;
  duration: number | null;
}>
```

### REST Endpoints

#### `GET /health`
Health check

**Response:**
```json
{
  "status": "ok",
  "service": "CycleScope API",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `GET /`
API information

---

## 🗄️ Database Schema

### `daily_snapshots`
Stores complete daily analysis results

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| date | timestamp | Analysis date |
| fusion_phase | text | Market phase (ACCUMULATION, MARKUP, DISTRIBUTION, MARKDOWN) |
| fusion_fragility | text | Fragility level (LOW, MODERATE, HIGH) |
| fusion_guidance | text | Strategic guidance |
| gamma_macro | text | MACRO domain status |
| gamma_leadership | text | LEADERSHIP domain status |
| gamma_breadth | text | BREADTH domain status |
| gamma_credit | text | CREDIT domain status |
| gamma_volatility | text | VOLATILITY domain status |
| gamma_sentiment | text | SENTIMENT domain status |
| delta_status | text | Overall status (STABLE, CAUTION, FRAGILE) |
| delta_breadth | integer | Breadth stress (0=green, 1=yellow, 2=orange) |
| delta_liquidity_credit | integer | Liquidity/Credit stress |
| delta_volatility | integer | Volatility stress |
| delta_leadership | integer | Leadership stress |
| full_analysis | jsonb | Complete analysis JSON |
| created_at | timestamp | Record creation time |

### `status_changes`
Tracks field changes over time

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| field_name | text | Field that changed |
| old_value | text | Previous value |
| new_value | text | New value |
| changed_at | timestamp | Change timestamp |
| duration | integer | Days since last change |

---

## 🔧 Development

### Project Structure

```
cyclescope-api/
├── server/
│   ├── index.ts              # Express server entry
│   ├── routers.ts            # tRPC API endpoints
│   ├── db.ts                 # Database operations
│   └── assistants/
│       ├── gamma.ts          # Gamma Assistant (18 charts)
│       ├── delta.ts          # Delta Assistant (14 charts)
│       └── fusion.ts         # Fusion Assistant (synthesis)
├── drizzle/
│   └── schema.ts             # Database schema
├── Dockerfile                # Docker build config
├── railway.json              # Railway deployment config
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

### Tech Stack

- **Runtime**: Node.js 22
- **Language**: TypeScript
- **Framework**: Express 4
- **API**: tRPC 11 (type-safe)
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **AI**: OpenAI Assistants API
- **Deployment**: Railway (Docker)

### Scripts

```bash
pnpm run dev        # Start development server with watch mode
pnpm run build      # Build TypeScript to dist/
pnpm run start      # Start production server
pnpm run db:push    # Push schema changes to database
pnpm run db:studio  # Open Drizzle Studio (database GUI)
```

---

## 🧪 Testing

### Test Health Endpoint

```bash
curl https://your-app.railway.app/health
```

### Test tRPC Endpoint (via HTTP)

```bash
# Trigger analysis
curl -X POST https://your-app.railway.app/api/trpc/analysis.triggerAll \
  -H "Content-Type: application/json" \
  -d '{"json":null}'

# Get latest snapshot
curl https://your-app.railway.app/api/trpc/analysis.latest
```

### Test with tRPC Client

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/routers';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://your-app.railway.app/api/trpc',
    }),
  ],
});

// Trigger analysis
const result = await client.analysis.triggerAll.mutate();

// Get latest
const latest = await client.analysis.latest.query();
```

---

## 📅 Automation Workflow

### GitHub Actions Integration

Create `.github/workflows/daily-analysis.yml` in your Portal/Dashboard repo:

```yaml
name: Daily Market Analysis

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at 00:00 UTC
  workflow_dispatch:      # Manual trigger

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger CycleScope API
        run: |
          curl -X POST ${{ secrets.CYCLESCOPE_API_URL }}/api/trpc/analysis.triggerAll \
            -H "Content-Type: application/json" \
            -d '{"json":null}'
```

---

## 🔒 Security

- **Environment Variables**: Never commit `.env` files
- **API Keys**: Store in Railway environment variables
- **Database**: Use Railway's auto-injected `DATABASE_URL`
- **CORS**: Configure allowed origins in production

---

## 📈 Monitoring

### Railway Logs

View real-time logs in Railway dashboard:
- Build logs: Check for compilation errors
- Deploy logs: Monitor startup and runtime errors
- Application logs: Track analysis execution

### Database Monitoring

Use Drizzle Studio to inspect data:

```bash
pnpm run db:studio
```

---

## 🐛 Troubleshooting

### Build Fails

**Error**: `pnpm install` fails
- **Solution**: Check `package.json` syntax
- **Solution**: Ensure Railway has access to GitHub repo

### Runtime Errors

**Error**: `DATABASE_URL is not defined`
- **Solution**: Verify PostgreSQL is added to Railway project
- **Solution**: Check environment variables in Railway settings

**Error**: `OpenAI API key invalid`
- **Solution**: Verify `OPENAI_API_KEY` in Railway environment variables
- **Solution**: Check API key has access to Assistants

**Error**: `Assistant not found`
- **Solution**: Verify Assistant IDs are correct
- **Solution**: Check OpenAI account has access to Assistants

### Analysis Timeout

**Issue**: Analysis takes too long (>2 minutes)
- **Cause**: OpenAI Assistant processing time
- **Solution**: Normal behavior, wait for completion
- **Solution**: Check Railway logs for progress

---

## 📝 License

MIT

---

## 👥 Support

For issues or questions:
- GitHub Issues: [cyclescope-api/issues](https://github.com/schiang418/cyclescope-api/issues)
- Documentation: This README

---

## 🎯 Roadmap

- [ ] Add webhook support for GitHub Actions
- [ ] Implement caching for repeated analyses
- [ ] Add email notifications for status changes
- [ ] Create admin dashboard for monitoring
- [ ] Add rate limiting for API endpoints
- [ ] Implement retry logic for failed analyses

---

**Built with ❤️ for automated market intelligence**

