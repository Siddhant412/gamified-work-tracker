# ApplyLoop

Production-oriented gamified job application tracker for web and iOS, built with Expo Router,
TypeScript, and Supabase.

`PROJECT_PLAN.md` is the source of truth for product, architecture, privacy, and data-model
decisions. Do not change those decisions without explicit approval.

## Current Implementation

- Shared Expo Router app for web and iOS.
- Home dashboard with total/today/average stats, activity heatmap, and a today-only counter.
- Friends tab with exact-email search flow, pending requests, and friend activity heatmaps.
- Tasks tab with a simple Kanban board and web drag-and-drop support.
- Settings tab with profile, timezone, backend mode, and privacy summary.
- Supabase client setup, typed database shape, and initial SQL migration with RLS/RPCs.
- Local preview mode when Supabase env values are not configured.

## Run Locally

```bash
npm install
npm run web
```

For Supabase-backed auth/data, copy `.env.example` to `.env.local` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_ENV=development
```

## Verification

```bash
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```
