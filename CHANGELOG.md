# Changelog

All notable changes to the CycleScope API project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- CSV-Only analysis mode implementation
- Separate OpenAI Assistants for CSV-Only mode
- Refactored mode selection logic

---

## [v1.0.0-pre-csv-only] - 2025-11-13

### Summary
Stable version before implementing CSV-Only analysis mode. This tag serves as a rollback point.

### Features
- ✅ **Standard Mode**: Chart-only analysis (Gamma: 18 charts, Delta: 14 charts)
- ✅ **Enhanced Mode**: Charts + CSV data analysis (opt-in via `ENABLE_ENHANCED_ANALYSIS=true`)
- ✅ **Gamma Analysis**: 6-domain market cycle stage classification
- ✅ **Delta Analysis**: 4-dimension pattern template matching
- ✅ **Fusion Analysis**: Synthesis of Gamma + Delta insights
- ✅ **Railway Deployment**: Production-ready with PostgreSQL database
- ✅ **tRPC API**: Type-safe API endpoints
- ✅ **Async Processing**: Background analysis with status tracking

### Technical Details
- **Commit**: `e0127c6` - Fix: Add tool_choice=none, response_format, and temperature to prevent Gamma Assistant crashes
- **Environment Variables**:
  - `ENABLE_ENHANCED_ANALYSIS`: `false` (Standard) | `true` (Enhanced)
  - `GAMMA_ASSISTANT_ID`: OpenAI Assistant for Gamma analysis
  - `DELTA_ASSISTANT_ID`: OpenAI Assistant for Delta analysis
  - `FUSION_ASSISTANT_ID`: OpenAI Assistant for Fusion synthesis

### Fixed
- Added `tool_choice: "none"` to prevent OpenAI Assistant initialization crashes
- Added `response_format: { type: "json_object" }` to enforce JSON output
- Added `temperature: 0` for consistent analysis results
- Improved error handling in Delta Standard Mode

### Known Issues
- Gamma Assistant occasionally fails with `server_error` (investigating Instructions length)
- Delta Assistant working reliably

---

## Rollback Instructions

### To rollback to this version:

```bash
# Option 1: Create a new branch from this tag
git checkout -b rollback-to-v1.0.0 v1.0.0-pre-csv-only

# Option 2: Reset main branch (⚠️ destructive)
git checkout main
git reset --hard v1.0.0-pre-csv-only
git push origin main --force

# Option 3: View files at this version (read-only)
git checkout v1.0.0-pre-csv-only
```

### To deploy this version on Railway:

```bash
# Checkout the tag
git checkout v1.0.0-pre-csv-only

# Push to Railway (if Railway remote is configured)
git push railway HEAD:main --force

# Or commit and push to main to trigger Railway auto-deploy
git checkout -b deploy-v1.0.0
git push origin deploy-v1.0.0
# Then merge via GitHub PR
```

---

## Version History

| Version | Date | Commit | Description |
|---------|------|--------|-------------|
| v1.0.0-pre-csv-only | 2025-11-13 | `e0127c6` | Stable version before CSV-Only mode |

---

## Next Steps

### v1.1.0 (Planned)
- [ ] Create CSV-Only OpenAI Assistants (Gamma + Delta)
- [ ] Implement `gammaCsvOnly.ts` and `deltaCsvOnly.ts`
- [ ] Update mode selection logic to support 3 modes
- [ ] Add `GAMMA_CSV_ASSISTANT_ID` and `DELTA_CSV_ASSISTANT_ID` env vars
- [ ] Support `ENABLE_ENHANCED_ANALYSIS=csv_only`
- [ ] Write CSV-Only mode documentation
- [ ] Test all 3 modes in production
- [ ] Update ENHANCED_MODE_ARCHITECTURE.md

---

## Contact

For questions or issues, please contact the development team or open an issue on GitHub.

**Repository**: https://github.com/schiang418/cyclescope-api

