# Contributing to Stockox

Thank you for your interest in contributing to **Stockox**, the AI-Powered Multi-Agent Investment Intelligence Platform. This document outlines the guidelines and standards for contributing to our open-source project.

## 🚀 Project Setup

1. **Fork the Repository**: Start by forking the main Stockox repository to your GitHub account.
2. **Clone Locally**: `git clone https://github.com/your-username/stockox.git`
3. **Install Dependencies**:
   - For frontend: `cd frontend && npm install`
   - For backend: `cd backend && go mod tidy`
4. **Environment Setup**: Copy `.env.example` to your respective `.env` files and populate with development keys.
5. **Database**: Run `backend/database/schema.sql` on your local PostgreSQL or Supabase instance.

## 📐 Coding Standards

### Frontend (Next.js / TypeScript)
- Use strict TypeScript. No `any` types unless absolutely necessary.
- Follow the established **Neo-Brutalist / Premium Glassmorphism** design system.
- Ensure all styling is handled via TailwindCSS and Shadcn UI components.
- Do NOT add complex business logic or direct database/external API calls in the Next.js app. All requests must go through the Go backend.

### Backend (Go / Gin)
- Follow SOLID principles and use Go interfaces for modularity.
- Keep handlers thin; move business logic into the `service` layer.
- Ensure database interactions remain in the `repositories` layer.
- Add descriptive logs and handle errors gracefully returning standardized JSON error responses.

## 🌿 Branch Strategy

We follow a feature-branch workflow:
- `main`: The stable, production-ready branch.
- `develop` (optional): For integration testing before merging to main.
- Feature branches: `feature/short-description`
- Bugfix branches: `bugfix/issue-description`
- Documentation branches: `docs/what-changed`

## 📝 Commit Guidelines

Please write clear, concise commit messages focused on *why* the change was made.

**Format:**
`<type>(<scope>): <subject>`

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing or correcting existing tests

**Example:**
`feat(ai-committee): add confidence score calculation logic`

## 🔄 Pull Request Process

1. Ensure your code passes all local linting and compilation checks.
2. Push your branch to your fork.
3. Open a Pull Request against the `main` branch of the official repository.
4. Provide a clear description of the problem solved or feature added.
5. Include screenshots if your PR includes UI changes.
6. A maintainer will review your code. Address any requested changes.

## 📁 Folder Conventions

- **`/frontend/src/app`**: Next.js App Router pages.
- **`/frontend/src/components`**: Reusable React components.
- **`/backend/api`**: Serverless entrypoints (Vercel).
- **`/backend/cmd`**: Standard executable entrypoints.
- **`/backend/pkg`**: Core domain logic, services, and controllers.
- **`/backend/database`**: Database connection logic and schema migrations.
- **`/docs`**: Project documentation.

Welcome to the team!
