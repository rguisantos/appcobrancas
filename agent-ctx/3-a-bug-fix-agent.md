# Task 3-a - Bug Fix Agent

## Summary
Fixed 3 bugs in the App Cobranças system: empty weekly comparison chart, production server startup script, and database seeding on startup.

## Changes Made

### Bug 1: Empty Weekly Comparison Chart → Monthly Comparison Widget

**File**: `/home/z/my-project/src/components/views/dashboard-view.tsx`

**Problem**: The `WeeklyComparisonWidget` queried cobranças by the current week's date range, but seed data uses November 2024 dates (`dataInicio: '2024-11-01'`, `dataFim: '2024-11-30'`). Since the current date is in 2025/2026, no cobranças matched, showing R$ 0,00 for both weeks.

**Fix**: Replaced `WeeklyComparisonWidget` with `MonthlyComparisonWidget` that:
1. Fetches ALL cobranças (no date filter) and groups by `dataInicio` month
2. Compares "Este Mês" vs "Mês Anterior" using the current month's cobranças
3. Falls back to the two most recent months with data when current/previous month have no entries (handles seed data from older months)
4. Shows "Sem dados no período" with `CalendarX` icon when no cobranças exist at all
5. Displays dynamic month labels (e.g., "nov. 2024" vs "—") instead of hardcoded "Esta semana"/"Semana anterior"
6. Only shows the percentage change badge when there's actual data

**Additional changes**:
- Added `CalendarX` icon import from lucide-react
- Removed unused `Clock` icon import (was causing lint warning)
- Updated component reference from `<WeeklyComparisonWidget />` to `<MonthlyComparisonWidget />`
- Added `formatMonthLabel()` helper function to format "YYYY-MM" keys into Portuguese month labels
- Added `hasData` state to track when there's genuinely no data vs loading/error states

### Bug 2: Fix Production Server Startup Script

**File**: `/home/z/my-project/.zscripts/dev.sh`

**Problem**: The script didn't:
- Run `db:push` to ensure database schema is up to date
- Run seed to populate initial data
- Use `exec` to properly hand off to the node process (the shell process would stay as parent)
- Set DATABASE_URL explicitly

**Fix**: Rewrote the script with:
1. `bun run db:push` - ensures database schema is synced before server starts
2. Seed marker system - runs `bun run db:seed` on first run only, creates `.seed-done` marker file
3. `exec node .next/standalone/server.js` - properly hands off to node process so signals are forwarded correctly
4. Explicit `DATABASE_URL` export for clarity
5. `set -e` for fail-fast behavior
6. Better logging with `[DEV]` prefix messages
7. Preserved existing build check logic (builds if `.next/standalone/server.js` doesn't exist)

### Bug 3: Fix Database Seeding on Startup

**File**: `/home/z/my-project/.zscripts/dev.sh`

**Problem**: Seed never ran automatically. The old `dev.sh` only checked for the build and started the server.

**Fix**: Added seed execution as part of Bug 2 fix above. The seed runs after `db:push` but before the server starts. Uses a `.seed-done` marker file to avoid re-seeding on every restart. To re-seed, delete the marker file: `rm .seed-done`.

## Lint Result
Zero errors - `bun run lint` passes cleanly.
