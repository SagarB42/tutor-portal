# Analytics

Route: `/dashboard` (the landing page) — KPI tiles + multi-series charts.

## Data

All aggregations live in [`src/lib/queries/analytics.ts`](../../src/lib/queries/analytics.ts):

- `getRevenueByMonth` — sums `payments.amount` by month.
- `getSessionsPerWeek` — ISO-week counts grouped by status.
- `getStudentGrowth` — cumulative `students` created per month.
- `getKpiSummary` — tiles: active students, sessions this month, revenue MTD,
  outstanding invoices.

## Rendering

- Charts are client-side (`recharts`) wrapped in
  [`analytics-charts.tsx`](../../src/app/dashboard/_components/analytics-charts.tsx).
- Uses CSS tokens (`var(--muted-foreground)`, `var(--border)`, `var(--popover)`)
  so it tracks the theme.

## Australian financial year

Helpers in [`src/lib/fy.ts`](../../src/lib/fy.ts):

- `currentFY()` — returns `{ startISO, endISO, label }` for the AU FY (1 Jul → 30 Jun).
- `fyBoundsFor(year)` — explicit year selector.

The dashboard header exposes an FY toggle that updates the query string so
the server recomputes aggregations for the chosen FY.
