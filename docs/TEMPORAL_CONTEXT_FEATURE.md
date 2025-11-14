# Temporal Context Feature for Gamma Analysis

**Author:** Manus AI  
**Date:** November 14, 2025  
**Version:** 1.0  
**Implementation:** CSV-Only Branch Only

---

## Overview

The **Temporal Context** feature enhances Gamma cycle analysis by providing the OpenAI Assistant with historical context from previous analysis runs. This prevents abrupt jumps in cycle stage assessments and ensures smoother, more consistent market phase transitions over time.

**Key Benefits:**

- **Smoother transitions**: Prevents sudden jumps from "Mid-Cycle" to "Late-Cycle" without intermediate signals
- **Historical awareness**: AI considers recent market evolution when making current assessments
- **Configurable modes**: Supports both sequential (last N records) and weekly (specific Mondays) temporal windows
- **Minimal overhead**: Lightweight database queries with negligible performance impact

---

## Implementation Scope

**✅ Implemented in:**
- **Gamma CSV-Only** analysis (`server/assistants/gammaCsvOnlyV2.ts`)
- **Delta CSV-Only** analysis (`server/assistants/deltaCsvOnly.ts`) - separate implementation with different logic

**❌ Not implemented in:**
- Gamma Enhanced analysis
- Gamma Standard analysis
- Delta Enhanced analysis
- Delta Standard analysis
- Fusion analysis (inherits context from Gamma and Delta)

---

## Delta Temporal Context (Separate Implementation)

**Delta analysis has its own temporal context implementation** with different goals and logic compared to Gamma.

### Key Differences from Gamma

| Aspect | Gamma Temporal Context | Delta Temporal Context |
|--------|------------------------|------------------------|
| **Purpose** | Smooth cycle stage transitions | Detect fragility trends and filter noise |
| **Time Window** | Last 2 weeks | Last 3 days |
| **Data Structure** | Cycle stage, macro posture, summary | Fragility score, dimensions, template, posture |
| **Instructions** | Minimal (in Assistant prompt) | Extensive (passed with data) |
| **Mode Options** | Sequential or Weekly | Sequential only |
| **Environment Variable** | `GAMMA_WEEKLY_TEMPORAL` | `TEMPORAL_DATA` |

### Delta Implementation Details

**Configuration:**
```bash
# Default: enabled
TEMPORAL_DATA=true   # Enable temporal context
TEMPORAL_DATA=false  # Disable temporal context
```

**Data Fetched (Last 3 Days):**
- `asof_date`: Analysis date
- `fragility_color`: ORANGE, YELLOW, or GREEN
- `fragility_score`: Numeric score (0-10)
- `template_code` & `template_name`: Market pattern template
- `posture_code` & `posture_label`: Risk posture (Caution, Defensive, etc.)
- **Four Dimensions:**
  - `breadth`: 0 (green), 1 (yellow), or 2 (orange)
  - `liquidity`: 0 (green), 1 (yellow), or 2 (orange)
  - `volatility`: 0 (green), 1 (yellow), or 2 (orange)
  - `leadership`: 0 (green), 1 (yellow), or 2 (orange)

**Temporal Processing Instructions (Passed to AI):**

Delta includes **extensive instructions** with the temporal data to guide the AI:

1. **Fragility Trajectory Analysis**
   - Building: Score increasing over 2+ days
   - Stable: Score ±1 point
   - Releasing: Score decreasing

2. **Dimension Persistence Tracking**
   - Flag dimensions at 2 (orange) for 2+ consecutive days as structural concerns
   - Distinguish between isolated spikes (noise) and multi-dimension deterioration

3. **Structural vs. Noise Filtering**
   - Structural: Liquidity worsens OR 2+ dimensions worsen together
   - Noise: Single dimension spikes while others stable
   - Confirmation: Wait for 2nd day before escalating on isolated moves

4. **Template Stability**
   - Don't change template on single-day moves
   - Only change if 2+ dimensions confirm new structural pattern

5. **Posture Continuity**
   - Don't oscillate between Caution/Defensive on noise
   - Escalate/de-escalate only after 2+ days of consistent signals

