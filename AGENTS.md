# AGENTS.md - SaveSlate

Guidance for AI agents working on the SaveSlate codebase.

## Project Overview

Personal finance tracking app: **React 19 + TypeScript + Vite + Tailwind CSS v4**

- **UI Components**: shadcn/ui (Radix primitives, `components.json` configured)
- **Icons**: lucide-react
- **Routing**: react-router-dom v7
- **Theming**: shadcn/ui CSS variable conventions (oklch color space, dark-only)

## Build/Lint/Test Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server with hot reload
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build
npm test             # Run Vitest test suite once
npm run test:watch   # Run Vitest in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright end-to-end suite
npm run test:smoke   # Run Playwright smoke suite only
npx tsc --noEmit     # Type check only
```

Test stack: **Vitest + React Testing Library** (jsdom environment, setup in `tests/setup.ts`) + **Playwright** (browser smoke/E2E).

### Browser Automation (Playwright)

- `playwright-cli` is available in this environment for manual browser automation and debugging.
- Automated browser smoke tests live in `tests/e2e/smoke.spec.ts`.
- If Playwright browsers are missing locally, run `npx playwright install chromium` once.

## Project Structure

```
src/
├── components/
│   ├── layout/      # AppLayout, Sidebar
│   └── ui/          # Card, Badge, Icon (reusable)
├── context/         # React context (ThemeContext)
├── data/mock/       # Mock data for development
├── hooks/           # Custom hooks (useTheme)
├── lib/             # Utilities (utils.ts with cn, formatCurrency)
├── pages/           # Page components (Dashboard, Transactions)
├── types/           # TypeScript type definitions
└── index.css        # Global styles + CSS custom properties
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** with `noUnusedLocals` and `noUnusedParameters`
- Use `type` for unions/aliases, `interface` for object shapes
- Import types with `type` keyword: `import type { Transaction } from '../types'`

### Imports Order

1. External packages (React, lucide-react, etc.)
2. Internal modules (use barrel exports from index.ts)
3. Type imports (with `type` keyword)

```typescript
import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Card, Badge } from "../components/ui";
import { formatCurrency, cn } from "../lib/utils";
import type { Transaction } from "../types";
```

### React Components

- **Function declarations** (not arrow functions) for components
- **Named exports** (default export only for App.tsx)
- **Destructure props** with inline or above-component interfaces

```typescript
interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={cn('base-styles', className)}>{children}</div>;
}
```

### Styling (Tailwind + shadcn CSS Variables)

- Use shadcn CSS variable conventions (oklch color space)
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Mobile-first responsive: `sm:`, `lg:` breakpoints

```typescript
className={cn(
  'bg-card text-foreground',
  isActive && 'border-primary',
  className
)}
```

### Naming Conventions

| Type            | Convention        | Example                |
| --------------- | ----------------- | ---------------------- |
| Components      | PascalCase        | `TransactionRow`       |
| Hooks           | camelCase + `use` | `useTheme`             |
| Utilities       | camelCase         | `formatCurrency`       |
| Types           | PascalCase        | `Transaction`          |
| Constants       | SCREAMING_SNAKE   | `TRANSACTIONS`         |
| CSS vars        | kebab-case        | `--background`         |
| Component files | PascalCase.tsx    | `Dashboard.tsx`        |
| Utility files   | camelCase.ts      | `utils.ts`             |

### State Management

- **React Context** for global state (theme)
- **Local state** (`useState`) preferred when possible
- **`useMemo`** for expensive computations
- Split context: definition in `*-context.ts`, provider in `*Context.tsx`

### Error Handling

