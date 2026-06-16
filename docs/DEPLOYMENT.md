# Deployment Documentation

Stockox is designed to be deployed in a serverless environment to minimize costs and maximize scalability. The primary deployment targets are **Vercel** (for both Frontend and Backend) and **Supabase** (for the database).

## Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel.
2. Ensure the Framework Preset is set to **Next.js**.
3. The root directory should be set to `frontend` (or run Vercel from the `frontend` directory).
4. **Environment Variables Required**:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

## Backend Deployment (Vercel Serverless Functions)

The Go backend uses `github.com/vercel/go-bridge` to compile Gin routes into serverless functions.

1. Create a new Vercel project pointing to the `backend` directory.
2. Vercel will automatically detect the `vercel.json` configuration file.
3. The `vercel.json` file routes all traffic to `api/entrypoint.go`.
4. **Environment Variables Required**:
   - `APP_ENV=production`
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (or a single `DATABASE_URL`)
   - `JWT_SECRET`
   - `CLERK_WEBHOOK_SECRET`
   - `FINNHUB_API_KEY`
   - `REDIS_URL`

## Database Deployment (Supabase)

1. Create a new project in Supabase.
2. Navigate to the SQL Editor.
3. Paste the contents of `backend/database/schema.sql` and run it.
4. Retrieve your database connection string and add it to your Backend's Vercel Environment Variables.

## Redis Configuration (Upstash)

Because serverless functions are stateless, we use Redis for rate limiting and caching external API calls.
1. Create a Serverless Redis database on Upstash.
2. Copy the `REDIS_URL` and provide it to your Backend Vercel project.

## Production Checklist

- [ ] All environment variables are set in both Vercel projects.
- [ ] Supabase database migrations have been run successfully.
- [ ] Clerk Webhook URL is configured to point to `https://<your-backend-domain>/api/v1/webhooks/clerk`.
- [ ] API Rate limiting is enabled via Redis.
- [ ] CORS in the Go backend allows requests *only* from your Next.js production domain.