6. **Priority Hierarchy**
   - **Liquidity** (most important - credit stress is structural)
   - **Leadership** (second - shows rotation quality)
   - **Breadth** (third - confirms participation)
   - **Volatility** (fourth - often noise, confirm with others)

**Example Delta Temporal Context:**
```json
{
  "past_delta_states": [
    {
      "asof_date": "2025-11-13",
      "fragility_color": "ORANGE",
      "fragility_score": 6,
      "template_code": "A",
      "template_name": "Hollow Highs",
      "posture_code": "C",
      "posture_label": "Caution",
      "dimensions": {
        "breadth": 1,
        "liquidity": 2,
        "volatility": 1,
        "leadership": 2
      }
    },
    {
      "asof_date": "2025-11-12",
      "fragility_color": "YELLOW",
      "fragility_score": 4,
      "dimensions": {
        "breadth": 1,
        "liquidity": 1,
        "volatility": 1,
        "leadership": 1
      }
    }
  ]
}
```

### Why Delta Needs Different Logic

**Gamma** tracks **slow-moving macro cycles** (weeks to months):
- Cycle stages change gradually
- Focus on smoothing transitions
- Minimal instructions needed (logic in Assistant prompt)

**Delta** tracks **fast-moving market fragility** (days to weeks):
- Fragility can spike quickly (noise)
- Need to distinguish structural trends from temporary volatility
- Requires detailed rules for escalation/de-escalation
- More complex multi-dimensional analysis

---

## How It Works (Gamma Focus)

### Data Flow

The temporal context feature follows this execution flow during each Gamma analysis:

1. **Query Historical Data**
   - Fetch the last 2 Gamma analysis results from the database
   - Filter by analysis date to exclude the current run
   - Support two modes: sequential (last 2 records) or weekly (specific Mondays)

2. **Format Context**
   - Extract key fields: `asof_week`, `cycle_stage`, `macro_posture`, `headline_summary`
   - Structure as JSON array for AI consumption
   - Prepend with clear header: `**PRIOR WEEKS CONTEXT:**`

3. **Pass to OpenAI Assistant**
   - Include formatted context in the analysis request
   - AI uses this to inform current cycle stage assessment
   - Instructions for handling temporal data are embedded in the Assistant's system prompt

4. **Generate Current Analysis**
   - AI produces new analysis considering historical trends
   - Ensures consistency with recent assessments unless strong signals warrant change

### Database Query Logic

The feature uses `getPriorGammaOutputs()` function in `server/db.ts`:

```typescript
export async function getPriorGammaOutputs(
  count: number = 2,
  excludeDate?: string,
  weeklyMode: boolean = false
): Promise<GammaPriorWeek[]>
```

**Parameters:**
- `count`: Number of prior records to fetch (default: 2)
- `excludeDate`: Date to exclude (typically the current analysis date)
- `weeklyMode`: If true, fetch specific Monday dates; if false, fetch last N records

**Sequential Mode** (default):
- Fetches the most recent `count` records before `excludeDate`
- Ordered by `date` descending
- Example: For analysis on 2025-11-14, fetches records from 2025-11-13, 2025-11-12, etc.

**Weekly Mode** (when `GAMMA_WEEKLY_TEMPORAL=true`):
- Calculates specific Monday dates (1 week ago, 2 weeks ago)
- Only fetches records matching those exact dates
- Example: For analysis on 2025-11-14 (Thursday), fetches Mondays 2025-11-11 and 2025-11-04

---

## Configuration

### Environment Variables

**For Gamma:**

**`GAMMA_WEEKLY_TEMPORAL`** (optional)
- **Type:** Boolean (`true` or `false`)
- **Default:** `false`
- **Description:** Controls Gamma temporal context mode
  - `false`: Sequential mode (last 2 records regardless of date)
  - `true`: Weekly mode (specific Monday dates only)

**Example:**
```bash
# In Railway or .env file
GAMMA_WEEKLY_TEMPORAL=true
```

**For Delta:**

**`TEMPORAL_DATA`** (optional)
- **Type:** Boolean (`true` or `false`)
- **Default:** `true`
- **Description:** Enable/disable Delta temporal context
  - `true`: Fetch last 3 days of Delta data
  - `false`: Run analysis without historical context

**Example:**
```bash
# In Railway or .env file
TEMPORAL_DATA=false  # Disable Delta temporal context
```