```typescript
// Throw in hooks when misused
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

## Key Theme Variables (src/index.css)

Uses shadcn/ui naming conventions with oklch color space. Dark-only — variables defined under `:root` directly.

### shadcn Standard Colors

| Variable                  | Purpose                          | Tailwind Usage            |
| ------------------------- | -------------------------------- | ------------------------- |
| `--background`            | Main background                  | `bg-background`           |
| `--foreground`            | Primary text                     | `text-foreground`         |
| `--card` / `--popover`    | Card/popover backgrounds         | `bg-card`, `bg-popover`   |
| `--primary`               | Brand accent (#55aec8)           | `bg-primary`, `text-primary` |
| `--secondary`             | Hover surfaces (#1c1c21)         | `bg-secondary`            |
| `--muted`                 | Muted surfaces                   | `bg-muted`                |
| `--muted-foreground`      | Secondary text (#9aa8a6)         | `text-muted-foreground`   |
| `--accent`                | Active/highlight surface (#23232a)| `bg-accent`              |
| `--destructive`           | Danger/error (#ef6a6a)           | `bg-destructive`          |
| `--border` / `--input`    | Standard borders                 | `border-border`           |
| `--ring`                  | Focus rings                      | `ring-ring`               |

### Domain-Specific Colors (custom)

| Variable       | Purpose          | Tailwind Usage      |
| -------------- | ---------------- | ------------------- |
| `--income`     | Income (green)   | `text-income`       |
| `--expense`    | Expense (red)    | `text-expense`      |
| `--transfer`   | Transfer (blue)  | `text-transfer`     |
| `--split`      | Split (purple)   | `text-split`        |
| `--goal`       | Goal (blue)      | `text-goal`         |
| `--warning`    | Warning (yellow) | `text-warning`      |
| `--dimmed`     | Tertiary text    | `text-dimmed`       |

### Other Theme Values

Shadows, radius, transitions, layout, and fonts are defined in the `@theme` block. Use `property-(--variable)` syntax for non-color values:

```tsx
className="rounded-(--radius-md) shadow-(--shadow-md)"
```

## Icons (lucide-react)

```typescript
import { TrendingUp, Search } from 'lucide-react';
<TrendingUp className="w-4 h-4 text-income" />
```

For dynamic icons by name, use `<Icon name="TrendingUp" />` from `components/ui/Icon.tsx`.

## File Organization Rules

- One component per file (sub-components allowed)
- Use `index.ts` barrel exports for directories
- Pages in `pages/`, reusable components in `components/ui/`
- Co-locate hooks near their context

## CSS Component Classes (Tailwind v4)

We use `@layer components` in `src/index.css` for reusable styles. These CSS classes are being **migrated to shadcn/ui components** — see `SHADCN_MIGRATION.md` for the full plan.

### Currently Available Classes (will be replaced in Phase 3)

| Category   | Classes                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| Buttons    | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`                 |
| Forms      | `.input`, `.select`, `.label`                                                       |
| Cards      | `.card`, `.card-hover`                                                              |
| Badges     | `.badge`, `.badge-accent`, `.badge-income`, `.badge-expense`, `.badge-muted`        |
| Typography | `.heading-1`, `.heading-2`, `.heading-3`, `.section-title`, `.section-action`, `.text-body`, `.text-muted`, `.text-ui`, `.text-link`, `.label` |
| Navigation | `.nav-link`, `.nav-link-active`                                                     |
| Layout     | `.page-container`, `.divider`                                                       |

> **Note:** Once shadcn components are added (Phase 3), prefer using the shadcn component over the CSS class. New code should use shadcn components when available.

### Tailwind v4 CSS Variable Syntax

**IMPORTANT:** Tailwind v4 uses a specific syntax for CSS custom properties.

#### Colors (registered in `@theme`)

Use the shadcn variable name directly:

```tsx
// ✅ CORRECT - Tailwind v4 with shadcn variables
className="bg-card text-foreground border-primary"
className="text-income bg-muted"

// ❌ WRONG - old var() syntax
className="bg-[var(--card)] text-[var(--foreground)]"
```

#### Non-color values (shadows, radius, transitions)

Use `property-(--variable)` syntax:

```tsx
// ✅ CORRECT
className="rounded-lg shadow-(--shadow-md)"

// ❌ WRONG
className="rounded-[var(--radius-lg)]"
```

### Adding New Styles

1. Add CSS variables to `:root` block in `src/index.css`
2. Register in `@theme inline` block for Tailwind v4 usage
3. Create component classes in `@layer components` (or prefer shadcn components)
4. Use `@apply` with Tailwind utilities

Example:

```css
:root {
  --new-color: oklch(0.5 0.1 200);
}

@theme inline {
  --color-new-color: var(--new-color);
}
```

### Usage Examples

```tsx
// Page with heading
<div className="page-container">
  <h1 className="heading-1">Page Title</h1>
  <p className="text-body">Description text</p>
</div>

// Form elements
<input className="input" placeholder="Search..." />
<select className="select">...</select>

// Buttons
<button className="btn-primary">Submit</button>
<button className="btn-secondary">Cancel</button>
<button className="btn-icon"><Icon name="X" /></button>

// Cards
<div className="card">Static card</div>
<div className="card-hover">Clickable card</div>

// Navigation (Sidebar)
<NavLink className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}>
  Dashboard
</NavLink>
```
