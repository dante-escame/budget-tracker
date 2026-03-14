# Budget Tracker (React + Next.js + MongoDB)

This project is a full-stack monthly budget tracker designed for your workflow:

- Front-end in **React** (with Next.js App Router client components).
- Back-end in **Next.js Route Handlers**.
- Database in **MongoDB** using **Mongoose**.
- Imports one month bank statement via CSV and auto-tags outcomes.

## Core Features

- Monthly statement import (`date,description,amount` headers expected).
- Auto-tagging categories:
  - `Essential` keywords:
    - `Wellhub`
    - `Growth`
    - `iFood`
    - `Claro`
    - `Solange Villela Dos Reis Escame`
  - `Savings` keyword:
    - `Compra de Ações`
  - Otherwise defaults to `Non-Essential`.
- Optional flags per transaction:
  - `credit` (credit card purchase)
  - `investment` (pix out to invest / coin conversion)
- Month-by-month filtering.
- Charts:
  - Pie chart by category.
  - Bar chart for credit total vs investment total.

## API Endpoints

- `POST /api/import`
  - Accepts JSON: `{ "csvContent": "..." }`
  - Parses and stores only negative amount rows as expenses.
- `GET /api/transactions?month=YYYY-MM`
  - Lists imported transactions for selected month.
- `PATCH /api/transactions`
  - Updates transaction fields (`category`, `credit`, `investment`).
- `GET /api/summary?month=YYYY-MM`
  - Returns totals for charting.

## Database Model

`Transaction`

- `date: Date`
- `description: string`
- `amount: number` (stored as positive expense value)
- `month: string` (`YYYY-MM`)
- `category: Essential | Non-Essential | Savings`
- `credit: boolean` (optional, default `false`)
- `investment: boolean` (optional, default `false`)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local`:
   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
   ```
3. Start app:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Bank Statement Import Format

Provide CSV with headers similar to:

```csv
date,description,amount
2026-02-01,Wellhub,-120.00
2026-02-02,Compra de Ações,-500.00
2026-02-03,Random Store,-45.90
```

> If your bank export format differs, you can share the sample file and we can adapt parser rules inside `app/api/import/route.ts`.
