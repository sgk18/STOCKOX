# Stockox

> **AI-Powered Multi-Agent Investment Intelligence Platform**
> 
> *Bloomberg Terminal meets OpenAI meets a Hedge Fund Operating System.*

---

## 🚀 Project Overview

### Problem Statement
Retail investors and financial enthusiasts often lack access to institutional-grade tools that synthesize real-time market data, technical indicators, news sentiment, and risk analysis into an actionable format. Most available tools are either isolated screeners, simple portfolio trackers, or overly complex platforms without AI-assisted synthesis.

### Solution
**Stockox** is an AI investment operating system that leverages an innovative **AI Committee** approach. Instead of relying on a single LLM prompt, Stockox coordinates multiple specialized AI agents (Research, Technical, News, and Risk) that independently analyze a stock. Their findings are aggregated by a Committee Agent to produce a final, highly confident investment recommendation.

---

## ✨ Key Features

- **The AI Committee**: Specialized autonomous agents perform Research, Technical Analysis, News Analysis, and Risk Evaluation to generate a unified investment decision.
- **Real-Time Market Data**: Integration with high-fidelity financial APIs (Finnhub, Alpha Vantage) synced via Redis cache.
- **Portfolio Intelligence**: Track holdings, evaluate cash balance, and monitor daily changes in an intuitive dashboard.
- **Neo-Brutalist UI**: A premium glassmorphism interface built with Next.js 15, TailwindCSS, and Shadcn UI, designed to look like a venture-backed fintech platform.
- **Enterprise Architecture**: Complete separation of concerns with a Go (Gin) backend handling all business logic and external API integrations, keeping the frontend purely presentational.

---

## 🏗️ Architecture & Technology Stack

### Technology Stack
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, Shadcn UI, TanStack Query, Framer Motion
- **Backend**: Go, Gin Framework, GORM
- **Database**: Supabase PostgreSQL
- **Caching**: Redis
- **Authentication**: Clerk
- **External APIs**: Finnhub (Future: Polygon, Alpha Vantage, OpenAI/OpenRouter)
- **Deployment**: Vercel (Frontend & Backend), Supabase (DB)

### Architecture Flow
1. **Frontend** strictly handles presentation and state via TanStack Query.
2. **Backend (Go)** manages all business logic, AI agent coordination, and external API calls.
3 **Caching Layer (Redis)** prevents redundant API calls for quotes and news.
4. **Database (Supabase)** is the single source of truth for portfolios, watchlists, analysis sessions, and recommendations.

---

## 📸 Screenshots

*(Add screenshots of your application here)*
- Dashboard Overview
- Research Terminal
- AI Committee Analysis View

---

## 💻 Installation Guide

### Local Development Setup

#### Prerequisites
- Node.js (v18+)
- Go (1.21+)
- PostgreSQL / Supabase CLI
- Redis
- Clerk Account

#### Environment Variables
Copy the `.env.example` file to your root or respective directories and populate the required keys. See `.env.example` for details.

#### Database Setup
1. Create a Supabase project or set up a local PostgreSQL database.
2. Run the SQL migration scripts located in `backend/database/schema.sql`.

#### Running the Backend
```bash
cd backend
go mod download
go run ./cmd/server/main.go
```

#### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 Deployment Instructions

- **Frontend**: Deploy via Vercel connecting to your GitHub repository. Ensure UI environment variables are set.
- **Backend**: Deploy via Vercel (using the Go runtime configuration in `vercel.json`). Set API secrets and database URLs.
- **Database**: Hosted on Supabase.
- **Cache**: Hosted Redis instance (e.g., Upstash).

---

## 🗺️ Roadmap & Future Plans

- **Phase 1**: Core Dashboard, Multi-Agent Architecture, Finnhub Integration. *(Completed)*
- **Phase 2**: Real-time WebSockets, Advanced Risk Modeling, Clerk Webhook Sync. *(In Progress)*
- **Phase 3**: Custom AI Agent Prompting, Portfolio Rebalancing Suggestions, Polygon.io Integration.
- **Phase 4**: Band Protocol Integration for decentralized oracle data validation.

---

## 🤝 Contributing

We welcome contributions! Please review our [Contributing Guide](CONTRIBUTING.md) for details on our coding standards, branch strategy, and PR process.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
