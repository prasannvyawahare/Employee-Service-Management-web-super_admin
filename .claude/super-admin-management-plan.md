> **Superseded by `.claude/plan.md`.** Kept only as a historical snapshot — do not treat as current.

# Super Admin Platform Management — Current State & Future Scope

Documents how the Super Admin manages this SaaS platform end-to-end: company/admin onboarding, sales,
subscriptions, per-company rights, employee-count limits, activation/deactivation, and free trials. Two
parts: **Part 1** is verified against actual code/migrations as of 2026-09-02 (don't trust prose elsewhere
without re-checking — see CLAUDE.md's migration-verification note). **Part 2** is the proposed roadmap to
close the gaps against the full scope requested for this doc.

Cross-reference: `.claude/known-gaps.md` (confirmed gaps, some overlap with this doc's Part 1),
`.claude/implementation-plan.md` §21 (original phase plan — Razorpay billing is Phase 7 there).

---

## Part 1 — What's actually built today

### 1.1 Data model

| Table | Purpose | Key columns |
|---|---|---|
| `companies` | One row per tenant | `status` (`pending`/`approved`/`blocked`/`suspended`), `employee_limit` (legacy fallback), `company_code` |
| `subscriptions` | One row per company, source of truth for plan/limits | `plan` (`basic`/`professional`/`enterprise` enum), `status` (`trial`/`active`/`payment_pending`/`expired`/`suspended`/`cancelled`), `employee_limit`, `start_date`, `expiry_date`, `trial_end_date`, `payment_status`, `amount`, `razorpay_subscription_id` |
| `features` | Catalog of gateable feature domains | `key`, `label`, `category` (`core`/`optional`), `sort_order` |
| `company_features` | Per-company on/off entitlement | `company_id`, `feature_key`, `enabled` — unique per pair |
| `plans` | **Separate** pricing/sales-sheet catalog (not wired to `subscriptions.plan`) | `name`, `price`, `billing_period`, `is_active` |
| `plan_features` | Feature bundle for a `plans` row | `plan_id`, `feature_key` |
| `user_profiles` | Cross-tenant identity, joined for the Users directory | `role`, `is_active`, `company_id` |

**Important existing design decision, easy to misread:** `plans`/`plan_features` is a *sales sheet you show
a prospect* — creating one does **not** apply anything to any company. Actually granting a company its
plan's features is a manual, separate action on `CompanyDetailScreen` (edit `subscriptions.plan` and toggle
`company_features` individually). There is no "apply this plan to this company" button today — see gap
2.3.

### 1.2 Super Admin dashboard (`lib/features/super_admin/`)

Sections (via `side_nav.dart`): **Overview**, **Companies**, **Sales**, **Users**, **Plans**.

- **Overview** — `super_admin_platform_stats()` RPC (SECURITY DEFINER, re-checks caller role internally).
- **Companies** — list (`company_card.dart`) → `CompanyDetailScreen`, which edits in one batched Save:
  subscription `plan` + `employee_limit`, `company_features` toggles, and `companies.status` via
  `CompanyStatusActions` (Approve / Block / Suspend / Reactivate, each behind a confirm dialog). Includes a
  double-confirmation **hard delete** (`super_admin_delete_company` RPC — removes `employees`,
  `user_profiles`, and the underlying `auth.users` login rows too, no FK cascade covers those).
- **Sales** (`sales_section.dart`) — deliberately real-data-only: sums `subscriptions.amount` as "recorded
  revenue" (currently always ~$0 since there's no payment collection yet) plus status/plan distribution
  breakdowns. Explicitly does **not** fabricate revenue trend charts. This is a metrics view, not a sales
  pipeline/CRM.
- **Users** — cross-tenant `user_profiles` directory (name/email/mobile/role/is_active/company), read-only.
- **Plans** (`plans_section.dart`) — full CRUD on the `plans` sales-sheet catalog described above.

### 1.3 What's enforced server-side today

- **Employee limit**: `trg_enforce_employee_limit` (00005) fires on `employees` insert, reads
  `COALESCE(subscriptions.employee_limit, companies.employee_limit)` — this *is* a real hard cap, not just
  a UI number.
- **Company status lockout**: 00037 gates tenant RLS on `company_is_active()` — a `blocked`/`suspended`
  company's users lose access on their next router pass. Real, not cosmetic.
- **Feature entitlement gating**: `company_has_feature()` (00034), usable both from RLS and client-side UI
  gating.
- **Tenant isolation** for all of the above: `super_admin_companies` / `super_admin_subscriptions` /
  `super_admin_company_features` policies (`FOR ALL`, `role = 'super_admin'`) — see CLAUDE.md's RLS rules
  before touching any of this.

### 1.4 Onboarding today: self-registration only

There is **no Super-Admin-initiated "create a company + admin account" flow**. The only path to a new
tenant is `company_registration_screen.dart`, where the *prospective admin themselves* signs up and the
`handle_new_user` trigger (00007) creates the company row. The Super Admin's only lever afterward is
approving/editing what already got self-created. This matters for gap 2.1 below (a sales-assisted signup
flow) and is a deliberate chicken-and-egg workaround, not an oversight — see 00007's header comment.

### 1.5 Free trial: schema exists, nothing runs it

`subscriptions.status = 'trial'` and `trial_end_date` are real columns, set on registration (00036 backfill
+ 00007). But:
- Nothing reads `trial_end_date` to flag or auto-transition an expired trial — no cron, no Edge Function,
  no client-side check gates access at expiry.
- `pg_cron`/`pg_net` are **unavailable on the current Supabase free tier** (`.claude/known-gaps.md`), which
  is the actual blocker for any of this running server-side.
- The Super Admin dashboard shows trial status as data but has no "extend trial" / "convert to paid" action.

---

## Part 2 — Proposed future scope

Ordered by dependency, not necessarily priority — read top-to-bottom as a buildable sequence, but pick the
starting point that matches actual business pressure (probably 2.4 trial-expiry enforcement or 2.1
admin-registration, since both are one Edge Function / one screen away and don't need Razorpay).

### 2.1 Super-Admin-initiated company + admin registration

Today the Super Admin can only edit what a prospect self-registered. Add a "Create company" flow on the
Companies section that:
- Creates the `companies` row directly (status `approved` by default — skips the self-serve `pending` step
  a sales-assisted signup shouldn't need).
- Creates the admin's `auth.users` row via `supabase.auth.admin.createUser()` (needs the **service role**,
  so this must go through an Edge Function, not the client directly — the client never holds the service
  key) and the matching `user_profiles`/`employees` rows, reusing the same shape `handle_new_user` (00007)
  already produces so both paths stay consistent.
- Sends the new admin their credentials (email invite, or a "set your password" link) — needs actual email
  delivery, which nothing in this repo does yet (Supabase's default auth emails, or a transactional email
  provider).
- Assigns a plan/employee_limit/trial length at creation time instead of the current fixed defaults from
  00007.

New surface: one Edge Function (`create-company-admin`), one dialog/screen on the Companies section.

### 2.2 Sales as a real pipeline, not just a metrics view

Current `sales_section.dart` is intentionally metrics-only. A real sales/CRM-lite layer would add:
- `leads` table: prospect contact info, source, assigned sales owner (a `user_profiles` row with a new
  `sales` role, or a `sales_owner_id` on `companies` if kept simple), stage (`new`/`contacted`/`demo`/
  `negotiating`/`won`/`lost`), notes, next-follow-up-date.
- Convert-to-company action: a won lead becomes a `companies` row via the 2.1 flow, carrying the lead's
  chosen plan forward.
- A pipeline board view (kanban by stage) alongside the existing metrics.

This is the biggest net-new surface in this doc — worth scoping as its own follow-up decision rather than
building opportunistically, since "sales" could mean anything from this full CRM down to just what exists
today plus a `sales_owner` column. Recommend confirming scope before starting.

### 2.3 Subscription lifecycle CRUD (beyond edit-in-place)

Today "editing a subscription" is two fields (`plan`, `employee_limit`) overwritten in place with no
history. A real lifecycle needs:
- `subscription_history` table (or an `audit_logs` entry per change — that table already exists per
  `.claude/known-gaps.md`, unused) recording who changed what, when, and why (plan upgrade, downgrade,
  manual comp, renewal).
- Explicit lifecycle actions instead of silent field overwrites: **Renew** (push `expiry_date` forward,
  `status → active`), **Upgrade/Downgrade plan** (apply the *catalog* `plans` row's bundled features to
  `company_features` in one step — the missing "apply plan to company" link flagged in 1.1), **Cancel**
  (`status → cancelled`, does *not* touch `companies.status` — a cancelled subscription and a
  blocked/suspended company are different concepts and Super Admin may want a company to stay `approved`
  during a plan lapse for a grace period).
- Proration is out of scope until real billing (2.6) exists — until then "upgrade mid-cycle" is just an
  admin decision with no automatic charge adjustment.

### 2.4 Free trial automation

Closes the gap in 1.5. Needs, in order:
1. A `check-trial-expiry` Edge Function that flips `subscriptions.status` from `trial` to `expired` past
   `trial_end_date`, and a way to invoke it — either `pg_cron` (blocked on free tier, see 1.5) or an
   external scheduler hitting the function's URL (works on any tier, no `pg_cron` dependency — the
   pragmatic unblock).
2. Client-side/RLS enforcement once `status = 'expired'`: extend `company_is_active()` (00034) or the
   00037 status-lockout policy to also gate on subscription status, not just `companies.status` — these are
   currently independent gates.
3. Super Admin actions: **Extend trial** (push `trial_end_date`), **Convert to paid** (set `status →
   active`, `plan`, `expiry_date`).
4. A visible countdown/badge on `company_card.dart` and `CompanyDetailScreen` for trial companies nearing
   expiry (e.g. ≤3 days) — currently trial status is stored but not surfaced distinctly from `active`.
5. Configurable default trial length (currently whatever 00007's trigger hardcodes) — expose as a
   platform-wide setting per 2.8.

### 2.5 Activation/deactivation governance

The Approve/Block/Suspend/Reactivate actions (1.3) work but are unaudited and unscheduled:
- Log every status change to `audit_logs` (table exists, unused) with actor, timestamp, from/to status, and
  an optional reason string captured in the existing confirm dialog (`company_status_actions.dart` — add a
  reason text field to the dialog).
- Scheduled deactivation ("suspend this company on 2026-10-01" for a company that's given notice) — needs
  the same scheduler dependency as 2.4, so build after that lands.
- Surface the audit trail on `CompanyDetailScreen` (a simple reverse-chronological list is enough — no new
  UI pattern needed).

### 2.6 Billing (Razorpay) — already scoped, deferred by design

Per `.claude/implementation-plan.md` (Phase 7) and `.claude/known-gaps.md`: deliberately deferred, manual
billing for now. Once started, this is what turns 2.1/2.3's "assign a plan" into an actual charge, and
`sales_section.dart`'s "$0 recorded revenue" caption into real numbers. Sequencing note: 2.3's lifecycle
actions (renew/upgrade/cancel) should be built plan-first so Razorpay integration has real state machine
hooks to call into, rather than retrofitting both at once.

### 2.7 Employee-limit governance beyond the hard cap

The trigger-enforced cap (1.3) works but is invisible until an admin hits it and their insert fails:
- Show current usage vs. limit on `company_card.dart`/`CompanyDetailScreen` (e.g. "8 / 10 employees") — a
  plain `COUNT(*) FROM employees WHERE company_id = ...` query, no schema change.
- Warn the *company admin's own dashboard* near the limit (e.g. ≥90%) — currently only the trigger's hard
  failure communicates this, and only at the moment of the failed insert.
- Per-plan default employee limits in the `plans` catalog (currently `plans` has no `employee_limit` column
  — it's a pure feature bundle) so assigning a plan via 2.3 can set a sensible default instead of the
  Super Admin typing a number by hand every time.

### 2.8 Platform configuration center

A single place for settings that currently don't exist as settings at all (hardcoded or absent):
- Default trial length (2.4), default employee limit for a new self-registered company (currently 00007's
  hardcoded default).
- Terms-of-service / pricing page copy shown on the public registration screen.
- A `platform_settings` singleton table (key/value, or one row) is the simplest shape — avoid over-building
  a generic settings framework for what's likely under a dozen values.
- Sub-roles for Super Admin staff (currently one flat `super_admin` role with full access to everything in
  this doc) — e.g. a `sales`-scoped user per 2.2 who can see/edit leads and companies but not issue hard
  deletes or platform config. Only worth building once 2.2 gives sub-roles something to actually do.

### 2.9 Reporting, once there's real data to report on

`sales_section.dart` already does honest real-aggregate reporting (status/plan distribution) — extend, don't
replace, once 2.6 lands: MRR, churn (subscriptions moving `active → cancelled`/`expired`), trial-to-paid
conversion rate (needs 2.3's history table to compute), cohort retention by signup month. Keep the existing
"don't fabricate what isn't real yet" discipline — a metric with no underlying data source should show an
explanatory caption (as the $0 revenue card already does), not a placeholder number.

---

## Suggested build order

1. **2.4 Trial automation** — smallest surface, no billing dependency, closes a real "companies stay on
   trial forever with nothing enforcing it" gap.
2. **2.7 Employee-limit visibility** — pure UI + read query, no migration needed beyond what exists.
3. **2.5 Activation audit trail** — reuses the existing `audit_logs` table and confirm-dialog pattern.
4. **2.1 Super-Admin-initiated registration** — needed before 2.2 (sales) has anywhere to convert a lead
   *to*.
5. **2.3 Subscription lifecycle CRUD** — needed before 2.6 (billing) has a state machine to hook into.
6. **2.2 Sales pipeline** — confirm scope with the user first (see 2.2's note); largest net-new surface.
7. **2.6 Billing** — already scoped elsewhere as Phase 7; start once 2.3 exists.
8. **2.8 Config center / sub-roles**, **2.9 Reporting** — pull pieces forward opportunistically as 2.1–2.6
   land; neither is a hard blocker for anything else in this list.
