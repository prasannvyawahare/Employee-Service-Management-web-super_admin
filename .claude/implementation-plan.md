> **Superseded by `.claude/plan.md`.** Kept only as a historical snapshot — do not treat as current.

# Fieldforce Admin Web — implementation plan

Self-contained reference for building this project. Written from a session that had already
explored the sibling `fieldforce` Flutter repo and its live Supabase schema — file/line references
below were verified against real files at the time of writing, not guessed. Re-verify with
`find`/`grep` in `../fieldforce` before trusting anything here that's more than a session old, same
rule `fieldforce/CLAUDE.md` itself uses.

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
`fieldforce/lib/core/services/supabase_service.dart:13-24` for where the Flutter app gets this; the
same URL/anon key are already in this project's `.env.local`).

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
`fieldforce/supabase/` needs to change for this project.** If a page here seems to need a new
column/table/policy, stop and check `fieldforce/supabase/migrations/` first — it may already exist
under a different name than expected.

## 3. Database reference (verified against `fieldforce/supabase/migrations/`)

| Table/RPC | Defined in | Key columns / notes |
|---|---|---|
| `companies` | `00002_core_tables.sql` | `id, name, owner_name, email, mobile, address, logo_url, brand_color, gst_number, employee_limit, status (company_status: pending/approved/blocked/suspended), razorpay_customer_id (not yet added — see §6)` |
| `subscriptions` | `00002_core_tables.sql` | `company_id (UNIQUE — one per company), plan (subscription_plan: basic/professional/enterprise), status (subscription_status: trial/active/payment_pending/expired/suspended/cancelled), start_date, expiry_date, trial_end_date, employee_limit, payment_status, amount, razorpay_subscription_id (column exists, unused — no billing wired yet)` |
| `plans` + `plan_features` | `00039_plans_catalog_and_users_rls.sql` | Pricing/feature-bundle **catalog** for sales pitches — `name, description, price, billing_period (monthly/yearly), is_active`. Deliberately NOT wired to `subscriptions.plan` or `company_features` automatically (that migration's own header comment says so) — applying a plan's features to a company is a manual action. |
| `features` + `company_features` | `00034_feature_catalog_and_entitlements.sql` | Feature catalog (`key, label, category: core/optional`) + per-company on/off (`company_id, feature_key, enabled`). `company_is_active()`/`company_has_feature()` SQL functions (SECURITY DEFINER) are the canonical way to check these — same functions RLS itself uses. |
| `user_profiles` | `00002_core_tables.sql`, cross-tenant read widened in `00039` | `id (= auth.users id), company_id, role, full_name, email, mobile, is_active`. The Users directory reads this joined to `companies(name)`. |
| `super_admin_platform_stats()` RPC | `00037_feature_gate_and_status_rls.sql` | Returns `total_companies, pending_companies, approved_companies, blocked_companies, suspended_companies, total_employees`. Raises if caller isn't `super_admin`. |
| `super_admin_delete_company(p_company_id)` RPC | `00038_super_admin_delete_company.sql` | Irreversible — also removes `user_profiles`/`auth.users` rows for that company (no FK cascade covers those). Always confirm in the UI before calling. |

Enums (from `00001_extensions_and_enums.sql`): `company_status`, `subscription_status`,
`subscription_plan` — use these exact string values, not invented ones.

## 4. Page-by-page plan, mapped to the Flutter reference implementation

Build in this order — Companies first because it's the screen actually used daily; each one should
be verified against the real project (real login, real read, at least one real write) before moving
to the next:

1. **`/` (Dashboard)** — `super_admin_platform_stats()` RPC. Reference:
   `fieldforce/lib/features/super_admin/dashboard/super_admin_dashboard_screen.dart`'s
   `_StatisticsSection`. *(Not built yet — do this first.)*
2. **`/companies`** — list + search/status-filter. Query: `companies.select('*, subscriptions(*)')`
   ordered by `created_at desc`. Reference: `_CompaniesSection` + `widgets/company_card.dart` in the
   same file, and `SuperAdminService.fetchAllCompanies()` in
   `fieldforce/lib/core/services/super_admin_service.dart`.
3. **`/companies/[id]`** — detail/edit: plan + employee_limit (writes to `subscriptions`), feature
   entitlements (`company_features` upsert), status actions (approve/block/suspend/reactivate →
   `companies.status` update), delete (`super_admin_delete_company()` RPC, behind a
   type-the-company-name confirmation). Reference:
   `fieldforce/lib/features/super_admin/company_detail/company_detail_screen.dart` +
   `widgets/company_status_actions.dart` + `widgets/feature_toggle_list.dart` — copy the exact
   confirmation-dialog behavior for Block/Suspend/Delete, these are destructive/access-affecting.
4. **`/plans`** — CRUD over `plans` + `plan_features`. Reference:
   `dashboard/sections/plans_section.dart` and the `fetchPlans`/`createPlan`/`updatePlan`/`deletePlan`
   methods in `super_admin_service.dart`.
5. **`/users`** — cross-tenant `user_profiles` directory (`select('id, full_name, email, mobile,
   role, is_active, companies(name)')`). Reference: `dashboard/sections/users_section.dart`.
6. **`/sales`** — still a placeholder in the Flutter app too (sums `subscriptions.amount`, which is
   $0 until real billing exists — don't invent numbers here either). Reference:
   `dashboard/sections/sales_section.dart`.
7. **`/account`** — own profile (`full_name` update on own `user_profiles` row) + password change
   (`supabase.auth.updateUser`). Reference: `_AccountSection` in the dashboard screen file.

## 5. What's already scaffolded (don't redo)

- Next.js App Router + TypeScript + Tailwind (`create-next-app` defaults).
- `@supabase/supabase-js` + `@supabase/ssr` installed.
- `.env.local` — `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` already filled in
  (same values as `fieldforce/lib/core/services/supabase_service.dart:13-24`).
- `src/lib/supabase/client.ts` / `server.ts` — browser/server client factories.
- `src/middleware.ts` — session refresh + `super_admin`-only route guard (non-super_admin or
  logged-out users get redirected to `/login`; a signed-in super_admin hitting `/login` gets bounced
  to `/`).
- `src/app/login/page.tsx` — working email/password sign-in form.
- `src/app/(admin)/layout.tsx` — sidebar shell with the six nav links (Dashboard/Companies/Plans/
  Sales/Users/Account) + `sign-out-button.tsx`.
- **Not yet built**: every actual page under `(admin)/` except the layout shell — see §4's build
  order.

## 6. Explicitly out of scope for this project (for now)

A separate, larger plan exists for a full SaaS launch — Razorpay billing, a public marketing site,
self-serve signup, a sales-team panel. None of that is required to solve "get the Super Admin panel
off the Flutter release cycle," which is this project's actual goal. Notable related facts if that
work ever starts here:

- `subscriptions.razorpay_subscription_id` column already exists and is unused.
- An `invoices` table does not exist yet in `fieldforce/supabase/migrations/`.
- `companies.razorpay_customer_id` / `plans.razorpay_plan_id` do not exist yet either.

Treat billing as a distinct future initiative layered onto this project once the six pages above are
done, not a prerequisite.

## 7. Conventions

- Server Components by default; `"use client"` only where actual interactivity is needed (forms,
  click handlers) — see the existing split between `src/app/login/page.tsx` (client) and
  `src/app/(admin)/layout.tsx` (server).
- Reuse `src/lib/supabase/client.ts` / `server.ts` for every Supabase call — don't create ad hoc
  client instances per page.
- Anon key only, ever. No service-role key in this project — a super_admin already has full access
  through RLS; a service-role key would bypass it needlessly.
- Match the Flutter reference implementation's exact table/column names and destructive-action
  confirmation UX (Block/Suspend/Delete all require an explicit confirm step there — keep that here).
