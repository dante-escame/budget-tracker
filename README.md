# Budget Tracker

A personal finance app for tracking income, expenses, and budgets.

## Chosen Stack
- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- MUI (`@mui/material`) with Emotion as the styling engine
- `@mui/material-nextjs` App Router cache integration
- `@mui/icons-material` for iconography
- Docker multi-stage build with Next.js `standalone` output
- Vercel deployment target

## Architecture Direction
This project uses the App Router architecture:
- Route files live under `src/app/`.
- Server Components are the default.
- Client Components should be introduced only for interactivity, browser APIs, or local UI state.
- Styling and design tokens flow exclusively through the MUI theme defined in `src/theme/theme.ts`. Components consume `theme.palette`, `theme.spacing`, and `theme.typography` instead of hard-coding values.

Planned structure:
- `src/app/` for routes and layouts
- `src/components/` for reusable UI components and budget-tracking primitives
- `src/lib/` for utilities and future integrations (currency math, formatting, persistence helpers)
- `src/theme/` for the MUI theme, palette tokens, and typography setup
- `public/` for static assets
- `docs/` for project documentation, architecture notes, and mermaid diagrams
- `tests/` for automated tests when introduced

## Design Direction
- Mood: calm and friendly based on light green and strong yellow colors
- Palette: light green for structure and primary actions, abundant light yellow for atmosphere and highlight surfaces, soft cream backgrounds, deep green-tinged neutrals for text
- Typography: Inter for body and headings, Roboto Mono reserved for monetary figures and tabular numerics
- UI language: rounded corners, low-elevation shadows, soft 1px dividers, generous whitespace, no glow effects

### Palette Tokens
| Token | Value |
| --- | --- |
| `primary.main` | `#88C9A1` |
| `primary.light` | `#B5E2C5` |
| `primary.dark` | `#5DA77A` |
| `secondary.main` | `#FFF1A8` |
| `secondary.light` | `#FFF8C7` |
| `secondary.dark` | `#E6D070` |
| `background.default` | `#FAFBE9` |
| `background.paper` | `#FFFFFF` |
| `text.primary` | `#2E3A2E` |
| `text.secondary` | `#4F5D4F` |
| `divider` | `#E0E8DC` |

## Documentation
- Project documentation lives in `docs/`.
- Architecture notes and flows are written with mermaid diagrams.