# Enhanced Analysis Mode

## Overview

CycleScope now supports **Enhanced Analysis Mode**, which combines both **chart images** and **CSV numerical data** for more accurate market analysis.

---

## 🎯 Features

### Standard Mode (Charts Only)
- ✅ 18 charts for Gamma (weekly data)
- ✅ 14 charts for Delta (daily data)
- ✅ Vision API for chart analysis
- ✅ Lower cost (~$0.05 per analysis)

### Enhanced Mode (Charts + CSV Data)
- ✅ 18 charts + 18 CSV files for Gamma
- ✅ 14 charts + 14 CSV files for Delta
- ✅ Vision API + Text-embedded numerical data
- ✅ More accurate readings (exact values from CSV)
- ✅ Higher cost (~$0.15 per analysis)

---

## 🔧 Configuration

### Environment Variable

Control the mode using the `ENABLE_ENHANCED_ANALYSIS` environment variable:

```bash
# Enable Enhanced Mode (charts + CSV data)
export ENABLE_ENHANCED_ANALYSIS=true

# Use Standard Mode (charts only) - DEFAULT
export ENABLE_ENHANCED_ANALYSIS=false
# or simply don't set the variable
```

### Railway Deployment

Add the environment variable in Railway dashboard:
1. Go to your project settings
2. Navigate to "Variables" tab
3. Add: `ENABLE_ENHANCED_ANALYSIS` = `true`
4. Redeploy

---

## 📊 Technical Details

### CSV Data Processing

**For each indicator:**
1. Download CSV file from cyclescope-downloader
2. Extract first 2 rows (metadata + headers)
3. Extract last 20 rows (most recent data points)
4. Format as Markdown code block
5. Embed into message text (no file attachments)

**Example CSV structure:**
```
$CPCE,Daily
Date,Open,High,Low,Close,Volume
2025-10-15,0.65,0.65,0.65,0.65,0
...
2025-11-11,0.68,0.68,0.68,0.68,0
```

### Batch Processing

**Gamma (18 charts):**
- Batch 1: 1 text (with all CSV data) + 9 images
- Batch 2: 1 text + 9 images

**Delta (14 charts):**
- Batch 1: 1 text (with all CSV data) + 9 images
- Batch 2: 1 text + 5 images

### OpenAI Configuration

**Requirements:**
- ✅ Model: `gpt-4o` or `gpt-4o-mini`
- ✅ Code Interpreter: **DISABLED**
- ✅ Vision API: **ENABLED**

**Why disable Code Interpreter?**
- CSV data is embedded as text, not file attachments
- Code Interpreter causes crashes when processing multiple CSV attachments
- Text-embedded approach is more stable and reliable

---

## 🧪 Testing

### Test Enhanced Mode

```bash
cd /home/ubuntu/cyclescope-api
export OPENAI_API_KEY="your-key"
export ENABLE_ENHANCED_ANALYSIS=true

# Test Gamma Enhanced
npx tsx test-gamma-enhanced.mjs

# Test Delta Enhanced
npx tsx test-delta-enhanced.mjs
```

### Test Standard Mode

```bash
export ENABLE_ENHANCED_ANALYSIS=false

# Test Gamma Standard
npx tsx test-gamma.mjs

# Test Delta Standard
npx tsx test-delta.mjs
```

---

## 📈 Performance Comparison

| Metric | Standard Mode | Enhanced Mode |
|--------|--------------|---------------|
| **Accuracy** | Good (visual only) | Excellent (visual + numerical) |
| **Cost per run** | ~$0.05 | ~$0.15 |
| **Processing time** | ~20-30 seconds | ~30-40 seconds |
| **Token usage** | ~7K tokens | ~10K tokens |
| **Data sources** | Charts only | Charts + CSV |

---

## 🚀 Deployment Checklist

- [ ] Set `ENABLE_ENHANCED_ANALYSIS=true` in Railway
- [ ] Verify OpenAI Assistant configuration:
  - [ ] Code Interpreter: **DISABLED**
  - [ ] Model: `gpt-4o-mini` or `gpt-4o`
- [ ] Test both Gamma and Delta Enhanced
- [ ] Monitor costs and performance
- [ ] Update API documentation

---

## 🔍 Troubleshooting

### Issue: "Sorry, something went wrong"

**Cause**: Code Interpreter is enabled  
**Solution**: Disable Code Interpreter in OpenAI Assistant settings

### Issue: "400 Invalid 'content': array too long"

**Cause**: Too many elements in content array  
**Solution**: Already fixed with batch processing (9+9 for Gamma, 9+5 for Delta)

### Issue: High token usage

**Cause**: Enhanced mode uses more tokens  
**Solution**: 
- Use `gpt-4o-mini` instead of `gpt-4o` (3x cheaper)
- Or switch back to Standard mode: `ENABLE_ENHANCED_ANALYSIS=false`

---

## 📝 Files Modified

```
server/assistants/
├── gamma.ts              # Added env variable check
├── gammaEnhanced.ts      # New: Enhanced version with CSV
├── delta.ts              # Added env variable check
├── deltaEnhanced.ts      # New: Enhanced version with CSV
├── csvUploader.ts        # Existing: CSV file upload (not used in Enhanced)
└── csvTextEmbedder.ts    # New: CSV text embedding utility
```

---

## 💡 Best Practices

1. **Use Enhanced mode for production** - More accurate analysis
2. **Use Standard mode for testing** - Lower cost during development
3. **Monitor token usage** - Enhanced mode uses ~3x more tokens
4. **Keep Code Interpreter disabled** - Required for stability
5. **Use gpt-4o-mini** - Good balance of quality and cost

---

## 📚 References

- [OpenAI Vision API Documentation](https://platform.openai.com/docs/guides/vision)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)
- [CycleScope Downloader](https://cyclescope-downloader-production.up.railway.app/)

---

**Version**: 1.0  
**Last Updated**: 2025-11-11  
**Author**: CycleScope Team

