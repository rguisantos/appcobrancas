# App Cobrancas - Monorepo

Billing management system for equipment rental companies. Monorepo containing the web dashboard, REST API, and React Native mobile app with bidirectional sync.

## Structure

```
appcobrancas/
  apps/
    web/           Next.js 16 web dashboard + REST API
    mobile/        React Native (Expo) mobile app
  packages/
    shared/        Shared types, business logic, constants
  plans/           Architecture documentation
```

## Quick Start

### Web App (Dashboard + API)
```bash
cd apps/web
bun install
bun run db:push
bun run db:seed
bun run dev
```

### Mobile App
```bash
cd apps/mobile
npm install
npx expo start
```

### From root (workspace scripts)
```bash
bun run dev            # Start web dev server
bun run mobile:start   # Start Expo
```

## Packages

### `@appcobrancas/shared`
Shared TypeScript types, billing calculation functions, and constants used by both web and mobile apps. Single source of truth for business logic.

```typescript
import { calcularCobranca, formatarMoeda, type Cobranca } from '@appcobrancas/shared'
```

## Architecture

- **Web**: Next.js 16, TypeScript, Prisma/PostgreSQL, Zustand, shadcn/ui, TailwindCSS
- **Mobile**: React Native (Expo SDK 52), TypeScript, Zustand, React Navigation
- **Sync**: Bidirectional offline-first sync with last-write-wins conflict resolution
- **Auth**: JWT (cookie for web, Bearer token for mobile)

See `plans/` for detailed architecture documentation.
