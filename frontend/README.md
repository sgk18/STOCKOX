# Frontend Directory

This directory contains the Next.js 15 application for Stockox. It is built strictly as a presentational layer and state consumer. 

## Rules
- **No Direct DB Calls**: The frontend must never talk to Supabase directly.
- **No Direct Financial API Calls**: Do not call Finnhub or other market providers from here. All requests must route through our Go backend.
- **Styling**: Strict adherence to the Neo-Brutalist / Premium Glassmorphism design system using TailwindCSS and Shadcn UI.

## Structure
- `src/app/`: Next.js App Router pages (Dashboard, Auth, etc.).
- `src/components/`: Reusable UI components organized by feature and generic `ui/`.
- `src/lib/`: State management stores (Zustand/Context), utility functions, and Supabase client configs.

## Running Locally
```bash
npm install
npm run dev
```