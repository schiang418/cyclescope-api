# CycleScope API - Version History & Rollback Guide

## Quick Reference

### Current Version
**v1.0.0-pre-csv-only** (2025-11-13)
- Commit: `e0127c6`
- Status: ✅ Stable (pre CSV-Only implementation)

---

## Version Tags

### v1.0.0-pre-csv-only
**Created**: 2025-11-13  
**Commit**: `e0127c6`  
**Purpose**: Stable checkpoint before CSV-Only mode implementation

**Features**:
- Standard Mode (charts only)
- Enhanced Mode (charts + CSV)
- Gamma/Delta/Fusion analysis pipeline
- Railway production deployment

**Rollback Command**:
```bash
git checkout v1.0.0-pre-csv-only
```

---

## Rollback Procedures

### Emergency Rollback (Production Issue)

If production is broken and you need to rollback immediately:

```bash
# 1. Checkout the stable tag
cd /home/ubuntu/cyclescope-api
git checkout v1.0.0-pre-csv-only

# 2. Create a rollback branch
git checkout -b emergency-rollback-$(date +%Y%m%d)

# 3. Push to trigger Railway deployment
git push origin emergency-rollback-$(date +%Y%m%d)

# 4. Manually deploy on Railway Dashboard
# Go to Railway → cyclescope-api → Deployments → Select the rollback branch
```

### Planned Rollback (Testing Failed)

If new features don't work as expected:

```bash
# 1. Create a rollback branch from the tag
git checkout -b rollback-to-v1.0.0 v1.0.0-pre-csv-only

# 2. Push to GitHub
git push origin rollback-to-v1.0.0

# 3. Create a PR on GitHub
# Merge rollback-to-v1.0.0 → main

# 4. Railway will auto-deploy after merge
```

### Local Development Rollback

To test the old version locally:

```bash
# Checkout the tag (detached HEAD state)
git checkout v1.0.0-pre-csv-only

# Build and run
pnpm build
pnpm start

# To return to latest
git checkout main
```

---

## Version Comparison

### What's Different in Each Mode

| Feature | Standard | Enhanced | CSV-Only (Planned) |
|---------|----------|----------|-------------------|
| Gamma Charts | 18 | 18 | 0 |
| Gamma CSV | 0 | 18 | 18 |
| Delta Charts | 14 | 14 | 0 |
| Delta CSV | 0 | 14 | 14 |
| Cost per Analysis | $0.50 | $0.70 | $0.15 |
| Processing Time | 2-3 min | 2-3 min | 30-60 sec |
| Env Var | `false` | `true` | `csv_only` |

---

## Environment Variables by Version

### v1.0.0-pre-csv-only (Current)

```bash
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GAMMA_ASSISTANT_ID=asst_Ynyur2GgkCWgLKmuqiM8zIt2
DELTA_ASSISTANT_ID=asst_niipkh0HSLaeuPVwSsB7YO9B
FUSION_ASSISTANT_ID=asst_n5pAPgQbIwbSrFx76PgtEsPY

# Optional (defaults to false)
ENABLE_ENHANCED_ANALYSIS=false  # or 'true'
```

### v1.1.0 (Planned - CSV-Only Mode)

```bash
# All from v1.0.0 plus:
GAMMA_CSV_ASSISTANT_ID=asst_new_gamma_csv
DELTA_CSV_ASSISTANT_ID=asst_new_delta_csv

# Updated
ENABLE_ENHANCED_ANALYSIS=false  # or 'true' or 'csv_only'
```

---

## Deployment History

| Date | Version | Commit | Railway Deployment | Status |
|------|---------|--------|-------------------|--------|
| 2025-11-13 | v1.0.0-pre-csv-only | `e0127c6` | cyclescope-api-production | ✅ Stable |
| 2025-11-12 | - | `bad3a7c` | - | ✅ Working |
| 2025-11-11 | - | `c451727` | - | ✅ Working |

---

## Known Issues by Version

### v1.0.0-pre-csv-only

**Gamma Assistant**:
- ❌ Occasionally fails with `server_error`
- 🔍 Investigating: Instructions may be too long
- 🔧 Workaround: Retry analysis or simplify Instructions

**Delta Assistant**:
- ✅ Working reliably

**Fusion Assistant**:
- ✅ Working reliably

---

## Testing Checklist Before Tagging

Before creating a new version tag, ensure:

- [ ] All 3 analysis modes tested (Standard/Enhanced/CSV-Only)
- [ ] Railway deployment successful
- [ ] Database writes working
- [ ] Error handling tested
- [ ] Environment variables documented
- [ ] CHANGELOG updated
- [ ] Rollback procedure tested

---

## Contact & Support

**Repository**: https://github.com/schiang418/cyclescope-api  
**Railway**: https://railway.app/ (cyclescope-api project)  
**OpenAI Platform**: https://platform.openai.com/assistants

For rollback assistance, check the CHANGELOG.md or contact the development team.

