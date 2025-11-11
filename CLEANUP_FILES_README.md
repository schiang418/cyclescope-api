# OpenAI Files Cleanup Utility

**Purpose**: Remove old files from OpenAI Files API to manage storage limits

---

## 📁 File

**Location**: `cleanup-openai-files.mjs`

---

## 🎯 Usage

### Preview (Dry Run)

See which files would be deleted without actually deleting them:

```bash
cd /home/ubuntu/cyclescope-api
export OPENAI_API_KEY="your-key"
node cleanup-openai-files.mjs --dry-run
```

### Actually Delete Files

Remove old files:

```bash
node cleanup-openai-files.mjs
```

---

## ⚙️ Configuration

Edit the script to change settings:

```javascript
const MAX_AGE_DAYS = 7;  // Delete files older than 7 days
```

**Recommended values**:
- **7 days**: For daily CSV uploads (keeps ~1 week of data)
- **30 days**: For monthly archives
- **1 day**: For testing/development

---

## 📊 Example Output

### Dry Run Mode

```
============================================================
OpenAI Files Cleanup Script
============================================================
Mode: DRY RUN (preview only)
Max age: 7 days
============================================================

📋 Fetching all files from OpenAI...
Found 7 files total

🗓️  Cutoff date: 2025-11-04T14:27:30.299Z
Files created before this date will be marked for deleted

📊 Summary:
   Old files (>7 days): 3
   Recent files (<=7 days): 4

🗑️  Old files to be delete:
------------------------------------------------------------
   file-1oiaqevEYqqwTyWenzQWkN
   ├─ Filename: image.png
   ├─ Created: 2025-11-04T07:14:21.000Z
   ├─ Age: 7 days
   └─ Size: 26.24 KB

============================================================
ℹ️  DRY RUN MODE - No files were deleted
   Run without --dry-run to actually delete files
============================================================
```

### Delete Mode

```
🗑️  Deleting old files...

   ✅ Deleted: file-1oiaqevEYqqwTyWenzQWkN (image.png)
   ✅ Deleted: file-J6XBkbFNDM5DGYJWDWFH1U (image.png)
   ✅ Deleted: file-EtPrEKW9xhS61z2CJoYbED (image.png)

============================================================
✅ Cleanup complete!
   Deleted: 3 files
   Failed: 0 files
   Remaining: 4 files
============================================================
```

---

## 🔄 Automation

### Option 1: Manual Cleanup

Run the script manually when needed:

```bash
# Every week
node cleanup-openai-files.mjs
```

### Option 2: Cron Job (Linux/Mac)

Add to crontab for automatic weekly cleanup:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 2 AM)
0 2 * * 0 cd /path/to/cyclescope-api && node cleanup-openai-files.mjs
```

### Option 3: GitHub Actions (Recommended for Railway)

Create `.github/workflows/cleanup-files.yml`:

```yaml
name: Cleanup OpenAI Files

on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node cleanup-openai-files.mjs
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Option 4: Integrate into Application

Add cleanup to your application startup or scheduled tasks:

```typescript
// server/tasks/cleanup.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function cleanupOldFiles() {
  try {
    const { stdout } = await execAsync('node cleanup-openai-files.mjs');
    console.log(stdout);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Run weekly
setInterval(cleanupOldFiles, 7 * 24 * 60 * 60 * 1000);
```

---

## 🛡️ Safety Features

### 1. Dry Run Mode

Always preview before deleting:

```bash
node cleanup-openai-files.mjs --dry-run
```

### 2. Age-Based Deletion

Only deletes files older than configured threshold (default: 7 days)

### 3. Detailed Logging

Shows exactly which files will be/were deleted:
- File ID
- Filename
- Creation date
- Age in days
- File size

### 4. Error Handling

Continues even if individual deletions fail

---

## 📋 File Lifecycle

### Daily CSV Uploads

```
Day 1: Upload 32 CSVs → 32 files
Day 2: Upload 32 CSVs → 64 files
...
Day 7: Upload 32 CSVs → 224 files
Day 8: Upload 32 CSVs + Cleanup → 224 files (Day 1 deleted)
```

**Steady state**: ~224 files (7 days × 32 files/day)

---

## ⚠️ Important Notes

### 1. Files Used by Assistants

OpenAI may prevent deletion of files currently attached to active threads. This is normal and safe.

### 2. Storage Limits

OpenAI has storage limits per account. Monitor usage at:
https://platform.openai.com/account/limits

### 3. Billing

File storage is usually free up to a limit, but check current pricing:
https://openai.com/pricing

### 4. Backup

If you need to keep historical data:
- Download CSVs before deletion
- Or increase `MAX_AGE_DAYS`

---

## 🔍 Troubleshooting

### Error: "OPENAI_API_KEY not set"

```bash
export OPENAI_API_KEY="your-key"
```

### Error: "404 status code"

Make sure the script uses the correct base URL:

```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',  // Must be OpenAI official API
});
```

### No Files Found

Check if files exist:

```bash
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer YOUR_KEY"
```

---

## 📊 Monitoring

### Check File Count

```bash
# Preview without deleting
node cleanup-openai-files.mjs --dry-run | grep "Found"
```

### Check Storage Usage

Visit OpenAI Platform:
https://platform.openai.com/account/usage

---

## 🎯 Best Practices

1. **Always dry-run first**: `--dry-run` to preview
2. **Regular schedule**: Weekly cleanup is recommended
3. **Monitor logs**: Check cleanup results
4. **Adjust retention**: Increase `MAX_AGE_DAYS` if needed
5. **Test in development**: Run manually before automating

---

## 📝 Related Files

- `cleanup-openai-files.mjs` - Cleanup script
- `csvUploader.ts` - CSV upload utility
- `test-csv-upload.mjs` - CSV upload tests

---

**Last Updated**: November 11, 2025

