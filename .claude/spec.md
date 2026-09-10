# UI & Architecture Spec — Fieldforce Admin Web

Concrete, opinionated rules for how every page in this project is built: folder layout, data-flow
pattern, and the Tailwind v4 design system. Read alongside `.claude/plan.md` (what to build, in what
order, against which tables/RPCs). Operationalized by
`.claude/skills/build-panel-page/SKILL.md` — that skill is what you invoke when actually building a
page; this file is the reference it points back to.

Goal: a **super-admin console that reads as one coherent product** — Stripe/Linear/Vercel-dashboard
register, not a pile of ad hoc Tailwind classes reinvented per page. Every page reuses the same
primitives from `src/components/ui/`; no page hand-rolls its own button, badge, table, or dialog.

---

## 1. Folder architecture

```
src/
  app/
    login/page.tsx                 existing, unchanged
    (admin)/
      layout.tsx                   sidebar shell — server component, auth-aware
      page.tsx                     Dashboard
      companies/
        page.tsx                   list
        [id]/page.tsx              detail
        [id]/actions.ts            "use server" mutations for this route
      plans/page.tsx  plans/actions.ts
      users/page.tsx
      sales/page.tsx
      account/page.tsx  account/actions.ts
  components/
    ui/                            design-system primitives (this spec, §3)
    layout/                        Sidebar, NavLink, Topbar — used only by (admin)/layout.tsx
    companies/, plans/, users/...  page-specific composite components (e.g. CompanyStatusActions,
                                    FeatureToggleList) that compose ui/ primitives
  lib/
    supabase/client.ts, server.ts  existing, unchanged
    format.ts                      date/currency/number formatting helpers
    status.ts                      status → label/color/icon maps (§4)
  types/
    db.ts                          hand-written types mirroring plan.md §3 (Company, Subscription,
                                    Plan, Feature, CompanyFeature, UserProfile) — no codegen tooling
                                    in this project, keep these in sync by hand when a migration adds
                                    a column
```

Rule: a file under `app/**` either fetches data (Server Component) or handles one interaction
(`"use client"`); it does not also define a reusable visual primitive inline. If a JSX chunk is used
on two pages, or is generic enough that it obviously will be, it belongs in `components/`.

## 2. Data flow

- **Reads**: Server Components fetch directly with `createClient()` from `lib/supabase/server.ts`
  inside the page's async function body. No client-side `useEffect` fetching, no route handlers
  (`app/api/**`) for plain reads — Server Components are the fetch layer here, per `plan.md` §9's
  "Server Components by default."
- **Writes**: Server Actions (`"use server"`), one `actions.ts` file per route, colocated next to
  `page.tsx`. Each action:
  1. Creates its own `createClient()` (server) — never passed in, never reused across requests.
  2. Performs the mutation.
  3. Calls `revalidatePath()` for the affected route(s).
  4. Returns `{ error: string } | { success: true, ... }` — never throws across the server/client
     boundary; the calling client component renders `error` inline if present.
- **Client components** call actions via a `<form action={serverAction}>` where the shape fits
  (simple field submissions), or via a direct `await action(...)` inside an event handler wrapped in
  `useState` loading/error state when the interaction needs a confirm step first (status changes,
  deletes). Use React's `useActionState` for forms that need pending/error state without hand-rolled
  `useState` boilerplate.
- **No client-side Supabase reads** of tenant data. `lib/supabase/client.ts` is used only for
  `auth` calls (sign in/out, password update) — mirrors what's already true in `login/page.tsx` and
  `sign-out-button.tsx`.

## 3. Design tokens (Tailwind v4, `globals.css`)

Tailwind v4 has no `tailwind.config.js` by default — tokens are declared with `@theme` directly in
CSS and become utility classes automatically (`--color-accent` → `bg-accent`/`text-accent`/etc.).
Replace the current placeholder tokens in `src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* surfaces */
  --color-surface: #ffffff;
  --color-surface-sunken: #f7f7f9;   /* app background */
  --color-surface-raised: #ffffff;   /* cards */
  --color-border: #e5e5ea;
  --color-border-strong: #d4d4d9;

  /* ink */
  --color-ink: #18181b;
  --color-ink-muted: #6b6b74;
  --color-ink-faint: #9b9ba3;

  /* accent — violet, used for primary actions/active nav/focus rings */
  --color-accent: #6d5ae6;
  --color-accent-hover: #5c4bd1;
  --color-accent-soft: #f1eefb;
  --color-accent-ink: #ffffff;

  /* semantic status */
  --color-good: #16803c;
  --color-good-soft: #e9f7ee;
  --color-warn: #b45309;
  --color-warn-soft: #fdf3e2;
  --color-bad: #b91c1c;
  --color-bad-soft: #fdecec;
  --color-neutral: #52525b;
  --color-neutral-soft: #f1f1f3;

  --radius-card: 0.875rem;   /* 14px */
  --radius-control: 0.5rem;  /* 8px */

  --shadow-card: 0 1px 2px rgba(24,24,27,0.04), 0 6px 20px -8px rgba(24,24,27,0.10);
}

body {
  background: var(--color-surface-sunken);
  color: var(--color-ink);
}
```

No `prefers-color-scheme` dark-mode block — this is an internal tool with one intentional theme, not
a public artifact; don't add dark mode speculatively (YAGNI per top-level guidance). If the user asks
for dark mode later, add it as `[data-theme="dark"]` token overrides at that point, not now.

