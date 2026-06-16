# Backend Directory

This directory contains the Go (Golang) backend for Stockox. It handles all business logic, AI orchestration, market data fetching, caching, and database persistence.

## Architecture
We use a domain-driven design pattern built on top of the Gin web framework.

- `api/`: Vercel serverless entrypoints (`entrypoint.go`).
- `cmd/`: Standard Go executable entrypoints (e.g., local server, background workers).
- `config/`: Configuration loaders (reads from `.env`).
- `database/`: Supabase PostgreSQL connection logic, schema migrations, and GORM models/repositories.
- `pkg/`: Core domain logic (Dashboard, Analysis, Auth, Market). Divided into `controllers`, `services`, and `dto`.

## Running Locally
```bash
go mod download
go run ./cmd/server/main.go
```