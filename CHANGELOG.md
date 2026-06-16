# Changelog

All notable changes to the **Stockox** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Enterprise-level project documentation in `/docs` directory.
- AI Committee implementation with specialized agents (Research, Technical, News, Risk).
- Go (Gin) backend architecture with Redis caching and Supabase integration.
- Next.js 15 frontend with Neo-Brutalist UI and premium glassmorphism aesthetics.
- Clerk Authentication webhook sync to local database.
- Complete `schema.sql` defining relational tables for portfolios, agents, recommendations, and analysis sessions.
- Vercel deployment configurations for both Next.js and Go serverless functions.

### Changed
- Centralized external API calls exclusively to the Go backend to ensure frontend remains purely presentational.
- Fixed Vercel deployment build error in `entrypoint.go` by correcting injected repository dependencies for the Dashboard service.

### Fixed
- Missing `*gorm.DB` argument in `NewDashboardService` initialization within the Vercel entrypoint.
