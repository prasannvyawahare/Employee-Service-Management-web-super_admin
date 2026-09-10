---
name: build-panel-page
description: Use when building or modifying any page/route under src/app/(admin)/** in the fieldforce-admin-web project (Dashboard, Companies, Plans, Users, Sales, Account, or any future roadmap page from .claude/plan.md §7). Also use when asked to "build the next page," "continue the admin panel," or add a new admin-console screen. Ensures the page uses the correct DB/RPC shape, the shared design-system primitives, and the project's Server-Component/Server-Action data-flow pattern instead of improvising new ones.
---

# Building a page in fieldforce-admin-web

This project is a from-scratch Next.js port of an existing, fully-built Flutter Super Admin panel.
Nothing here is greenfield design — every page has a working reference implementation and a verified
DB/RPC shape already. The job is porting + a better UI system, not re-inventing the product.

## Before writing any code

1. **Read `.claude/plan.md`** — §3 for the exact table/RPC/column names this page touches, §4 for
   what's already built vs. not, §5 for where this page sits in the build order (build pages in that
   order; don't jump ahead to a later page while an earlier one is unverified).
2. **Read `.claude/spec.md`** — folder architecture, data-flow rules (Server Components for reads,
   Server Actions for writes), the design-token/component list, and the page pattern in its §6.
3. **Open the Flutter reference file** named in `plan.md` §5 for this page (e.g.
   `fieldforce/lib/features/super_admin/dashboard/super_admin_dashboard_screen.dart` for the
   Dashboard). Read the whole section, not just the query — copy its exact behavior for anything
   destructive or state-changing (confirm dialogs, double-confirmation deletes), its exact field
   labels, and its exact status/data shape. This repo's UI can look completely different; the
   *business logic and data shape* must not drift from the reference.
4. Check whether `src/components/ui/` already has the primitives this page needs (`Table`, `Badge`,
   `StatTile`, `ConfirmDialog`, etc. — full list in `spec.md` §5). Build any missing primitive there,
   not inline in the page, even if only one page uses it today — the next page will likely need it
   too since the whole console shares one design system.

## While building

- Follow `spec.md` §6's page shape exactly: `PageHeader` first, then a data-dependent
  loading/empty/error/content branch, then a route-level `loading.tsx` using `Skeleton`.
- Reads go directly in the async Server Component via `createClient()` from
  `src/lib/supabase/server.ts`. Writes go in a colocated `actions.ts` using `"use server"` — never
  fetch tenant data from a Client Component, never add a service-role key (`plan.md` §9 /
  `CLAUDE.md`).
- Reuse `lib/status.ts`'s tone maps for any `company_status` or `subscription_status` value — don't
  hardcode a color for a status anywhere else.
- Any action that changes access or is irreversible (Approve/Block/Suspend/Reactivate/Delete) must go
  through `ConfirmDialog`. Delete additionally requires the double-confirmation the Flutter reference
  uses (type-the-company-name) — check `company_detail_screen.dart` for the exact copy/flow before
  building `/companies/[id]`.
- Use the exact enum string values from `plan.md` §3 (`pending`/`approved`/`blocked`/`suspended`,
  `trial`/`active`/`payment_pending`/`expired`/`suspended`/`cancelled`) — never invent a status
  string.

## Before calling the page done

1. Run `npm run lint` and `npx tsc --noEmit` (or `npm run build`) — fix everything before moving on.
2. Start the dev server (`npm run dev`) and verify the page against the **real** Supabase project:
   log in as an actual super_admin, load the page, and exercise at least one real write path if the
   page has one. This mirrors `plan.md` §5's "verify each against the real project... before moving
   to the next" — don't mark a page done off a green typecheck alone.
3. If this page's data shape or a table/column turned out to differ from what `plan.md` §3 says,
   stop and update `plan.md` to match reality before continuing — don't let the plan drift out of
   sync with the code the way the old two-file setup did (see `plan.md`'s header for why it was
   merged from two files in the first place).
4. Update `CLAUDE.md`'s "Current state" pointer if this page moves the project from "not built" to
   "built" for a whole section.

## Common mistakes this skill exists to prevent

- Building a one-off styled component instead of checking `src/components/ui/` first — leads to the
  "pile of ad hoc Tailwind classes" outcome `spec.md`'s intro explicitly calls out.
- Fetching data client-side with `useEffect` — this project's pattern is Server Components; a
  client-side fetch is a sign the page was built without reading `spec.md` §2.
- Skipping the confirm-dialog step on a status change because "it's just a toggle" — every status
  change here has real access consequences (RLS gates on `company_is_active()`), so it is never
  "just a toggle."
- Adding a new npm dependency for something the native platform already does (modals, tables) —
  `spec.md` §5 deliberately uses native `<dialog>`/`<table>` instead of a UI library; don't reach for
  one without checking that section first.
