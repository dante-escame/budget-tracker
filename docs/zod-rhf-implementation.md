# Zod + React Hook Form Implementation

## Why This Combination

Before this change every auth form managed field state manually with `useState` (`email`, `password`, `pending`) and performed no client-side validation before sending the request. Errors only came back from the server after a round-trip. The API routes parsed request bodies with a manual `asOptionalString` helper that stripped type information.

**Zod** replaces all manual parsing and validation with declarative schemas that TypeScript understands. **React Hook Form** replaces per-field `useState` with a single `useForm` hook that tracks values, validation state, and submission lifecycle.

---

## Schema Layer (`src/lib/auth/schemas.ts`)

This file defines one Zod schema per auth operation. It has **no `server-only` import** so the same schema runs on both the client (form validation) and the server (API route parsing).

```ts
export const signInSchema = z.object({ email, password });
export type SignInFields = z.infer<typeof signInSchema>;
```

`z.infer<typeof schema>` derives the TypeScript type from the schema — no manual interface needed. Password constraints (min 12, max 128) mirror the server-side `PasswordPolicy` defaults stored in `src/lib/auth/settings.ts`. The server always re-validates; the client constraints give early feedback.

---

## API Route Parsing (`src/lib/auth/http.ts` → `parseBodyWithSchema`)

```ts
const parsed = await parseBodyWithSchema(request, signInSchema);
if (!parsed.ok) return parsed.response;
const { email, password } = parsed.data;
```

`parseBodyWithSchema` wraps `schema.safeParse()` and returns a discriminated union:
- `{ ok: true, data: T }` — fully validated, TypeScript-typed payload
- `{ ok: false, response: NextResponse }` — 400 with the first Zod issue message

The old `parseAuthRouteBody` + boolean guard pattern is gone from every route.

---

## Form Layer — `useForm` + `zodResolver`

RHF replaces individual field `useState` calls. The `zodResolver` adapter connects the Zod schema to RHF's validation engine.

```ts
const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInFields>({
  resolver: zodResolver(signInSchema),
});
```

Key points:
- **`control`** — passed to `Controller` to register each MUI `TextField`
- **`errors`** — keyed by field name; `errors.email?.message` contains the Zod error string
- **`isSubmitting`** — replaces the manual `pending` state; true while `handleSubmit`'s async callback is running
- **`handleSubmit(onSubmit)`** — runs Zod validation before calling `onSubmit`; the callback only fires on valid input

### MUI Integration with `Controller`

MUI `TextField` is a controlled component. RHF's `register` API targets uncontrolled native inputs, so `Controller` is used instead:

```tsx
<Controller
  name="email"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}           // value, onChange, onBlur, ref
      label="Email"
      type="email"
      error={!!errors.email}
      helperText={errors.email?.message}
    />
  )}
/>
```

`{...field}` spreads `value`, `onChange`, `onBlur`, and `ref` onto the MUI component. `error` and `helperText` surface the Zod validation message inline.

---

## Server-Side Error Handling

Zod handles *format* validation (email shape, password length). Business errors that only the server can detect (wrong credentials, duplicate email, expired token) still come back as API responses and are stored in a local `serverError` / `feedback` state:

```ts
async function onSubmit(data: SignInFields) {
  setServerError(null);
  try {
    const response = await fetch('/api/auth/sign-in', { ... });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error ?? 'Unable to sign in.');
    }
    window.location.href = '/dashboard';
  } catch (err) {
    setServerError(err instanceof Error ? err.message : 'Something went wrong.');
  }
}
```

This keeps a clean separation: Zod owns structural validation, the server owns business rules.

---

## `TokenActionForm` — Dynamic Schema

`TokenActionForm` serves two flows (`verify_email` and `reset_password`) with different field sets. The schema is chosen at render time based on the `kind` prop:

```ts
const schema = kind === 'verify_email' ? verifyEmailSchema : resetPasswordSchema;
useForm<TokenFormValues>({
  resolver: zodResolver(schema) as Resolver<TokenFormValues>,
  defaultValues: { token: searchToken, password: '' },
});
```

The `as Resolver<TokenFormValues>` cast is safe: the form type is a superset of both schema types (`token` + optional `password`), and Zod only validates the fields each schema declares. The `password` field's default value (`''`) is ignored by `verifyEmailSchema` because Zod strips unknown keys by default on `z.object`.

`defaultValues.token` is seeded from `useSearchParams()` so users who arrive via an email link have the token pre-filled.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/auth/schemas.ts` | New — all Zod schemas and inferred types |
| `src/lib/auth/http.ts` | Replaced `parseAuthRouteBody` with `parseBodyWithSchema<T>` |
| `src/app/api/auth/sign-in/route.ts` | Uses `parseBodyWithSchema` + `signInSchema` |
| `src/app/api/auth/sign-up/route.ts` | Uses `parseBodyWithSchema` + `signUpSchema` |
| `src/app/api/auth/forgot-password/route.ts` | Uses `parseBodyWithSchema` + `forgotPasswordSchema` |
| `src/app/api/auth/reset-password/route.ts` | Uses `parseBodyWithSchema` + `resetPasswordSchema` |
| `src/app/api/auth/verify-email/route.ts` | Uses `parseBodyWithSchema` + `verifyEmailSchema` |
| `src/components/auth/sign-in-form.tsx` | RHF + Zod; removed 3 `useState` hooks |
| `src/components/auth/sign-up-form.tsx` | RHF + Zod; removed 3 `useState` hooks |
| `src/components/auth/forgot-password-form.tsx` | RHF + Zod; removed 2 `useState` hooks |
| `src/components/auth/token-action-form.tsx` | RHF + Zod; dynamic schema by `kind` |
