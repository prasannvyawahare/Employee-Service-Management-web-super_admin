# Fieldforce Admin Web — Master Plan

Single canonical planning file for this project. **Supersedes** `.claude/implementation-plan.md`
and `.claude/super-admin-management-plan.md` — those two files are kept only as historical
snapshots (frontend-porting plan and product-roadmap doc, written in separate sessions) and are not
maintained further; treat this file as the merge of both, with the stale cross-reference the old
files had to each other (`implementation-plan.md §21 "Razorpay is Phase 7"` — that section no longer
exists in either source file) resolved by folding everything into one document. Depth on UI/component
architecture lives in `.claude/spec.md`; the page-building workflow that operationalizes both is
`.claude/skills/build-panel-page/SKILL.md`. Re-verify anything schema-related against
`fieldforce/supabase/migrations/` before trusting it if this file is more than a session old.

---

## 1. Purpose

Rebuild the existing Flutter Super Admin panel (`fieldforce/lib/features/super_admin/`) as a
standalone Next.js app, so admin-panel changes ship independently of the Flutter app's build/release
cycle — no more rebuilding/re-uploading the mobile app just to change a dashboard screen.

**The Flutter app is not being touched.** It keeps its own Super Admin screens exactly as they are;
this project is an additive second frontend against the same backend, not a replacement (yet — if
`fieldforce/lib/features/super_admin/` is ever removed, that's a separate, later decision made once
this project has full parity, not part of building this project).

## 2. Why zero schema/RLS changes are needed

