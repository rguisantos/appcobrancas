# App Cobrancas - Mobile (React Native)

Mobile companion app for the App Cobrancas billing management system. Built with React Native (Expo) with offline-first architecture and bidirectional sync.

## Tech Stack

- **React Native** via Expo SDK 52
- **TypeScript** for type safety
- **Zustand** for state management (auth, sync)
- **React Navigation** for navigation (bottom tabs + stack)
- **WatermelonDB** (planned) for offline-first local database

## Project Structure

```
mobile/
  App.tsx                    # Root component with navigation
  src/
    components/              # Shared UI components
      Card.tsx
      EmptyState.tsx
      LoadingScreen.tsx
      StatusBadge.tsx
      SyncIndicator.tsx
    hooks/                   # Custom React hooks
    lib/
      cobranca-calculos.ts   # Business logic (mirrors web app)
      config.ts              # API base URL and constants
    navigation/              # Navigation type definitions
    screens/
      LoginScreen.tsx        # User + device login
      DashboardScreen.tsx    # Stats, financial summary, quick actions
      ClientesScreen.tsx     # Client list with search
      ClienteDetailScreen.tsx # Client detail with locacoes/cobrancas
      ClienteFormScreen.tsx  # Create new client
      CobrancasScreen.tsx    # Billing list with status filters
      CobrancaFormScreen.tsx # Create new billing (with calculator)
      ProdutosScreen.tsx     # Product list
      SettingsScreen.tsx     # Profile, device info, sync controls
    services/
      api.ts                 # HTTP client with Bearer token auth
    store/
      auth.ts                # Authentication state
      sync.ts                # Sync queue and pull/push logic
    theme/
      colors.ts              # Color palette
      spacing.ts             # Spacing, border radius, font sizes
    types/
      models.ts              # TypeScript interfaces matching Prisma schema
```

## Screens

| Screen | Description |
|--------|-------------|
| Login | User email/password or device key/password |
| Dashboard | KPIs, financial summary, quick actions |
| Clientes | Searchable client list with pagination |
| Cliente Detail | Contact, address, locacoes, recent cobrancas |
| Cliente Form | Create new client |
| Cobrancas | Billing list with status filters (Pendente, Atrasado, Parcial, Pago) |
| Cobranca Form | Create billing with auto-calculation (fichas, percentual, fixed) |
| Produtos | Product list with search |
| Settings | Profile, device info, sync controls, logout |

## Sync Architecture

The app uses a **push-then-pull** sync strategy:

1. **Push** local changes (creates, updates, deletes) to `/api/sync/push`
2. Server applies changes using **Last-Write-Wins** conflict resolution
3. **Pull** server changes from `/api/sync/pull` using cursor-based pagination
4. Apply server changes to local state

The sync store (`store/sync.ts`) maintains a change queue for offline mutations.

## Setup

```bash
cd mobile
npm install    # or bun install
npx expo start
```

## Configuration

Edit `src/lib/config.ts` to set your API base URL:
- Development: `http://10.0.2.2:3000` (Android emulator) or `http://localhost:3000` (iOS simulator)
- Production: Your deployed backend URL

## Authentication

The app supports two auth modes:
- **User login**: Email + password (uses `/api/auth/login`)
- **Device login**: Device key + password (uses `/api/auth/device-login`)

Both return a Bearer token used for all subsequent API requests.
