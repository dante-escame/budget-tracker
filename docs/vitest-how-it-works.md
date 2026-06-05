# Vitest — How It Works in This Project

## Why Vitest

Vitest is a Vite-native test runner. Compared to Jest it is 2–4× faster on cold runs and shares the same `vite.config` transform pipeline, which means TypeScript, path aliases, and JSX all work out of the box. It runs tests in parallel worker threads by default.

---

## Configuration (`vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'server-only': resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
});
```

Key options:

| Option | What it does |
|--------|-------------|
| `environment: 'jsdom'` | Provides `window`, `document`, and the full DOM API so React components can render |
| `globals: true` | Injects `describe`, `it`, `expect`, `vi` without explicit imports (mirrors Jest globals) |
| `setupFiles` | Runs before every test file; used to load `@testing-library/jest-dom` matchers |
| `resolve.alias['@']` | Maps `@/` imports to `src/` — matches the `tsconfig.json` paths setting |
| `resolve.alias['server-only']` | Replaces Next.js's `server-only` guard with a no-op stub so server-side modules can be imported in tests |

---

## Setup File (`tests/setup.ts`)

```ts
import '@testing-library/jest-dom/vitest';
```

This registers custom DOM matchers like `toBeInTheDocument()`, `toHaveValue()`, `toBeDisabled()`, etc. on Vitest's `expect`.

---

## `server-only` Mock (`tests/mocks/server-only.ts`)

Next.js ships a `server-only` package that throws at import time when used outside a server context. Many lib files in this project import it as a guard. The Vitest config aliases `server-only` to an empty stub so those imports succeed in tests:

```ts
// tests/mocks/server-only.ts
export {};
```

Only files that legitimately test server logic need this mock. Pure client-side modules (components, schemas) don't import `server-only` and don't require it.

---

## Test Directory Structure

```
tests/
├── setup.ts           — global test setup (jest-dom matchers)
├── mocks/
│   └── server-only.ts — stub for Next.js server-only guard
└── unit/
    └── auth-schemas.test.ts
```

Following the guidelines in `docs/for-ai/tests-guidelines.md`, the structure expands as:

```
tests/
├── unit/         — isolated logic (schemas, utilities, hooks)
├── integration/  — composed components, route sections, MUI ThemeProvider trees
└── e2e/          — critical browser flows (Playwright)
```

---

## Writing Tests

### Unit test (no DOM)

```ts
import { describe, it, expect } from 'vitest';
import { signInSchema } from '@/lib/auth/schemas';

describe('signInSchema', () => {
  it('accepts a valid email and password', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'correcthorsebattery',
    });
    expect(result.success).toBe(true);
  });
});
```

No DOM needed — Zod schemas are pure functions.

### Component test (DOM + React)

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/theme/theme';
import { SignInForm } from '@/components/auth/sign-in-form';

it('shows a validation error for an invalid email', async () => {
  render(
    <ThemeProvider theme={theme}>
      <SignInForm />
    </ThemeProvider>
  );

  await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
});
```

Wrap MUI components in `ThemeProvider` so palette, typography, and spacing behave as in production (required per `tests-guidelines.md`).

---

## Running Tests

```bash
npm test          # single run (CI)
npm run test:watch  # interactive watch mode (development)
```

Vitest outputs a summary table with file count, test count, duration, and any failures.

---

## What Vitest Cannot Test

- **Async React Server Components** — Vitest cannot render RSCs because they rely on the React flight/streaming runtime that only runs inside Next.js. Test RSC logic (data fetching, guards) at the unit level by calling the underlying functions directly, not by rendering the component.
- **Next.js middleware** — Route handlers and middleware that depend on `NextRequest`/`NextResponse` internals need either a running Next.js server (integration/E2E) or manual mocking.
- **Real browser behavior** — Use Playwright for flows that require navigation, cookies, or multi-tab interactions.