Both apps point at the same Supabase project: `https://cqasjtnivntppccqokzj.supabase.co` (see
`fieldforce/lib/core/services/supabase_service.dart:13-24`; same URL/anon key already in this
project's `.env.local`).

Every table/RPC the Super Admin panel touches is already scoped purely by the JWT's
`app_metadata.role` claim, e.g.:

```sql
-- fieldforce/supabase/migrations/00039_plans_catalog_and_users_rls.sql
CREATE POLICY "super_admin_manage_plans" ON public.plans
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt()->'app_metadata'->>'role') = 'super_admin')
  ...
```

That evaluates identically regardless of which client library sent the request. The
`super_admin_platform_stats()` / `super_admin_delete_company()` RPCs are both `SECURITY DEFINER` and
re-check the caller's role internally, so they work the same way too. **Nothing under
`fieldforce/supabase/` needs to change to reach frontend parity (§5).** If a page here seems to need
a new column/table/policy, stop and check `fieldforce/supabase/migrations/` first — it may already
exist under a different name. Genuinely new schema work only shows up once the roadmap in §7 starts
(e.g. a `leads` table, `subscription_history`) — and even then it's added to
`fieldforce/supabase/migrations/`, never to a `supabase/` folder in this repo (there isn't one here
on purpose).

## 3. Database reference (verified against `fieldforce/supabase/migrations/`)

| Table/RPC | Defined in | Key columns / notes |
|---|---|---|
| `companies` | `00002_core_tables.sql` | `id, name, owner_name, email, mobile, address, logo_url, brand_color, gst_number, employee_limit` (legacy fallback), `status` (`company_status`: pending/approved/blocked/suspended), `company_code`, `razorpay_customer_id` (not yet added — see §6) |
| `subscriptions` | `00002_core_tables.sql` | `company_id` (UNIQUE — one per company), `plan` (`subscription_plan`: basic/professional/enterprise), `status` (`subscription_status`: trial/active/payment_pending/expired/suspended/cancelled), `start_date`, `expiry_date`, `trial_end_date`, `employee_limit`, `payment_status`, `amount`, `razorpay_subscription_id` (column exists, unused — no billing wired yet) |
| `plans` + `plan_features` | `00039_plans_catalog_and_users_rls.sql` | Pricing/feature-bundle **catalog** for sales pitches — `name, description, price, billing_period (monthly/yearly), is_active`. Deliberately **not** wired to `subscriptions.plan` or `company_features` automatically — applying a plan's features to a company is today a manual action (edit `subscriptions.plan` + toggle `company_features` individually). No "apply this plan to this company" button exists yet — see §7.3. |
| `features` + `company_features` | `00034_feature_catalog_and_entitlements.sql` | Feature catalog (`key, label, category: core/optional`) + per-company on/off (`company_id, feature_key, enabled`, unique per pair). `company_is_active()` / `company_has_feature()` SQL functions (SECURITY DEFINER) are the canonical way to check these — same functions RLS itself uses. |
| `user_profiles` | `00002_core_tables.sql`, cross-tenant read widened in `00039` | `id (= auth.users id), company_id, role, full_name, email, mobile, is_active`. The Users directory reads this joined to `companies(name)`. |
| `super_admin_platform_stats()` RPC | `00037_feature_gate_and_status_rls.sql` | Returns `total_companies, pending_companies, approved_companies, blocked_companies, suspended_companies, total_employees`. Raises if caller isn't `super_admin`. |
| `super_admin_delete_company(p_company_id)` RPC | `00038_super_admin_delete_company.sql` | Irreversible — also removes `user_profiles`/`auth.users` rows for that company (no FK cascade covers those). Always confirm in the UI before calling. |

Enums (from `00001_extensions_and_enums.sql`): `company_status`, `subscription_status`,
`subscription_plan` — use these exact string values, not invented ones.

**Design decision to not misread:** `plans`/`plan_features` is a sales sheet you show a prospect —
creating one does not apply anything to any company. See §7.3 for the proposed "apply plan to
company" action that doesn't exist yet.

## 4. What's already built

### 4.1 This project (Next.js) — scaffolding only so far

- Next.js App Router + TypeScript + Tailwind v4 (`create-next-app` defaults, `@tailwindcss/postcss`).
- `@supabase/supabase-js` + `@supabase/ssr` installed; `.env.local` filled in with the shared
  project's URL/anon key.
- `src/lib/supabase/client.ts` / `server.ts` — browser/server client factories.
- `src/middleware.ts` — session refresh + `super_admin`-only route guard (non-super_admin or
  logged-out users redirected to `/login`; a signed-in super_admin hitting `/login` is bounced to
  `/`).
- `src/app/login/page.tsx` — working email/password sign-in form.
- `src/app/(admin)/layout.tsx` — polished sidebar shell (`src/components/layout/Sidebar.tsx` +
  `NavLink.tsx`) with six nav links (Dashboard/Companies/Plans/Sales/Users/Account) +
  `sign-out-button.tsx`.
- Design-system primitives in `src/components/ui/` (Button, Card, Badge, StatTile, PageHeader,
  EmptyState, Skeleton, Table family, ConfirmDialog, Banner, Field (Input/Select/Textarea/Label),
  Checkbox, Avatar) per `.claude/spec.md` §5.
- **All 7 pages in §5 are built**: Dashboard (`/`), Companies list (`/companies`), Companies detail
  (`/companies/[id]`), Plans (`/plans`), Users (`/users`), Sales (`/sales`), Account (`/account`) —
  each with a route-level `loading.tsx` skeleton and, where they write data, a colocated
  `actions.ts` of Server Actions. Frontend parity with the Flutter reference is done; §7's roadmap
  items are the only remaining work.

### 4.2 Reference implementation (`fieldforce/lib/features/super_admin/`) — fully built, source of truth

Five sections via `side_nav.dart`: **Overview**, **Companies**, **Sales**, **Users**, **Plans**
(+ **Account** as a sixth, not in `side_nav.dart` but present in the dashboard screen).

- **Overview** — `super_admin_platform_stats()` RPC. 5 stat tiles: Total companies, Pending
  approval, Approved, Blocked/Suspended (combined), Total employees — each an icon-in-circle +
  big number + label card (`_StatTile` in `super_admin_dashboard_screen.dart:251-289`).
- **Companies** — list (`company_card.dart`) → `CompanyDetailScreen`, one batched Save for
  subscription `plan` + `employee_limit`, `company_features` toggles, and `companies.status` via
  `CompanyStatusActions` (Approve / Block / Suspend / Reactivate, each behind a confirm dialog).
  Double-confirmation **hard delete** (`super_admin_delete_company` RPC).
- **Sales** (`sales_section.dart`) — deliberately real-data-only: sums `subscriptions.amount` as
  "recorded revenue" (currently ~$0, no payment collection yet) plus status/plan distribution. A
  metrics view, not a pipeline/CRM — see §7.2 for what a real one would need.
- **Users** — cross-tenant `user_profiles` directory (name/email/mobile/role/is_active/company),
  read-only.
- **Plans** (`plans_section.dart`) — full CRUD on the `plans` sales-sheet catalog.
- **Account** — own profile (`full_name` update) + password change (`supabase.auth.updateUser`).

### 4.3 What's enforced server-side today (real, not just UI)

- **Employee limit**: `trg_enforce_employee_limit` (00005) fires on `employees` insert, reads
  `COALESCE(subscriptions.employee_limit, companies.employee_limit)` — a real hard cap.
- **Company status lockout**: 00037 gates tenant RLS on `company_is_active()` — a
  `blocked`/`suspended` company's users lose access on their next router pass.
- **Feature entitlement gating**: `company_has_feature()` (00034), usable from RLS and client UI.
- **Tenant isolation**: `super_admin_companies` / `super_admin_subscriptions` /
  `super_admin_company_features` policies (`FOR ALL`, `role = 'super_admin'`).

### 4.4 Onboarding today: self-registration only

No Super-Admin-initiated "create a company + admin account" flow exists. The only path to a new
tenant is `company_registration_screen.dart` (prospect self-signs-up, `handle_new_user` trigger
(00007) creates the company row). Super Admin's only lever afterward is approving/editing what
already self-created — deliberate chicken-and-egg workaround, not an oversight. See §7.1.

### 4.5 Free trial: schema exists, nothing runs it

`subscriptions.status = 'trial'` and `trial_end_date` are real, set on registration (00036 backfill
+ 00007). Nothing reads `trial_end_date` to flag or auto-transition an expired trial — no cron, no
Edge Function, no client-side check gates access at expiry. `pg_cron`/`pg_net` are unavailable on
the current Supabase free tier (the actual blocker). See §7.4.

## 5. Page-by-page build order (this project, frontend parity)

Build in this order — Companies first because it's used daily; verify each against the real project
(real login, real read, at least one real write) before moving to the next. Every page follows the
component architecture and patterns in `.claude/spec.md`.

1. **`/` (Dashboard)** — `super_admin_platform_stats()` RPC, 5 stat tiles (§4.2).
2. **`/companies`** — list + search/status-filter. Query: `companies.select('*, subscriptions(*)')`
   ordered by `created_at desc`. Reference: `_CompaniesSection` + `company_card.dart` +
   `SuperAdminService.fetchAllCompanies()`.
3. **`/companies/[id]`** — detail/edit: plan + employee_limit (writes `subscriptions`), feature
   entitlements (`company_features` upsert), status actions (approve/block/suspend/reactivate →
   `companies.status`), delete (`super_admin_delete_company()` RPC, behind a
   type-the-company-name confirmation). Copy the exact confirmation-dialog behavior for
   Block/Suspend/Delete from `company_detail_screen.dart` + `company_status_actions.dart` — these
   are destructive/access-affecting.
4. **`/plans`** — CRUD over `plans` + `plan_features`. Reference: `plans_section.dart` +
   `fetchPlans`/`createPlan`/`updatePlan`/`deletePlan` in `super_admin_service.dart`.
5. **`/users`** — cross-tenant `user_profiles` directory (`select('id, full_name, email, mobile,
   role, is_active, companies(name)')`). Reference: `users_section.dart`.
6. **`/sales`** — still a placeholder in the Flutter app too (sums `subscriptions.amount`, $0 until
   real billing exists — don't invent numbers here either). Reference: `sales_section.dart`.
7. **`/account`** — own profile update + password change (`supabase.auth.updateUser`). Reference:
   `_AccountSection`.

## 6. Explicitly out of scope for frontend parity (for now)

A separate, larger initiative exists for a full SaaS launch — Razorpay billing, a public marketing
site, self-serve signup, a sales-team panel. None of that is required to get the Super Admin panel
off the Flutter release cycle, which is §5's actual goal. §7 below is that larger initiative's
roadmap, kept in this same file instead of a separate doc so the cross-reference never goes stale
again. Notable related facts:

- `subscriptions.razorpay_subscription_id` column already exists and is unused.
- An `invoices` table does not exist yet in `fieldforce/supabase/migrations/`.
- `companies.razorpay_customer_id` / `plans.razorpay_plan_id` do not exist yet either.

Treat §7 as a distinct future initiative layered onto this project once the seven pages in §5 are
done, not a prerequisite for them.

## 7. Product roadmap (beyond frontend parity)

Ordered by dependency, not necessarily priority — read top-to-bottom as a buildable sequence, but
pick the starting point that matches actual business pressure (probably 7.4 trial-expiry
enforcement or 7.1 admin-registration, since both are one Edge Function / one screen away and don't
need Razorpay). See §8 for the recommended build sequence.

### 7.1 Super-Admin-initiated company + admin registration

Add a "Create company" flow on the Companies section that:
- Creates the `companies` row directly (status `approved` by default — skips the self-serve
  `pending` step a sales-assisted signup shouldn't need).
- Creates the admin's `auth.users` row via `supabase.auth.admin.createUser()` (needs the **service
  role**, so this must go through an Edge Function, never the client directly — this project's
  client never holds the service key) and matching `user_profiles`/`employees` rows, reusing the
  same shape `handle_new_user` (00007) already produces.
- Sends the new admin their credentials — needs actual email delivery, which nothing in either repo
  does yet (Supabase's default auth emails, or a transactional email provider).
- Assigns a plan/employee_limit/trial length at creation time instead of 00007's fixed defaults.

New surface: one Edge Function (`create-company-admin`) in `fieldforce/supabase/`, one dialog/screen
on this project's Companies section.

### 7.2 Sales as a real pipeline, not just a metrics view

Current `sales_section.dart` (and its future `/sales` port) is intentionally metrics-only. A real
sales/CRM-lite layer would add:
- `leads` table: prospect contact info, source, assigned sales owner (a `user_profiles` row with a
  new `sales` role, or a `sales_owner_id` on `companies` if kept simple), stage
  (`new`/`contacted`/`demo`/`negotiating`/`won`/`lost`), notes, next-follow-up-date.
- Convert-to-company action: a won lead becomes a `companies` row via the 7.1 flow, carrying the
  lead's chosen plan forward.
- A pipeline board view (kanban by stage) alongside the existing metrics.

Biggest net-new surface in this roadmap — confirm scope with the user before starting, since "sales"
could mean anything from this full CRM down to just a `sales_owner` column.

### 7.3 Subscription lifecycle CRUD (beyond edit-in-place)

Today "editing a subscription" is two fields (`plan`, `employee_limit`) overwritten in place, no
history. A real lifecycle needs:
- `subscription_history` table (or an `audit_logs` entry per change — that table exists, unused)
  recording who changed what, when, and why.
- Explicit lifecycle actions instead of silent overwrites: **Renew** (push `expiry_date` forward,
  `status → active`), **Upgrade/Downgrade plan** (apply the *catalog* `plans` row's bundled features
  to `company_features` in one step — the missing "apply plan to company" link from §3), **Cancel**
  (`status → cancelled`, does not touch `companies.status` — different concepts; Super Admin may
  want a company to stay `approved` during a plan lapse for a grace period).
- Proration stays out of scope until real billing (7.6) exists.

### 7.4 Free trial automation

Closes §4.5. Needs, in order:
1. A `check-trial-expiry` Edge Function that flips `subscriptions.status` from `trial` to `expired`
   past `trial_end_date`, invoked by an external scheduler hitting the function's URL (works on any
   tier, no `pg_cron` dependency — the pragmatic unblock for the free-tier limitation).
2. Client-side/RLS enforcement once expired: extend `company_is_active()` (00034) or the 00037
   status-lockout policy to also gate on subscription status — currently independent gates.
3. Super Admin actions: **Extend trial** (push `trial_end_date`), **Convert to paid** (`status →
   active`, `plan`, `expiry_date`).
4. A visible countdown/badge on the company card/detail for trial companies nearing expiry (≤3 days).
5. Configurable default trial length (currently hardcoded in 00007's trigger) — expose via §7.8.

### 7.5 Activation/deactivation governance

Approve/Block/Suspend/Reactivate (§4.3) work but are unaudited and unscheduled:
- Log every status change to `audit_logs` (exists, unused) with actor, timestamp, from/to status,
  and an optional reason string (add a reason field to the existing confirm dialog).
- Scheduled deactivation ("suspend this company on 2026-10-01") — needs the same scheduler
  dependency as 7.4, build after that lands.
- Surface the audit trail on `/companies/[id]` (plain reverse-chronological list, no new UI pattern).

### 7.6 Billing (Razorpay) — deferred by design

Deliberately deferred, manual billing for now. Once started, this turns 7.1/7.3's "assign a plan"
into an actual charge, and `/sales`'s "$0 recorded revenue" caption into real numbers. Build 7.3's
lifecycle actions first so Razorpay integration has real state-machine hooks to call into, rather
than retrofitting both at once.

### 7.7 Employee-limit governance beyond the hard cap

The trigger-enforced cap (§4.3) works but is invisible until an admin hits it and their insert
fails:
- Show current usage vs. limit on the company card/detail (e.g. "8 / 10 employees") — a plain
  `COUNT(*) FROM employees WHERE company_id = ...` query, no schema change.
- Warn the company admin's own dashboard near the limit (≥90%) — currently only the trigger's hard
  failure communicates this.
- Per-plan default employee limits in the `plans` catalog (currently no `employee_limit` column
  there) so assigning a plan via 7.3 sets a sensible default.

### 7.8 Platform configuration center

- Default trial length (7.4), default employee limit for a new self-registered company (currently
  00007's hardcoded default).
- Terms-of-service / pricing copy shown on the public registration screen.
- A `platform_settings` singleton table (key/value, or one row) — avoid over-building a generic
  settings framework for under a dozen values.
- Sub-roles for Super Admin staff (currently one flat `super_admin` role) — e.g. a `sales`-scoped
  user per 7.2 who can see/edit leads and companies but not issue hard deletes or platform config.
  Only worth building once 7.2 gives sub-roles something to do.

### 7.9 Reporting, once there's real data to report on

`/sales` already does honest real-aggregate reporting (status/plan distribution) — extend, don't
replace, once 7.6 lands: MRR, churn (`active → cancelled`/`expired`), trial-to-paid conversion
(needs 7.3's history table), cohort retention by signup month. Keep the "don't fabricate what isn't
real yet" discipline — a metric with no underlying data source shows an explanatory caption, not a
placeholder number.

## 8. Suggested build order (combined)

Frontend parity (§5) comes first — it's what makes this project worth having at all. Roadmap items
(§7) are then sequenced by dependency:

1. **§5, all 7 pages** — Dashboard → Companies list → Companies detail → Plans → Users → Sales →
   Account. Ship this before starting anything in §7.
2. **7.4 Trial automation** — smallest roadmap surface, no billing dependency.
3. **7.7 Employee-limit visibility** — pure UI + read query, no migration needed.
4. **7.5 Activation audit trail** — reuses the existing `audit_logs` table and confirm-dialog
   pattern.
5. **7.1 Super-Admin-initiated registration** — needed before 7.2 has anywhere to convert a lead to.
6. **7.3 Subscription lifecycle CRUD** — needed before 7.6 has a state machine to hook into.
7. **7.2 Sales pipeline** — confirm scope with the user first; largest net-new surface.
8. **7.6 Billing** — start once 7.3 exists.
9. **7.8 Config center / sub-roles**, **7.9 Reporting** — pull forward opportunistically as 7.1–7.6
   land; neither blocks the rest of this list.

## 9. Conventions

- Server Components by default; `"use client"` only where actual interactivity is needed (forms,
  click handlers) — see the existing split between `src/app/login/page.tsx` (client) and
  `src/app/(admin)/layout.tsx` (server).
- Reuse `src/lib/supabase/client.ts` / `server.ts` for every Supabase call — never create ad hoc
  client instances per page.
- Anon key only, ever. No service-role key in this project — a super_admin already has full access
  through RLS. (7.1's Edge Function is the one place a service role is needed platform-wide, and it
  lives in `fieldforce/supabase/`, not here.)
- Match the Flutter reference implementation's exact table/column names and destructive-action
  confirmation UX (Block/Suspend/Delete all require an explicit confirm step there — keep that here).
- UI/component architecture, Tailwind theme tokens, and page-building workflow: see
  `.claude/spec.md` and `.claude/skills/build-panel-page/SKILL.md`.