Keep Geist Sans as the only typeface (already wired in `app/layout.tsx`) — no serif, no second
font family. Numbers in stat tiles/tables use `tabular-nums` (add
`--font-feature-settings` via the `tabular-nums` utility class Tailwind ships by default).

## 4. Status → color mapping (`lib/status.ts`)

Single source of truth so a "blocked" badge looks identical on the company card, the detail page,
and anywhere else it appears. Two enums need this (`plan.md` §3):

```ts
export const COMPANY_STATUS = {
  pending:   { label: "Pending",   tone: "warn" },
  approved:  { label: "Approved",  tone: "good" },
  blocked:   { label: "Blocked",   tone: "bad" },
  suspended: { label: "Suspended", tone: "bad" },
} as const;

export const SUBSCRIPTION_STATUS = {
  trial:           { label: "Trial",           tone: "accent" },
  active:          { label: "Active",          tone: "good" },
  payment_pending: { label: "Payment pending", tone: "warn" },
  expired:         { label: "Expired",         tone: "bad" },
  suspended:       { label: "Suspended",       tone: "bad" },
  cancelled:       { label: "Cancelled",       tone: "neutral" },
} as const;

export type Tone = "good" | "warn" | "bad" | "neutral" | "accent";
```

`Badge` (§5) takes a `tone` prop and resolves it to `bg-{tone}-soft text-{tone}` — this is the only
place status color is decided; pages never inline `bg-red-50` for a status pill.

## 5. Component primitives (`src/components/ui/`)

Build these first (Task: design-system primitives), before any real page. Each is a plain function
component, no external UI library — Tailwind classes only, native HTML elements
(`<dialog>` for modals, `<table>` for tables) so there's no extra runtime dependency for behavior the
platform already provides.

| Component | Shape | Notes |
|---|---|---|
| `Button` | `variant: "primary" \| "secondary" \| "danger" \| "ghost"`, `size: "sm" \| "md"`, native `<button>` props passthrough | `primary` = accent bg; `danger` = bad bg, used only for destructive confirms |
| `Card` | `children`, optional `className` | `bg-surface-raised border border-border rounded-card shadow-card p-6` |
| `Badge` | `tone: Tone`, `children` | pill, `text-xs font-semibold` |
| `StatTile` | `label, value, icon (lucide component), tone` | icon in a `tone`-colored circle, big number, label — mirrors the Flutter `_StatTile` shape exactly (icon circle → value → label stack) |
| `PageHeader` | `title, description?, action?` | every page opens with one: `h1` + optional description + right-aligned primary action button |
| `EmptyState` | `icon, title, description, action?` | shown when a list query returns zero rows — never show a bare empty table |
| `Skeleton` | `className` for sizing | pulsing `bg-neutral-soft` block, used in `loading.tsx` per route |
| `Table` / `THead` / `TRow` / `TCell` | thin wrappers adding consistent border/padding | not a data-grid library — just consistent `<table>` styling |
| `ConfirmDialog` | `open, title, description, confirmLabel, tone: "danger" \| "default", onConfirm, onCancel` | wraps native `<dialog>` + `ref.showModal()`/`close()`; used for every Block/Suspend/Delete action per `plan.md` §5's "keep that confirmation UX" rule |
| `Toast` (or inline banner) | success/error banner shown after a Server Action returns | keep simple — a dismissible fixed-position banner is enough, no toast library |

Add **`lucide-react`** as the one new dependency for icons (tree-shakeable, no runtime CSS, MIT
licensed, the de facto icon set for Tailwind dashboards) — every `StatTile`, nav link, and status
badge in the Flutter reference uses a Material icon; `lucide-react` is the closest equivalent
available for React without pulling in a full icon-font.

## 6. Page pattern

Every page under `(admin)/` follows this shape:

```tsx
export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*, subscriptions(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader title="Companies" description="…" action={<Button>Add company</Button>} />
      {error ? <ErrorBanner message={error.message} /> :
       !data?.length ? <EmptyState .../> :
       <CompaniesTable rows={data} />}
    </div>
  );
}
```

- `PageHeader` is always the first element — gives every page the same top rhythm.
- Route-level `loading.tsx` renders the same layout with `Skeleton` rows instead of real data — no
  page ships without one once it has a real query.
- Destructive/state-changing actions always render through `ConfirmDialog`, never a bare `onClick`
  that mutates immediately — matches the Flutter reference's confirm-dialog discipline
  (`plan.md` §5, item 3).

## 7. Layout shell (`(admin)/layout.tsx`)

- Fixed-width sidebar (`w-64`), `bg-surface-raised`, right border. Active route highlighted with
  `bg-accent-soft text-accent` (compare `pathname` via `usePathname()` in a small client
  `NavLink` component — the only client piece in the otherwise-server layout).
- Nav item = icon (`lucide-react`) + label, one row per section, in the six-section order from
  `plan.md` §5.
- Bottom of sidebar: signed-in user email + `SignOutButton` (unchanged).
- Main content: `max-w-7xl` inner container, consistent `px-8 py-8` gutter.

## 8. What not to build yet

- No client-side data caching layer (SWR/React Query) — Server Components + `revalidatePath` is
  sufficient at this scale; add one only if a page needs client-side polling later.
- No dark mode (see §3).
- No generic data-grid/table library — the hand-rolled `Table` primitive is enough for the row
  counts this console will ever show (tens to low hundreds of companies, not millions).
- No design-token theming system beyond the single palette in §3 — one brand, one theme.
