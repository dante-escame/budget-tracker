# Budget Tracker

Fullstack budget tracker built around free-tier services:

- Next.js App Router for frontend and backend route handlers
- Vercel for automatic deployments
- MongoDB Atlas free tier for data storage
- Mongoose for MongoDB integration
- NextAuth credentials authentication with email and password

Each authenticated user only sees their own transactions and summaries.

## Included Features

- Account creation with email and password
- Sign in and sign out with NextAuth
- CSV import for monthly bank statements
- Automatic category tagging
- Month filtering, editable transaction flags, and charts
- User-scoped API routes backed by MongoDB Atlas

## Architecture

- Frontend: Next.js + React
- Backend: Next.js route handlers, which run as serverless functions on Vercel
- Database: MongoDB Atlas free cluster
- ODM: Mongoose
- Auth: NextAuth credentials provider

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
NEXTAUTH_SECRET=replace-with-a-long-random-string
NEXTAUTH_URL=http://localhost:3000
```

For production on Vercel, set the same variables in the Vercel project settings and use your deployed domain for `NEXTAUTH_URL`.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example`
3. Start the app:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`

## Vercel Deployment

1. Push this repository to GitHub
2. Import the repo in Vercel
3. Add these environment variables in Vercel:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
4. Deploy

After the first deploy, Vercel will automatically redeploy on each push to the connected branch.

## MongoDB Atlas Free Setup

1. Create a free cluster in MongoDB Atlas
2. Create a database user
3. Add network access for your environment and Vercel
4. Copy the connection string into `MONGODB_URI`

## Main API Routes

- `POST /api/register`: create a user account
- `POST /api/auth/[...nextauth]`: authenticate with NextAuth
- `POST /api/import`: import CSV transactions for the signed-in user
- `GET /api/transactions?month=YYYY-MM`: list that user's transactions
- `PATCH /api/transactions`: update that user's transaction fields
- `GET /api/summary?month=YYYY-MM`: return that user's chart summary

## CSV Format

```csv
date,description,amount
2026-02-01,Wellhub,-120.00
2026-02-02,Compra de Acoes,-500.00
2026-02-03,Random Store,-45.90
```

Only negative rows are imported as expenses.
