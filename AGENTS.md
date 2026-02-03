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
npx tsc --noEmit     # Type check only
```

**No test framework configured yet.** Consider Vitest + React Testing Library when adding tests.

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

| Category   | Classes                                                  |
| ---------- | -------------------------------------------------------- |
| Buttons    | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon` |
| Forms      | `.input`, `.select`, `.label`                            |
| Cards      | `.card`, `.card-hover`                                   |
| Badges     | `.badge`, `.badge-accent`, `.badge-income`, `.badge-expense`, `.badge-muted` |
| Typography | `.heading-1`, `.heading-2`, `.heading-3`, `.text-body`, `.text-muted`, `.text-link` |
| Navigation | `.nav-link`, `.nav-link-active`                          |
| Layout     | `.page-container`, `.divider`                            |

### Tailwind v4 CSS Variable Syntax

**IMPORTANT:** Tailwind v4 uses a specific syntax for CSS custom properties.

#### Colors (registered in `@theme`)

Use the variable name directly without `var()`:

```tsx
// ✅ CORRECT - Tailwind v4 syntax
className="bg-bg-card text-text-primary border-accent"
className="text-income bg-expense-bg"

// ❌ WRONG - old var() syntax
className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
```

#### Non-color values (shadows, radius, transitions)

Use `property-(--variable)` syntax:

```tsx
// ✅ CORRECT
className="rounded-(--radius-lg) shadow-(--shadow-md)"

// ❌ WRONG
className="rounded-[var(--radius-lg)]"
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
