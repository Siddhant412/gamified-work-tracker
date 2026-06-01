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
EXPO_PUBLIC_FORCE_DEMO_MODE=
```

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e:install
npm run test:e2e
npm run supabase:start
npm run test:db
npm run db:types:check
npm run supabase:stop
npx expo export --platform web
```

Regenerate `src/types/database.ts` after a migration changes the database contract:

```bash
npm run db:types
```

## iOS OAuth And Smoke Tests

The stable native OAuth redirect for iOS development and production builds is:

```text
applyloop:///
```

Add these Supabase Auth redirect allow-list entries before testing Google login on iOS:

```text
applyloop:///
applyloop:///**
```

Expo Go uses temporary `exp://...` URLs, so use a development build or TestFlight build for a
real Google OAuth deep-link test.

Print the expected auth URLs:

```bash
npm run auth:redirects
```

Build and install a deterministic local-preview iOS app for Maestro:

```bash
npm run ios:demo:iphone16
```

Install Maestro if needed:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Run the iOS smoke suite:

```bash
npm run test:maestro:ios
```

The smoke suite verifies the native deep-link scheme, local preview sign-in, dashboard counter,
task create/move, friend accept, settings redirect display, and sign-out.
