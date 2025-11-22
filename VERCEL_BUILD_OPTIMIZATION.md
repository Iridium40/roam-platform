# Vercel Build Optimization

## Problem

Previously, **every** Git commit triggered Vercel deployments across all three apps (admin, provider, customer), even when only documentation files (`.md`, `.txt`) were changed. This resulted in:
- ❌ Wasted build minutes
- ❌ Slower actual code deployments (queued behind doc updates)
- ❌ Unnecessary server restarts
- ❌ Inflated deployment history

## Solution

Implemented Vercel's `ignoreCommand` feature to skip builds when only documentation or configuration files change.

## Implementation

### Updated vercel.json Files

Added inline `ignoreCommand` using `git diff` to all three apps:

```json
"ignoreCommand": "if git diff HEAD^ HEAD --quiet -- . ':(exclude)*.md' ':(exclude)*.txt' ':(exclude).github/' ':(exclude).vscode/' ':(exclude)LICENSE'; then echo 'Only docs changed, skipping'; exit 1; else echo 'Code changed, building'; exit 0; fi"
```

Applied to:
- ✅ `roam-provider-app/vercel.json`
- ✅ `roam-customer-app/vercel.json`
- ✅ `roam-admin-app/vercel.json`

### How the Command Works

The command uses `git diff` with pathspec exclude patterns:
- `git diff HEAD^ HEAD` - Compare previous commit to current commit
- `--quiet` - Don't output diff, just return exit code
- `-- .` - Check current directory
- `':(exclude)*.md'` - Exclude markdown files from diff
- `':(exclude)*.txt'` - Exclude text files
- `':(exclude).github/'` - Exclude GitHub workflows
- `':(exclude).vscode/'` - Exclude VS Code settings
- `':(exclude)LICENSE'` - Exclude license file

**Logic**:
- If diff is empty (only excluded files changed) → exit 1 (skip build)
- If diff has changes (code files changed) → exit 0 (build)

## How It Works

```
Git Push
  ↓
Vercel Webhook Triggered
  ↓
Runs: bash ../scripts/vercel-ignore.sh
  ↓
Script checks: git diff HEAD~1 HEAD
  ↓
If ONLY .md, .txt, etc. changed:
  → Exit 1 (Skip Build) ✅
  
If ANY code files changed:
  → Exit 0 (Proceed with Build) 🚀
```

## Examples

### Scenario 1: Documentation Only
```bash
# Files changed:
- README.md
- APPLICATION_APPROVALS_IMPLEMENTATION.md
- VERCEL_BUILD_OPTIMIZATION.md

Result: ✅ Build SKIPPED
Reason: Only .md files changed
```

### Scenario 2: Code + Documentation
```bash
# Files changed:
- README.md
- roam-admin-app/api/approve-business.ts
- roam-admin-app/client/pages/AdminVerification.tsx

Result: 🚀 Build PROCEEDS
Reason: Code files (.ts, .tsx) were changed
```

### Scenario 3: Configuration Only
```bash
# Files changed:
- .vscode/settings.json
- LICENSE

Result: ✅ Build SKIPPED
Reason: Only config/license files changed
```

## Benefits

| Before | After |
|--------|-------|
| Every commit = 3 deployments | Only code commits = deployments |
| ~10 min per doc change × 3 apps | 0 min for doc changes |
| Queue congestion | Faster code deployments |
| Wasted build minutes | Optimized resource usage |

## Vercel Dashboard View

When a build is skipped, Vercel will show:
```
✓ Skipped
  Build was ignored via ignoreCommand
```

## Testing

To test the ignore logic locally:

```bash
# Test with doc-only changes (after committing)
git commit -m "Update docs"
if git diff HEAD^ HEAD --quiet -- . ':(exclude)*.md' ':(exclude)*.txt' ':(exclude).github/' ':(exclude).vscode/' ':(exclude)LICENSE'; then echo 'Skip build'; else echo 'Build'; fi
# Should output: "Skip build"

# Test with code changes (after committing)
git commit -m "Update code"
if git diff HEAD^ HEAD --quiet -- . ':(exclude)*.md' ':(exclude)*.txt' ':(exclude).github/' ':(exclude).vscode/' ':(exclude)LICENSE'; then echo 'Skip build'; else echo 'Build'; fi
# Should output: "Build"
```

## Files That Trigger Builds

Any changes to these will **still trigger deployments** (as they should):
- ✅ `.ts` / `.tsx` / `.js` / `.jsx` (code files)
- ✅ `.json` (config files like package.json, tsconfig.json)
- ✅ `.css` / `.scss` (stylesheets)
- ✅ `api/` directory (serverless functions)
- ✅ `client/` directory (frontend code)
- ✅ `server/` directory (backend code)
- ✅ `package.json` (dependencies)
- ✅ `vercel.json` (Vercel config)

## Files That Skip Builds

Changes to ONLY these files will **skip deployments**:
- ✅ `.md` (documentation)
- ✅ `.txt` (text files)
- ✅ `.github/` (GitHub Actions)
- ✅ `.vscode/` (editor config)
- ✅ `LICENSE` (license file)

## Important Notes

1. **Git vs Vercel**: `.md` files are still tracked in Git (as they should be), but Vercel deployments are skipped
2. **Safety First**: If the script can't determine changes, it proceeds with the build (fail-safe)
3. **Per-App**: Each app has its own ignore check (admin, provider, customer)
4. **Not Gitignore**: This is NOT the same as `.gitignore` - documentation is still version controlled

## Monitoring

To see which commits triggered builds vs were skipped:

1. Go to Vercel Dashboard → Your Project
2. View Deployments tab
3. Look for "Skipped" status with reason "Build was ignored via ignoreCommand"

## Rollback

If you need to disable this optimization:

```json
// Simply remove the "ignoreCommand" line from all vercel.json files
// Or change it to always build:
"ignoreCommand": "exit 0"
```

## Cost Savings

Assuming 5 documentation commits per week:

**Before**: 5 × 3 apps × 10 min = **150 build minutes/week**

**After**: 0 build minutes for doc commits = **150 min saved/week** = **~600 min/month**

That's **10 hours** of build time saved per month! 🎉

