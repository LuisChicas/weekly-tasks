# Technical Documentation - Weekly Tasks

## Overview

Weekly Tasks is a Next.js application for creating, sharing, and managing task lists with deadlines, featuring gamification through a coin system.

## Architecture Phases

### Phase 1: Local Development (Current)

- **Runtime**: Local development server (`next dev`)
- **Data Storage**: Browser localStorage
- **Hosting**: Local machine only

### Phase 2: Cloud Deployment (Decided)

- **Runtime**: Static CSR (Client-Side Rendering) build
- **Build**: Next.js static export (`output: 'export'`)
- **Storage**: AWS S3 (static file hosting)
- **CDN**: AWS CloudFront (global distribution)
- **Data Storage**: Browser localStorage (unchanged from Phase 1)

### Phase 3: Backend Integration (Future)

- **Runtime**: Static frontend on S3 + CloudFront (unchanged)
- **Data Storage**: Cloud database + browser cache
- **Backend**: AWS Lambda + API Gateway
- **API**: RESTful API (TBD)

## Technical Stack

### Frontend

- **Next.js** - React framework (static export mode for CSR)
- **React** - Component-based UI library
- **TypeScript** - Typed JavaScript for improved developer experience
- **CSS Modules** - Scoped CSS with `.module.css` files

### State Management

- **React useState** - Local component state for UI interactions
- **React useEffect** - Side effects for data loading and persistence
- **React useCallback** - Memoized callbacks for stable function references

## Deployment

### Why S3 + CloudFront?

- **Cost**: Cheapest hosting option (~$1-5/month)
- **Performance**: Blazing fast delivery via CloudFront CDN edge locations
- **Scalability**: Handles traffic spikes easily
- **Simplicity**: No server to manage
- **Reliability**: S3 has 99.999999999% durability
- **SSL**: Easy setup via AWS Certificate Manager

### Trade-offs Accepted

- No server-side rendering (SSR) or incremental static regeneration (ISR)
- No Next.js API routes - all logic is client-side
- Phase 3 backend will need to be added separately (API Gateway + Lambda)

### Deployment Steps

1. Configure `next.config.js` with `output: 'export'`
2. Build with `next build` (generates static files in `out/` directory)
3. Upload `out/` contents to S3 bucket
4. Configure CloudFront distribution pointing to S3
5. Set up SSL certificate via ACM
6. Configure custom domain (optional)

## Data Storage

### Browser Storage (Phase 1 & 2)

- **localStorage** - Key-value storage in the browser
  - Capacity: ~5-10MB per origin
  - Persistence: Data persists until explicitly cleared
  - API: Synchronous, simple key-value operations

### Storage Keys

| Key              | Description                     |
| ---------------- | ------------------------------- |
| `activeLists`    | Array of active task lists      |
| `completedLists` | Array of completed task lists   |
| `coins`          | User's coin count (number)      |
| `dataBackup`     | Backup data with timestamp/YAML |

### Example Stored Data

**activeLists**:

```json
[
  {
    "id": "1704067200000",
    "title": "Weekly Goals",
    "deadline": "2025-01-15",
    "tasks": [
      {
        "id": "1704067200001",
        "text": "Complete project",
        "completed": false,
        "subtasks": [
          { "id": "1704067200002", "text": "Write tests", "completed": true },
          { "id": "1704067200003", "text": "Deploy", "completed": false }
        ]
      }
    ]
  }
]
```

**coins**:

```json
42
```

## TBD

### Phase 3 Backend

1. **Authentication**: Will users need accounts?

   - AWS Cognito vs Auth0 vs custom?
   - Social login support (Google, GitHub)?

2. **Database**: Preferred database?

   - DynamoDB (NoSQL, serverless)
   - Aurora Serverless (SQL, auto-scaling)

3. **API Style**: REST or GraphQL?

### Features

4. **Sharing**: How should task lists be shared?

   - Share via link?
   - Real-time collaboration?
   - View-only vs edit permissions?

5. **Notifications**: Reminders for approaching deadlines?

### Development

6. **CI/CD**: Automate deployments to S3?

   - GitHub Actions
   - AWS CodePipeline
   - Manual

7. **Testing**: What level?
   - Unit tests?
   - Component tests?
   - E2E tests?