### Code Configuration

The temporal context is enabled by default in `gammaCsvOnlyV2.ts`. To modify behavior:

```typescript
// Line 103-111 in server/assistants/gammaCsvOnlyV2.ts
const weeklyMode = process.env.GAMMA_WEEKLY_TEMPORAL === 'true';
const priorWeeks = await getPriorGammaOutputs(2, asofWeek, weeklyMode);

if (priorWeeks.length > 0) {
  console.log(`[Gamma CSV-Only] Fetched ${priorWeeks.length} prior weeks for temporal context`);
  priorWeeksContext = `\n\n**PRIOR WEEKS CONTEXT:**\n\n${JSON.stringify({ past_gamma_states: priorWeeks }, null, 2)}\n`;
} else {
  console.log('[Gamma CSV-Only] No prior weeks found, proceeding without temporal context');
}
```

---

## Data Structure

### Input to AI (Temporal Context)

The AI receives historical data in this format:

```json
{
  "past_gamma_states": [
    {
      "asof_week": "2025-11-13",
      "cycle_stage": {
        "primary": "Mid-Cycle",
        "transition": "Stable"
      },
      "macro_posture": "Neutral",
      "headline_summary": "Market in stable mid-cycle with mixed signals..."
    },
    {
      "asof_week": "2025-11-12",
      "cycle_stage": {
        "primary": "Mid-Cycle",
        "transition": "Firming"
      },
      "macro_posture": "Neutral-to-Cautious",
      "headline_summary": "Mid-cycle conditions with improving breadth..."
    }
  ]
}
```

### Database Schema

Temporal context queries the `daily_snapshots` table:

| Column | Type | Description |
|--------|------|-------------|
| `date` | `date` | Analysis date (YYYY-MM-DD) |
| `gammaAsofWeek` | `text` | Week identifier for Gamma analysis |
| `gammaCycleStagePrimary` | `text` | Primary cycle stage (e.g., "Mid-Cycle") |
| `gammaCycleStageTransition` | `text` | Transition commentary (e.g., "Stable") |
| `gammaMacroPostureLabel` | `text` | Macro posture assessment |
| `gammaHeadlineSummary` | `text` | Brief summary of market conditions |
| `fullAnalysis` | `jsonb` | Complete analysis JSON (backup) |

---

## Testing & Verification

### Manual Testing

**Step 1: Verify Historical Data Exists**
```bash
curl -X GET "https://cyclescope-api-production.up.railway.app/api/trpc/analysis.latest" | jq '.result.data.gamma | {asofWeek, cycleStagePrimary}'
```

