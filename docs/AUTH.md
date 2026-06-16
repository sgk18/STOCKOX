# Authentication Flow Documentation

Stockox uses **Clerk** for user identity management, combined with a custom JWT middleware in the Go backend to authorize requests and sync data to a local Supabase instance.

## Overview
1. **Frontend Authentication**: Users sign in/up via Clerk's pre-built UI components on the Next.js frontend.
2. **Token Generation**: Clerk issues a short-lived session JWT to the client.
3. **API Authorization**: The frontend attaches this JWT as a Bearer token in the `Authorization` header for all backend requests.
4. **Backend Verification**: The Go backend intercepts the request, decodes the JWT using the Clerk Secret Key, and verifies its signature and expiration.
5. **Data Synchronization**: A webhook integration ensures that user records in Clerk are perfectly mirrored in the local Supabase `users` table.

## Clerk Integration

### Frontend
- Wrapped in `<ClerkProvider>`.
- Protected routes use Next.js Middleware (`src/middleware.ts`) to redirect unauthenticated users to `/sign-in`.
- Uses `useAuth()` hook to retrieve the `getToken()` function for backend requests.

### Backend Middleware
Located in `backend/pkg/middleware/auth.go`.
- Extracts the `Authorization` header.
- Parses the token.
- Retrieves the user ID (Clerk ID subject).
- Injects the internal User ID into the Gin `*gin.Context` for downstream controllers to use.

## User Synchronization (Webhooks)
To maintain referential integrity in our local Supabase database (e.g., attaching portfolios to users), we sync Clerk data locally.

- **Route**: `POST /api/v1/webhooks/clerk`
- **Security**: The webhook handler verifies the `svix-signature` header using the `CLERK_WEBHOOK_SECRET` to ensure the payload actually came from Clerk.
- **Action**: On `user.created` or `user.updated`, it inserts or updates the corresponding row in the `users` table. It also automatically provisions an empty `portfolio` for new users.

## Protected Routes
By default, all routes under `/api/*` (except `/api/v1/webhooks/*` and `/health`) are protected by the `Auth` middleware. Attempting to access these without a valid JWT results in a `401 Unauthorized` response.