# Technical Documentation - Weekly Tasks Frontend

## Overview

Static Next.js frontend for the Weekly Tasks application. Hosted on S3 with CloudFront. Communicates with a REST API on AWS Lambda for auth and data sync (see `weekly-tasks-api/docs/` for backend details).

## Architecture

- **Build**: Next.js static export (`output: 'export'`)
- **Hosting**: AWS S3 bucket (`weekly-tasks`)
- **CDN**: AWS CloudFront
- **Data**: localStorage for local state, syncs to backend when logged in
- **Backend**: REST API on AWS Lambda + DynamoDB (separate project: `weekly-tasks-api`)

## Technical Stack

- **Next.js 16** - React framework (static export mode for CSR)
- **React 19** - Component-based UI library
- **TypeScript** - Typed JavaScript
- **CSS Modules** - Scoped CSS with `.module.css` files
- **Mobile-first CSS** - Default styles target mobile; desktop at `@media (min-width: 768px)`. Breakpoint defined in `app/lib/breakpoints.ts` (`BREAKPOINT_DESKTOP = 768`).

### State Management

- **React useState** - Local component state for UI interactions
- **React useEffect** - Side effects for data loading and persistence
- **React useCallback** - Memoized callbacks for stable function references
- **React Context** - Feature flags provided via `FlagsProvider` + `useFlags()` hook

## API Client

The frontend communicates with the backend via `app/lib/api.ts`. API base URL is set via `NEXT_PUBLIC_API_URL` env var.

### Functions

| Function    | Endpoint              | Description                              |
| ----------- | --------------------- | ---------------------------------------- |
| `register`  | `POST /auth/register` | Create account, upload local state       |
| `login`     | `POST /auth/login`    | Login, returns user state + token        |
| `fetchSync` | `GET /sync`           | Fetch full user state (includes flags)   |
| `pushSync`  | `PUT /sync`           | Push full state (coins, lists)           |

### Auth Flow

1. User registers or logs in via AuthControls
2. API returns a JWT token + full user state (coins, activeLists, completedLists, flags)
3. Token stored in localStorage, sent as `Authorization: Bearer <token>` on sync requests
4. Register uploads existing localStorage data to the new account
5. Logout clears all localStorage (including cached flags) and resets state

## Data Storage

### Browser localStorage

Used as local cache. When logged in, data syncs to DynamoDB via the API.

| Key              | Description                          |
| ---------------- | ------------------------------------ |
| `activeLists`    | Array of active task lists           |
| `completedLists` | Array of completed task lists        |
| `coins`          | User's coin count (number)           |
| `authToken`      | JWT token (when logged in)           |
| `authUsername`    | Username (when logged in)            |
| `dataBackup`     | Backup data with timestamp/YAML      |
| `featureFlags`   | Cached feature flags (offline fallback) |

## Deployment

```bash
npm run build          # Static export to out/
aws s3 sync out s3://weekly-tasks --delete --profile <your-profile>
```

### Environment Files

Uses `.env.development` for local dev and `.env.production` for prod builds. All `.env*` files are git-ignored.

| File               | Contents                                    |
| ------------------ | ------------------------------------------- |
| `.env.development` | `NEXT_PUBLIC_API_URL` (localhost:3009)       |
| `.env.production`  | `NEXT_PUBLIC_API_URL` (Lambda Function URL) |

Note: Next.js loads `.env.development` only during `next dev`. `.env.production` is loaded during `next build`. Do not use `.env.local` as it overrides both.

### Local Development

```bash
npm run dev    # Starts on port 3010
```

Requires the API running on port 3009 and DynamoDB Local on port 8000. See `weekly-tasks-api/docs/tech.md` for API setup, and `db/docker-compose.yml` for DynamoDB Local.

## Trade-offs

- No server-side rendering (SSR) or incremental static regeneration (ISR)
- No Next.js API routes — all backend logic in separate Lambda
- Sync is manual (user clicks "sync"), not automatic

## TBD

1. **Sharing**: Share task lists via link? Real-time collaboration?
2. **Notifications**: Reminders for approaching deadlines?
3. **CI/CD**: Automate S3 deployments (GitHub Actions)?
4. **Testing**: Unit tests? E2E tests?
