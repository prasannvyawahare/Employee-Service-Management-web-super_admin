@AGENTS.md

# CLAUDE.md

Orientation for Claude Code sessions in this repo. Depth lives in `.claude/plan.md` — read it before
writing any page. UI/component architecture and Tailwind conventions live in `.claude/spec.md`; the
page-building workflow that applies both is `.claude/skills/build-panel-page/SKILL.md`.
`.claude/implementation-plan.md` and `.claude/super-admin-management-plan.md` are superseded by
`plan.md` and kept only as historical snapshots — don't treat them as current.

## What this project is

The Super Admin console for the **Fieldforce** Employee & Service Management SaaS platform,
rebuilt as a standalone Next.js app so admin-panel changes deploy independently of the Flutter
mobile app (no more rebuilding/re-uploading the APK just to tweak a dashboard screen).

- **Sibling project**: `../fieldforce` is the existing Flutter app (mobile + its Super Admin panel
  today, at `fieldforce/lib/features/super_admin/`). It is **not being deleted or modified** — this
  project is an additive, independent frontend against the same backend. Treat
  `fieldforce/lib/features/super_admin/**` and `fieldforce/lib/core/services/super_admin_service.dart`
  as the reference implementation for exact query/RPC shapes when building each page here.
- **Same backend, zero schema changes**: both apps point at the same Supabase project
  (`https://cqasjtnivntppccqokzj.supabase.co`). Every table/RPC this console needs already exists
  and is already scoped by `(auth.jwt()->'app_metadata'->>'role') = 'super_admin'` in RLS — that
  check is backend-agnostic. **Do not add or modify anything under a `supabase/` folder from this
  project** — there isn't one here on purpose; all schema/RLS lives in `fieldforce/supabase/migrations/`.
  If a page here seems to need a schema change, that's a signal to stop and check
  `fieldforce/supabase/migrations/` first, not to add a migration from this repo.

## Stack

Next.js (App Router) + TypeScript + Tailwind + `@supabase/supabase-js` + `@supabase/ssr`. Server
Components by default; only mark a file `"use client"` when it actually needs interactivity/state
(forms, buttons with handlers) — see `src/app/login/page.tsx` and
`src/app/(admin)/sign-out-button.tsx` for that split already in place.

## Auth — already wired, reuse it, don't rebuild it

- `src/lib/supabase/client.ts` — browser client (Client Components).
- `src/lib/supabase/server.ts` — server client (Server Components/Route Handlers), cookie-backed.
- `src/middleware.ts` — runs on every request: refreshes the session and enforces the
  `super_admin`-only boundary (redirects anyone else to `/login`). This mirrors
  `fieldforce/lib/core/router/app_router.dart:161-163`'s route guard — same JWT field, same rule,
  different router.
- `src/app/login/page.tsx` — working sign-in form (`signInWithPassword`) against the same
  `auth.users` the Flutter app uses.
- **Never add a service-role key to this project.** This app only ever needs the anon key — a
  signed-in super_admin already gets full access through RLS. A service-role key here would bypass
  RLS entirely and isn't needed for anything currently planned.

## Current state

Frontend parity is done — all 7 pages from `.claude/plan.md` §5 are built (Dashboard, Companies
list + detail, Plans, Users, Sales, Account), each verified to build/lint/render cleanly. What's left
is `.claude/plan.md` §7's product roadmap (trial automation, sales pipeline, subscription lifecycle,
billing, etc.) — none of that is required reading before touching an existing page, only before
starting a new roadmap item. See `.claude/plan.md` §4 for the full current-state breakdown.

## Working style

- New roadmap work (`.claude/plan.md` §7) still follows the same incremental discipline: verify each
  change against the real Supabase project before moving to the next, same as `fieldforce`'s own
  screen migrations.
- Reuse the exact table/column names and RPC signatures documented in `.claude/plan.md` §3 — verified
  against the live migrations in `fieldforce/supabase/migrations/`, not guessed.
- Follow `.claude/spec.md` for component structure, Tailwind theme tokens, and UI patterns
  (tables, dialogs, empty/loading states) so every page looks and behaves like one system — reuse
  `src/components/ui/` primitives rather than hand-rolling new ones.
