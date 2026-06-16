# Architecture Document

## Overview
Stockox utilizes a modern, decoupled architecture ensuring scalability, security, and clear separation of concerns. The frontend is strictly responsible for presentation and user state, while a robust backend written in Go handles all business logic, data persistence, AI orchestration, and external integrations.

## System Design Diagram
```text
[ Web Client ] <---> [ Next.js 15 Frontend ]
                          | (HTTP REST / WebSocket)
                          v
               [ Go (Gin) API Backend ]
               /          |            \
     [ Redis Cache ]  [ Supabase DB ]  [ External APIs ]
         (Quotes,          (Users,        (Finnhub, Clerk,
          News)          Portfolios,       AI/LLMs)
                         Analyses)
```

## Frontend Architecture
- **Framework**: Next.js 15 (App Router).
- **Language**: TypeScript (Strict mode).
- **Styling**: TailwindCSS with Shadcn UI components.
- **State Management**: TanStack Query (React Query) for server state; Zustand (or React Context) for UI state.
- **Rule**: The frontend *never* calls external financial or AI APIs directly. All requests must go through the backend API.

## Backend Architecture
- **Framework**: Go with the Gin web framework.
- **Structure**: Domain-driven design.
  - `cmd/`: Application entrypoints.
  - `api/`: Vercel serverless function entrypoints.
  - `pkg/`: Domain logic grouped by feature (e.g., `market/`, `analysis/`, `dashboard/`).
  - `database/`: Schema and repository layer using GORM.
- **Concurrency**: Go routines are used for parallelizing independent data fetching (e.g., parallelizing the AI agents' analysis requests).

## Database Architecture
- **Engine**: PostgreSQL hosted on Supabase.
- **ORM**: GORM in the Go backend.
- **Core Entities**: Users, Portfolios, Portfolio Holdings, Watchlists, Analysis Sessions, Recommendations, and Agent Messages.
- **Integrations**: Clerk IDs map 1:1 with internal User IDs for seamless data retrieval.

## Authentication Flow
1. User authenticates via **Clerk** on the Next.js frontend.
2. The frontend receives a short-lived Clerk session JWT.
3. The frontend includes this JWT in the `Authorization: Bearer <token>` header for backend requests.
4. The Go backend's `Auth` middleware verifies the JWT against Clerk's public keys.
5. If valid, the user context is injected into the Gin context.
6. A Clerk Webhook syncs user creation/updates to the local Supabase `users` table.

## Data Flow
### Market Data Flow
1. Client requests a stock quote (`GET /api/v1/stocks/:ticker`).
2. Backend checks **Redis Cache**.
   - *Hit*: Returns cached data.
   - *Miss*: Calls external provider (e.g., Finnhub), caches the result, and returns it.

### AI Committee Flow
1. Client requests analysis (`POST /api/v1/analysis/start`).
2. Backend creates an `AnalysisSession` in the DB.
3. Backend spawns parallel goroutines for the Research, Technical, News, and Risk agents.
4. Agents fetch required market/news data, then call the LLM API to generate insights.
5. Agent responses are saved to `agent_messages`.
6. The `Committee Agent` triggers, reading all other agent messages, calculates a confidence score, and determines the final recommendation.
7. Result is persisted to `recommendations` and broadcasted to the frontend.

## Deployment Flow
- **Frontend**: Hosted on Vercel. Continuous deployment via GitHub integration.
- **Backend**: Hosted on Vercel as serverless Go functions (`api/entrypoint.go`).
- **Database**: Supabase standard managed PostgreSQL instance.
- **Cache**: Upstash Serverless Redis.