# AGENTS.md - MeloMoney

Guidance for AI agents working on the MeloMoney codebase.

## Project Overview

Personal finance tracking app: **React 19 + TypeScript + Vite + Tailwind CSS v4**

- **Icons**: lucide-react
- **Routing**: react-router-dom v7
- **Theming**: CSS custom properties with dark mode support

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

### Styling (Tailwind + CSS Variables)

- Use CSS custom properties
- Use `cn()` utility for conditional classes
- Mobile-first responsive: `sm:`, `lg:` breakpoints

```typescript
className={cn(
  'bg-bg-card text-(--color-text-primary)',
  isActive && 'border-(--color-accent)',
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
| CSS vars        | kebab-case        | `--color-text-primary` |
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

| Variable                 | Purpose              |
| ------------------------ | -------------------- |
| `--color-bg-primary`     | Main background      |
| `--color-bg-card`        | Card backgrounds     |
| `--color-text-primary`   | Primary text         |
| `--color-text-secondary` | Secondary text       |
| `--color-accent`         | Brand accent (coral) |
| `--color-income`         | Income (green)       |
| `--color-expense`        | Expense (red)        |
| `--color-border`         | Standard borders     |

Dark mode: `.dark` class on `<html>` overrides these variables.

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

We use `@layer components` in `src/index.css` for reusable styles. **Prefer these classes over inline Tailwind utilities.**

### Available Classes

| Category   | Classes                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| Buttons    | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`                 |
| Forms      | `.input`, `.select`, `.label`                                                       |
| Cards      | `.card`, `.card-hover`                                                              |
| Badges     | `.badge`, `.badge-accent`, `.badge-income`, `.badge-expense`, `.badge-muted`        |
| Typography | `.heading-1`, `.heading-2`, `.heading-3`, `.section-title`, `.section-action`, `.text-body`, `.text-muted`, `.text-ui`, `.text-link`, `.label` |
| Navigation | `.nav-link`, `.nav-link-active`                                                     |
| Layout     | `.page-container`, `.divider`                                                       |

### Typography System

All text in TSX files **must** use semantic typography classes defined in `src/index.css`. This ensures font sizes are controlled from one place and never scattered across components.

#### Semantic Classes

| Class             | Size  | Color            | Use for                                           |
| ----------------- | ----- | ---------------- | ------------------------------------------------- |
| `.heading-1`      | 24px  | text-primary     | Page titles                                       |
| `.heading-2`      | 18px  | text-primary     | Section headings                                  |
| `.heading-3`      | 16px  | text-primary     | Sub-section headings                              |
| `.section-title`  | 16px  | text-secondary   | Card/section titles (lighter weight than heading)  |
| `.section-action` | 14px  | accent           | Section header action links                       |
| `.text-body`      | 16px  | text-secondary   | Body content, descriptions, secondary values       |
| `.text-muted`     | 16px  | text-muted       | Tertiary/muted content                            |
| `.text-ui`        | 14px  | text-secondary   | Small UI: metadata, counts, timestamps, hints, table cells |
| `.text-link`      | 14px  | accent           | Clickable link text                               |
| `.label`          | 16px  | text-secondary   | Form labels                                       |
| `.btn` (base)     | 15px  | (inherited)      | Button text (handled by btn classes)              |
| `.badge` (base)   | 14px  | (inherited)      | Badge text (handled by badge classes)             |

#### Banned Patterns in TSX Files

**Never** use these inline Tailwind utilities for text sizing in TSX:

```tsx
// ❌ BANNED - raw size utilities on content text
className="text-xs ..."        // banned entirely
className="text-[12px] ..."    // banned - no custom px sizes
className="text-[14px] ..."    // banned
className="text-[15px] ..."    // banned
className="text-sm text-text-secondary ..."  // use .text-ui or .text-body instead
className="text-base text-text-muted ..."    // use .text-muted instead

// ✅ CORRECT - semantic classes
className="text-ui"                          // 14px secondary
className="text-ui text-income"              // 14px with color override
className="text-body"                        // 16px secondary
className="text-body text-text-primary"      // 16px with color override
className="text-muted"                       // 16px muted
className="heading-2"                        // 18px heading
```

#### Allowed Overrides on Top of Semantic Classes

You **may** combine semantic classes with:

- **Color**: `text-ui text-income`, `text-body text-text-primary`
- **Weight**: `text-ui font-medium`, `text-body font-semibold`
- **Font**: `text-ui font-mono`
- **Alignment**: `text-body text-right`

You must **not** override the font size: no `text-sm`, `text-lg`, etc. alongside a semantic class.

#### Exceptions

- **Form `<input>` and `<select>` elements**: Use the `.input` / `.select` CSS classes, which handle their own sizing. If you need a raw size on a form element (e.g., inline filter), use `text-sm` directly — not `.text-ui`.
- **Icon sizing**: `w-4 h-4`, `w-5 h-5` etc. on icons is fine.
- **Tailwind responsive/state prefixes**: Not applicable to our typography classes since they are defined in CSS, not as Tailwind utilities.

#### Verification Commands

Run these to ensure no banned patterns exist:

```bash
rg 'text-xs' -g '*.tsx'              # must return zero results
rg 'text-xs' -g '*.css'              # must return zero results
rg 'text-\[1[0-9]px\]' -g '*.tsx'   # must return zero results
```

### Tailwind v4 CSS Variable Syntax

**IMPORTANT:** Tailwind v4 uses a specific syntax for CSS custom properties.

#### Colors (registered in `@theme`)

Use the variable name directly without `var()`:

```tsx
// ✅ CORRECT - Tailwind v4 syntax
className = "bg-bg-card text-text-primary border-accent";
className = "text-income bg-expense-bg";

// ❌ WRONG - old var() syntax
className = "bg-[var(--color-bg-card)] text-[var(--color-text-primary)]";
```

#### Non-color values (shadows, radius, transitions)

Use `property-(--variable)` syntax:

```tsx
// ✅ CORRECT
className = "rounded-lg shadow-(--shadow-md)";

// ❌ WRONG
className = "rounded-[var(--radius-lg)]";
```

### Adding New Styles

1. Add CSS variables to `@theme` block in `src/index.css`
2. Add dark mode overrides in `.dark` selector
3. Create component classes in `@layer components`
4. Use `@apply` with Tailwind utilities

Example:

```css
@theme {
  --color-new-color: #abc123;
}

.dark {
  --color-new-color: #321cba;
}

@layer components {
  .new-component {
    @apply bg-new-color text-white rounded-(--radius-md);
  }
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