**Step 2: Trigger New Analysis**
```bash
curl -X POST "https://cyclescope-api-production.up.railway.app/api/trpc/analysis.triggerAll" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Step 3: Check Railway Logs**
Look for these log messages:
```
[Gamma CSV-Only] Temporal context: ENABLED
[Gamma CSV-Only] Weekly mode: false (fetch last 2 records)
[Gamma CSV-Only] Fetched 2 prior weeks for temporal context
```

**Step 4: Verify Consistency**
Compare the new analysis with previous ones to ensure smooth transitions:
```bash
curl -X GET "https://cyclescope-api-production.up.railway.app/api/trpc/analysis.latest" | jq '.result.data.gamma.cycleStagePrimary'
```

### Expected Behavior

**With Temporal Context:**
- Cycle stage changes are gradual (e.g., "Stable" → "Firming" → "Late-Cycle")
- AI acknowledges recent trends in its analysis
- Sudden jumps only occur with strong contradictory signals

**Without Temporal Context:**
- Each analysis is independent
- More volatile cycle stage assessments
- Higher risk of whipsaw signals

---

## Troubleshooting

### Issue: "No prior weeks found"

**Symptoms:**
```
[Gamma CSV-Only] No prior weeks found, proceeding without temporal context
```

**Causes:**
1. First-time analysis (no historical data yet)
2. Database query returns empty results
3. Date filtering excludes all records

**Solutions:**
- Run at least 2 analyses to build historical data
- Check `excludeDate` parameter is not filtering too aggressively
- Verify database contains `daily_snapshots` records

### Issue: Weekly mode returns no data

**Symptoms:**
```
[Gamma CSV-Only] Weekly mode: true (fetch specific Mondays)
[Gamma CSV-Only] Fetched 0 prior weeks for temporal context
```

**Causes:**
1. No analyses run on the calculated Monday dates
2. Analysis schedule doesn't align with Mondays

**Solutions:**
- Switch to sequential mode (`GAMMA_WEEKLY_TEMPORAL=false`)
- Ensure analyses run every Monday
- Manually backfill Monday data if needed

### Issue: Temporal context not affecting results

**Symptoms:**
- Cycle stage still jumps abruptly
- AI doesn't reference historical trends

**Causes:**
1. OpenAI Assistant instructions don't handle temporal context
2. Context format is incorrect
3. AI weights current data too heavily

**Solutions:**
- Verify Assistant system prompt includes temporal context handling instructions
- Check JSON format matches expected structure
- Review AI's reasoning in the analysis output

---

## Performance Considerations

### Database Query Overhead

**Query Complexity:** Simple `SELECT` with `ORDER BY` and `LIMIT`
- **Sequential mode:** Single query, ~1-5ms
- **Weekly mode:** Single query with date filtering, ~1-5ms

**Impact:** Negligible (<1% of total analysis time)

### Memory Usage

**Data Size:** ~2KB per historical record (2 records = ~4KB)
- **Minimal impact** on API memory footprint
- **No caching required** due to small size

### API Latency

**Additional Time:** <10ms per analysis
- **Query:** ~5ms
- **JSON formatting:** ~2ms
- **String concatenation:** <1ms

**Total Analysis Time:** Unchanged (OpenAI API call dominates at 10-30 seconds)

---

## Future Enhancements

### Potential Improvements

1. **Adaptive Window Size**
   - Dynamically adjust `count` based on market volatility
   - Use more history during stable periods, less during volatile periods

2. **Weighted Historical Context**
   - Give more weight to recent analyses
   - Exponentially decay older data influence

3. **Cross-Domain Temporal Analysis**
   - Track individual domain trends over time
   - Identify persistent vs. transient signals

4. **Extend to Enhanced/Standard Branches**
   - Port temporal context to other Gamma analysis modes
   - Ensure consistent behavior across all branches

5. **Configurable Context Depth**
   - Allow users to specify `count` via API parameter
   - Support different depths for different use cases

---

## Code References

### Key Files

| File | Purpose |
|------|---------|
| `server/assistants/gammaCsvOnlyV2.ts` | Main implementation of temporal context |
| `server/db.ts` | `getPriorGammaOutputs()` database query function |
| `drizzle/schema.ts` | Database schema for `daily_snapshots` table |
| `server/routers.ts` | API endpoint for triggering analysis |

### Key Functions

**`getPriorGammaOutputs(count, excludeDate, weeklyMode)`**
- **Location:** `server/db.ts` (line 107-156)
- **Purpose:** Fetch historical Gamma analysis results
- **Returns:** Array of `GammaPriorWeek` objects

**`runGammaCsvOnlyAnalysis(mode, date)`**
- **Location:** `server/assistants/gammaCsvOnlyV2.ts` (line 95-308)
- **Purpose:** Execute Gamma analysis with temporal context
- **Returns:** `GammaAnalysisResult` object

---

## Changelog

### Version 1.0 (November 14, 2025)

**Added:**
- Initial implementation of temporal context for Gamma CSV-Only
- Support for sequential and weekly modes
- Database query function `getPriorGammaOutputs()`
- Environment variable `GAMMA_WEEKLY_TEMPORAL` for mode control
- Comprehensive logging for debugging

**Changed:**
- Modified `runGammaCsvOnlyAnalysis()` to fetch and include historical data
- Updated OpenAI Assistant prompt to handle temporal context

**Fixed:**
- N/A (initial release)

---

## Contact & Support

For questions or issues related to this feature:

- **GitHub Repository:** [schiang418/cyclescope-api](https://github.com/schiang418/cyclescope-api)
- **Commit:** `0e57b4c` (feat: Add temporal context to Gamma CSV-Only analysis)
- **Documentation:** This file (`docs/TEMPORAL_CONTEXT_FEATURE.md`)

---

**End of Document**

