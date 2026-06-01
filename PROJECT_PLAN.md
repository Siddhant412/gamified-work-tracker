# Production Plan: Gamified Job Application Tracker

This document is the project source of truth. Implementation must follow this plan unless a change is explicitly approved by the project owner before implementation.

If implementation reveals that a product, architecture, scope, privacy, or data-model decision should change, pause and request approval before changing this document or implementing the changed behavior. Minor implementation details that preserve the intent of this plan can follow best practices without requiring a plan update.

## Summary

- Build a private MVP as one shared Expo + TypeScript app for iOS and web, backed by Supabase Auth, Postgres, and Row Level Security.
- V1 centers on immutable daily job-application counts, a GitHub/LeetCode-style activity heatmap, exact friend activity sharing, and a simple Kanban task board.
- The repo contains the shared Expo app, Supabase migrations, automated checks, and release scaffolding described below. Remaining work must preserve this plan unless a change is explicitly approved.

## Key Product And Architecture Decisions

- Use Expo Router for shared iOS/web routing, responsive layouts, deep links, and tab navigation. References: [Expo Router](https://expo.dev/router), [Expo iOS submit docs](https://docs.expo.dev/submit/ios/).
- Use Supabase for Google sign-in, Postgres data, generated TypeScript types, and RLS-protected client access. References: [Supabase Auth](https://supabase.com/docs/guides/auth), [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [React Native auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Keep V1 job tracking as daily aggregate counts only. No company/job records in V1, but schema names should leave room for a future detailed applications table.
- Accepted friends can see exact activity counts, totals, averages, and heatmaps. Task data stays private.
- Average applications per day means total applications divided by calendar days from `tracking_started_on` through today in the user’s saved timezone, including zero-count days.

## Core Interfaces And Data Model

- Tables: `profiles`, `daily_application_counts`, `friendships`, and `tasks`.
- `profiles`: user id, email, display name, avatar URL, timezone, tracking start date, timestamps.
- `daily_application_counts`: user id, local activity date, count, timestamps, unique `(user_id, activity_date)`, count must be `>= 0`.
- `friendships`: requester, addressee, status `pending | accepted | declined | blocked`, timestamps, unique normalized user pair.
- `tasks`: owner, title, notes, status `todo | doing | done`, priority, due date, sort order, timestamps.
- Use DB RPCs for sensitive mutations: `adjust_today_application_count(delta)`, `set_today_application_count(count)`, `find_profile_by_email(email)`, `send_friend_request(user_id)`, `respond_friend_request(request_id, action)`.
- Do not allow direct client updates to previous activity dates. The count RPC derives “today” from the user profile timezone and rejects past-date edits at the database layer.

## Implementation Plan

- Scaffold Expo TypeScript app with Expo Router, strict TypeScript, ESLint, formatting, env validation, Supabase client setup, and generated DB types.
- Build auth flow with Google OAuth, native deep linking, session persistence, protected routes, loading states, and sign-out.
- Build Home with three primary stat tiles, responsive activity heatmap, date-range control such as 3/6/12 months, today-only increment/decrement controls with press-and-hold repeat, direct numeric input for today’s count, optimistic updates, and empty/error states.
- Build heatmap as a reusable component with accessible labels, desktop hover tooltips, mobile press tooltips, selected-day detail, consistent green intensity thresholds with brighter tiers after 20 and 30 daily applications, and no previous-day editing affordance.
- Build Friends tab with exact email search, request/accept/decline flow, friend list, and friend activity profile view.
- Build Tasks tab as a simple Kanban board with create/edit/delete, search, filtering, sorting, priority, due date, notes, web drag-and-drop, and mobile-friendly status changes.
- Add Settings for profile basics, timezone display/change policy, privacy explanation, and account/session controls.
- Use a restrained custom design system: semantic colors, spacing tokens, reusable buttons/cards/sheets, polished dark/light support if practical, and responsive layouts optimized separately for phone and desktop web.

## Security, Quality, And Release

- Enable RLS on all public tables. Users can read/write their own profile, counts, and tasks; friends can read only accepted friends’ profile summary and activity counts.
- Never expose Supabase service-role keys in the client. Use exact OAuth redirect URLs for local, staging, production web, and native deep links.
- Add unit tests for date/timezone logic, stat calculations, heatmap bucketing, and RPC validation assumptions.
- Add integration tests for auth-protected data access, today-only count changes, friend visibility, and task CRUD.
- Add Playwright tests for web critical flows and Maestro smoke tests for iOS once the app shell is stable.
- Set up CI for typecheck, lint, tests, Supabase migration validation, and production builds. Deploy web to Vercel and iOS through EAS Build/TestFlight.

## Assumptions

- First launch target is private MVP, not public beta or App Store launch on day one.
- Initial platform scope is iOS and web only; Android can be added later with the same Expo foundation.
- Job application tracking is intentionally count-based in V1.
- Friends see exact application activity after an accepted friend request.
- Task management is simple Kanban in V1, not full Notion/Trello parity.
