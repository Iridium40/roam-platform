# Customer App Deployment Debug Notes

This file exists to ensure a content change is present for troubleshooting skipped Vercel builds.

If builds are being skipped, confirm:
1. Project is linked to its own Git repo path correctly.
2. Root directory setting in Vercel project is set to `roam-customer-app` (NOT repository root) if using monorepo auto detection.
3. Build Command: `npm run build` (should run shared build + client + server).
4. Output Directory: `dist/spa`.
5. Install Command: leave default (Vercel will run `npm install`).
6. Ensure no `.vercelignore` is excluding required source files (current file keeps some docs excluded but preserves API & client code).
7. Check if previous successful deploy used a different framework detection (e.g. Next.js). Removing `next` dependency prevents mis-detection.
8. If still skipped, trigger a manual build with `vercel --prod --force` from the `roam-customer-app` directory.
