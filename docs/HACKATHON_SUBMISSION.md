# Hackathon Submission

## Problem
Retail investors lack access to the sophisticated, multi-layered analytical tools used by institutional hedge funds. While data is abundant, the ability to synthesize fundamental metrics, technical indicators, breaking news, and macro-risk into a single, cohesive investment thesis is nearly impossible for an individual. Most "AI Finance" tools are simple chatbots that easily hallucinate or lack deep context.

## Solution: Stockox
**Stockox** is an AI-Powered Multi-Agent Investment Intelligence Platform. Instead of a single LLM, Stockox utilizes an **AI Committee**. It orchestrates a team of specialized AI agents—Research, Technical, News, and Risk—that independently analyze a stock. A master Committee Agent then aggregates these findings, weights the arguments, and produces a highly confident, transparent investment recommendation.

## Architecture Highlights
- **Decoupled System**: A strictly presentational Next.js 15 frontend communicates with a robust Go (Gin) backend.
- **High Performance**: Go routines allow parallel execution of multiple AI agents, reducing analysis time drastically.
- **Caching**: Serverless Redis prevents rate-limiting from financial APIs and speeds up user requests.
- **Serverless**: Fully deployed on Vercel (Next.js + Go serverless functions) with Supabase (PostgreSQL).

## The AI Committee Workflow
1. **Trigger**: User requests analysis on `$NVDA`.
2. **Parallel Execution**: 
   - *Research Agent* pulls SEC summaries.
   - *Technical Agent* pulls SMA/RSI data.
   - *News Agent* pulls breaking sentiment.
   - *Risk Agent* evaluates volatility.
3. **Debate**: Agents stream their findings to the database and UI via WebSockets.
4. **Resolution**: The Committee Agent synthesizes the 4 reports and issues a final `BUY/HOLD/SELL` rating with a 0-100 Confidence Score.

## Technologies Used
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, Shadcn UI, Framer Motion.
- **Backend**: Go (Golang), Gin Framework, GORM.
- **Database/Cache**: Supabase (PostgreSQL), Upstash (Redis).
- **Auth**: Clerk.
- **APIs**: Finnhub.

## Demo Instructions
1. Navigate to the live URL.
2. Sign in using the Clerk authentication flow.
3. View the Dashboard to see your pre-loaded demo portfolio.
4. Go to the **AI Committee** tab, enter a ticker (e.g., `AAPL`), and watch the agents analyze the stock in real-time to provide a recommendation.

## Judging Highlights
- **Complex Orchestration**: Managing parallel AI agent execution in Go.
- **Enterprise Design**: The UI is designed to look like a venture-backed fintech product (Neo-Brutalist / Premium Glassmorphism), avoiding generic bootstrap templates.
- **Production Ready**: Full database schema, webhook synchronization, and CI/CD deployment setups are implemented.

## Future Roadmap
- Integration with **Band Protocol** for decentralized, tamper-proof financial oracle data to feed the AI agents.
- Automated portfolio rebalancing suggestions.