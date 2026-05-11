# Task ID: 1 - OOM Fix: Dynamic Imports for View Components

## Agent
OOM Fix Agent

## Task
Fix OOM crash caused by all 27+ view components being statically imported in app-shell.tsx during SSR.

## Problem
The file `/home/z/my-project/src/components/layout/app-shell.tsx` had 27 static import statements (lines 38-64) for all view components. During SSR, Next.js loaded every single component into memory simultaneously, causing the server to use 5.7GB+ RAM and get OOM-killed.

## Solution
Replaced all 27 static imports with `next/dynamic` imports using `ssr: false` option. This ensures:
1. Only the currently needed view component is loaded on the client side (lazy loading)
2. The server never loads any view component during SSR
3. Memory usage drops dramatically since components are loaded on-demand

## Changes Made

### File: `/home/z/my-project/src/components/layout/app-shell.tsx`

**Removed (lines 38-64):**
- 27 static import statements for view components

**Added:**
- `import dynamic from 'next/dynamic'`
- `ViewLoading` component - a spinner fallback shown while a view is loading
- 27 `dynamic()` calls, one per view component, each with:
  - `ssr: false` to skip server-side rendering
  - `loading: ViewLoading` to show a spinner while the component loads
  - `.then(m => ({ default: m.ComponentName }))` to handle named exports

**View components converted to dynamic imports:**
1. DashboardView
2. ClientesView
3. ClienteFormView
4. ClienteDetalheView
5. ProdutosView
6. ProdutoFormView
7. ProdutoDetalheView
8. LocacoesView
9. LocacaoFormView
10. LocacaoDetalheView
11. CobrancasView
12. CobrancaFormView
13. CobrancaDetalheView
14. RelatoriosView
15. MapaView
16. AgendaView
17. ManutencoesView
18. RelogiosView
19. AdminUsuariosView
20. AdminRotasView
21. AdminCadastrosView
22. AdminDispositivosView
23. AdminAuditoriaView
24. AdminMetasView
25. PerfilView
26. NotificacoesView

**Preserved unchanged:**
- All nav items, sidebar, layout structure
- ViewRouter function and all switch cases
- KeyboardShortcuts, TopBar, PageTransition imports (non-view components kept as static imports)
- All styling, animations, responsive design

## Verification
- `bun run lint`: ✅ Zero errors
- Dev server: ✅ Running normally on port 3000

## Expected Impact
- Server memory usage should drop from 5.7GB+ to a fraction of that
- Only the active view's JavaScript is loaded on the client
- Slight loading spinner shown when switching views (milliseconds for most views)
- No more OOM kills
