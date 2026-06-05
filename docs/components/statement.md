# Statement feature

Monthly bank-statement screen at `/dashboard/statement`: a sortable, paginated grid of
entries for a selected month, plus CSV statement import.

## Architecture

```
src/app/dashboard/statement/page.tsx        Server Component — auth guard + data fetch
src/components/statement/StatementView.tsx   Client — month filter, sortable grid, summary
src/components/statement/ImportStatementDialog.tsx  Client — CSV upload dialog
src/app/api/entries/import/route.ts          POST — server-side CSV parse + upsert
src/lib/entries/*                            csv → schema → transform → repo → service
```

Data flows server-first: the page (a Server Component) resolves the user with
`requireVerifiedAuthenticatedUser()`, fetches the available months and the selected
month's entries via `getEntryService()`, and passes plain serializable props
(`Entry.Record[]`, `Entry.MonthOption[]`) to the client grid.

## `StatementView`

```tsx
<StatementView months={months} selectedMonth={selectedMonth} entries={entries} />
```

- **Month filter** — a `TextField select`; changing it navigates to
  `/dashboard/statement?month=YYYY-MM`, re-rendering the server page.
- **Grid** — `Table` + `TableSortLabel` (click-to-sort on Date / Description / Category /
  Type / Amount) + `TablePagination`. Sort and pagination are client-side over the month's
  rows. Amount is rendered in `--font-roboto-mono`, green for income, red for expense.
- **Summary** — income / expenses / net totals for the month.

## CSV import

`ImportStatementDialog` uploads the file as `multipart/form-data` to
`POST /api/entries/import`, which parses it server-side and returns an
`Entry.ImportSummary` (`{ total, inserted, skipped, errors }`).

**Idempotency:** each statement row carries a UUID (`Identificador`) stored as
`Entry.Document.external_id`. A unique sparse index on `{ user_id, external_id }` plus an
upsert (`$setOnInsert`) means re-importing the same file inserts nothing and reports those
rows as `skipped`. Invalid rows are collected as `errors` without aborting the import.

## CSV format

`Data,Valor,Identificador,Descrição` — date `dd/MM/yyyy`, signed reais amount (sign sets
`flow`), transaction UUID, free-text description. See `files/statement-template.csv`.
