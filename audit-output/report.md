# SaveSlate full application audit

Date: 2026-07-22
Scope: product, UX, accessibility, responsive behavior, frontend, backend, financial correctness, security, testing, deployment, observability, and feature opportunities.
Method: read-only source review, browser dogfooding at desktop and 320px, axe WCAG 2 A/AA scans, production build review, frontend/backend test execution, and npm dependency audit.

## Executive verdict

SaveSlate has a strong functional foundation—accounts, transactions, CSV import, reusable parsers, AI-assisted cleanup/categorization, goals, rules, tags, analytics, and release notifications—but it is not yet safe to treat as a fully trustworthy finance product in production.

The highest risks are financial correctness (mixed currencies and date boundaries), tenant isolation, destructive account deletion, malformed import handling, mobile clipping, accessibility, and a deployment path with no CI gate and a broken default API proxy.

## Validation snapshot

- Frontend Vitest: 842/842 passed.
- Playwright: 8/8 passed before this audit.
- Production frontend build: passed; main bundle approximately 1,424KB / 422KB gzip.
- Backend pytest in the current mounted API container: 295 passed, 2 failed, 553 warnings.
- npm production audit: 6 high-severity dependency findings, 0 critical; fixes are available.
- Browser console: no application errors on the audited empty-state routes.
- Local empty-state performance: FCP ~464ms, LCP ~496ms, negligible CLS. This is not representative of production latency or populated accounts.
- Axe: every audited authenticated route had contrast violations. Analytics had invalid ARIA; Settings had two unnamed comboboxes.

## P0 — fix before the next production release

### 1. Cross-tenant relational ownership is not enforced

Transaction create/update accepts account, category, goal, and import-batch UUIDs and stores them without confirming ownership. Category group IDs and automation action target IDs have similar gaps.

Evidence: `backend/app/schemas/transaction.py:19-60`, `backend/app/routers/transactions.py:250-297,368-388`, `backend/app/routers/categories.py:45-55,89-93`, `backend/app/routers/automation_rules.py:221-232`.

Risk: a known UUID could create cross-user associations, corrupt analytics, or disclose metadata through joins.

Fix: service-level ownership checks immediately; then composite tenant foreign keys or PostgreSQL RLS.

### 2. Account deletion can destroy transaction history contrary to the UI promise

The UI says transactions will remain as “Unknown Account,” while backend/model behavior cascades account deletion to transactions.

Evidence: `src/pages/Accounts.tsx:319-321`, `backend/app/routers/accounts.py:174-188`, `backend/app/models/account.py:48`.

Fix: block deletion while transactions exist, require reassignment, or implement a soft-deleted account. Correct the confirmation copy immediately.

### 3. Multi-currency totals are financially incorrect

Accounts and transactions support different currencies, but dashboard, accounts, goals, and analytics sum raw amounts and present one currency.

Evidence: `src/pages/Dashboard.tsx:54-58,145-154`, `src/pages/Accounts.tsx:185-188,341-351`, `backend/app/routers/analytics.py:66-91,133-159,204-230,277-296,338-357`.

Fix: until FX exists, show per-currency subtotals and suppress “Net Worth.” Longer term, store rate/source/date and base-currency amounts.

### 4. Date range calculations can shift into the prior day/month/year

Local dates are converted through UTC using `toISOString()`. In Europe/Zurich, local May 1 can become April 30 and January 1 can become December 31.

Evidence: `src/lib/analytics.ts:67-91`, `src/components/transactions/transaction-form.ts:64-68`, `src/pages/Dashboard.tsx:27-32`.

Fix: use local calendar formatting or Temporal/date-fns-style date-only utilities; test DST and month/year boundaries in multiple time zones.

### 5. Invalid CSV amounts can be imported as zero

The parser records an amount error but retains the row; import rejects missing date/description, not row errors, then persists amount zero.

Evidence: `backend/app/services/csv_import.py:365-425`, `backend/app/routers/csv_import.py:468-480,949-956,1034-1056`.

Fix: reject errored rows by default and require explicit per-row acknowledgement before import.

### 6. The automated/default web image does not proxy `/api`

The workflow builds `Dockerfile`, which copies `nginx.conf`; that config routes `/api` through the SPA fallback. The working proxy exists only in `nginx.swiftwave.conf.template`.

Evidence: `.github/workflows/swiftwave-deploy.yml:48-56`, `Dockerfile:13-16`, `nginx.conf:43-61`, `nginx.swiftwave.conf.template:51-60`.

Fix: use the templated Dockerfile/config or add the proxy to the default config. Add an image-level ingress test for `/api/health` JSON.

### 7. Mobile layouts are visibly clipped

At 320px, measured body content widths were Transactions 366px, Analytics 589px, and Settings 340px while root overflow clipping hid the excess. Analytics text/cards are cut off; Transactions loses header actions; Settings labels and controls collide. Dashboard “View all” and quick-action labels are clipped.

Evidence: `audit-output/screenshots/mobile-analytics.png`, `mobile-transactions.png`, `mobile-settings.png`, `mobile-dashboard.png`.

Fix: redesign the shell for mobile rather than hiding overflow; use a drawer/bottom nav, min-width:0 on content tracks, wrapping action rows, and single-column settings rows at narrow widths.

### 8. Deployments have no quality or rollback gate

Every push to `main` can build and deploy without frontend tests/lint/typecheck, backend tests, migrations, security checks, or post-deploy health verification. Web/API deploy independently from mutable `latest` tags.

Evidence: `.github/workflows/swiftwave-deploy.yml:1-137`.

Fix: required CI before image publication, immutable digests, one migration job, protected deployment environment, readiness smoke test, and rollback.

## P1 — high-priority reliability and UX

### 9. Mobile navigation is unlabeled and cannot expand

At ≤900px the sidebar is forced collapsed, labels and mobile logout disappear, and nine icons must be memorized.

Evidence: `src/components/layout/Sidebar.tsx:52-61,132-203`, `src/components/layout/AppLayout.tsx:21-42`.

Fix: labeled drawer or bottom navigation with an account menu and logout.

### 10. Accessibility baseline fails across every audited route

- `--dimmed` text fails normal-text contrast broadly.
- Analytics has invalid `aria-controls` values on tabs.
- Settings language/currency comboboxes have no accessible names.
- CSV upload is a clickable div without role, keyboard handling, or a visible associated label.
- Import checkboxes/icon actions and login/register errors need accessible names/live regions.

Evidence: browser axe output in `audit-output/*-a11y.json`; `src/index.css:93-113`, `src/components/import/FileUpload.tsx:108-139`, `src/pages/Login.tsx:45-48`, `src/pages/Register.tsx:63-66`.

Fix: raise dimmed contrast, repair Radix IDs, label controls, use a label/button upload surface, and add live error semantics. Add axe to CI.

### 11. “Export Data” is a no-op

The Settings button has no handler and produced no navigation/download during browser reproduction.

Evidence: `src/pages/Settings.tsx:218-226`, `audit-output/screenshots/issue-export-before.png`, `issue-export-after.png`.

Fix: implement a complete portable export, preferably server-generated and including every user-owned entity.

### 12. Help contains inaccurate product claims

Help says tags replace categories, goals automatically create tags, and keyboard shortcuts exist. The model has categories + independent tags + direct goal IDs, and no keyboard event handlers exist.

Evidence: `src/pages/Help.tsx:26-53`, `src/types/index.ts:118-130`.

Fix: rewrite Help from actual behavior or implement the advertised capabilities.

### 13. Secondary API failures masquerade as genuine zero/empty data

Dashboard, Analytics, and Goals do not surface several query failures and instead render zero totals or empty charts.

Evidence: `src/pages/Dashboard.tsx:40-49,123-126`, `src/pages/Analytics.tsx:272-277,441-443`, `src/pages/Goals.tsx:22-41,75-76`.

Fix: aggregate query states and distinguish loading, empty, stale, partial, and failed data.

### 14. Settings report success before persistence succeeds

Preference requests are not awaited; success toasts display immediately and failure only invalidates cache silently.

Evidence: `src/hooks/useSettings.ts:40-58`, `src/pages/Settings.tsx:76-92`.

Fix: mutation-backed pending/success/error states with rollback and actionable error feedback.

### 15. Forms allow duplicate submissions

Account, transaction, and goal forms remain enabled during mutation and close only after success.

Evidence: `src/components/accounts/AccountFormModal.tsx:84-94,296-302`, `src/components/transactions/TransactionFormModal.tsx:210-227,536-542`, `src/components/goals/GoalFormModal.tsx:519-529`.

Fix: pending state, disabled submit, stable inline progress, and idempotency on create endpoints.

### 16. AI privacy and confidence controls need tightening

AI requests can include account identity, amounts, dates, descriptions, metadata, categories, and historical descriptions. Debug can return prompts/provider responses. High-confidence suggestions auto-accept without a global opt-in/undo workflow.

Evidence: `backend/app/routers/csv_import.py:725-729,792-870`, `backend/app/services/import_ai.py:163-168,357-369`, `src/components/import/TransactionPreview.tsx:1055-1074`.

Fix: explicit consent, payload preview/minimization, production debug disablement, opt-in auto-apply, audit log, and undo/review summary.

### 17. Security/session hardening is incomplete

Known default secrets, non-secure cookie defaults, 24-hour non-revocable JWTs, case-sensitive email matching, and proxy-ambiguous IP rate limiting remain.

Evidence: `backend/app/config.py:13-19`, `backend/app/services/auth.py:31-47`, `backend/app/routers/auth.py:83-84,120-124`, `backend/app/limiter.py:3-10`.

Fix: fail startup on weak secrets, secure-cookie production defaults, canonicalized email, token/session revocation, and trusted-proxy-aware per-user/IP limiting.

### 18. Uploads, regexes, rules, and AI calls lack robust resource limits

CSV reads whole files, lists/rules can be unbounded, and user regexes execute without timeout. Only login/register have explicit limits.

Evidence: `backend/app/routers/csv_import.py:719-747,897-944`, `backend/app/services/csv_import.py:65-94`, `backend/app/services/automation_engine.py:204-220`.

Fix: size/row/time quotas, bounded regex engine, background jobs, per-user AI budgets, and cancellation.

### 19. Production recovery and observability are minimal

Health does not test PostgreSQL, and there are no request IDs, metrics, tracing, error reporting, backups, restore drills, audit events, or API/web health checks.

Evidence: `backend/app/main.py:84-93,127-130`, `docker-compose.yml:8-14,42-43`, `src/components/layout/ErrorBoundary.tsx:30-31`.

Fix: readiness/liveness, structured logs, Sentry/OpenTelemetry, metrics/SLOs, encrypted backups, and tested restoration.

### 20. Initial frontend bundle is oversized

The pages barrel statically imports Analytics while App also lazy-loads it, pulling Nivo into the initial graph. Build output is ~1.4MB / 422KB gzip.

Evidence: `src/App.tsx:8-20`, `src/pages/index.ts:1-12`, `src/pages/Analytics.tsx:1-4`.

Fix: import Dashboard directly, remove the pages barrel from the initial path, and define chart/vendor chunks.

## P2 — maintainability and completeness

- Transactions fetches up to 10,000 rows and filters/sorts/paginates client-side (`src/pages/Transactions.tsx:137-175,824-962`). Move to server-side query/cursor pagination.
- Transactions, Categories, Analytics, and TransactionPreview are oversized multi-responsibility components. Split domain controllers/hooks from focused views.
- Unknown URLs have no 404 route (`src/App.tsx:39-58`).
- Goal cards receive empty contribution transactions; archive exists but UI does not expose it (`src/pages/Goals.tsx:263-265`, `src/components/goals/GoalDetailCard.tsx:133-142`).
- Pending split totals likely use signed negative expense amounts and can disappear; there is no reimbursement matching workflow (`src/pages/Transactions.tsx:599-603,1259`).
- Rules have an unused test endpoint and hide modeled `on-create` behavior (`src/hooks/api/use-automation-rules.ts:93-97`, `src/components/rules/RuleFormModal.tsx:183-188`).
- Default account import omits investment/retirement types (`src/pages/Accounts.tsx:69-70`).
- Frontend and backend version metadata disagree; generated backend build artifacts are tracked.
- Backend tests use SQLite/create_all rather than PostgreSQL/Alembic; rate limiting is disabled in tests.
- Root Docker context has no `.dockerignore`, risking `.env`/Git history in build context/cache.
- README webhook names do not match workflow secret names, allowing green no-op deployment.

## Automated test/dependency findings

### Backend test failures

1. `TestListTransactions.test_list_search_matches_notes`: expected page size 10,000, received 50.
2. `TestListTransactions.test_list_order_stays_stable_after_category_update`: same-day ordering did not return newer-created first.

The suite also emitted repeated insecure JWT key-length warnings from development secrets.

### npm audit

Six high-severity dependency findings are reported across transitive lodash, picomatch, postcss, react-router/react-router-dom, and Vite. Some React Router advisories target SSR/RSC features not used by this SPA, and Vite issues primarily affect the dev server, but upgrades are available and should be applied/tested.

## Visual/Hallmark audit

### Critical

- **Layout-safety failure:** mobile content is clipped on Analytics, Transactions, Settings, and parts of Dashboard.
- **Contrast failure:** every audited authenticated route contains normal text below WCAG AA contrast.
- **Hover/label accessibility failure:** mobile icon-only navigation removes labels rather than providing an accessible alternate.

### Major

- **`transition-all`:** shared/navigation controls animate unspecified properties (`src/components/layout/Sidebar.tsx`, shared button/input styles).
- **Icon-tile repetition:** Help quick links, Dashboard quick actions, and Settings actions repeat the same icon-square/card pattern.
- **Card-in-card:** some settings/import surfaces use containment layers without clear semantic need.
- **Component-system drift:** direct raw buttons and a legacy `.card` class bypass shared primitives (`src/components/import/FileUpload.tsx:108-120`, `src/pages/Settings.tsx:218-239`).

### Minor

- Repeated section spacing/rhythm makes several empty-state pages visually interchangeable.
- Empty analytics reserves very large chart surfaces rather than collapsing to one actionable empty state.

Visual summary: 3 critical · 4 major · 2 minor.

## Recommended feature roadmap

### Quick wins (days)

1. Safe account deletion/reassignment and corrected copy.
2. Working full-data export and import rollback.
3. Accurate Help content; either implement or remove shortcut claims.
4. Mobile drawer/bottom navigation and responsive settings/action rows.
5. Rule “test” preview showing matched transactions before save/run.
6. Goal archive/unarchive and real contribution history.
7. AI retry, explicit auto-apply consent, and review-all-changes summary.
8. Chart click-through into prefiltered Transactions.
9. Per-currency totals until FX conversion ships.
10. 404 page, labeled upload/dropzone, and global contrast repair.

### Medium bets (weeks)

1. **Unified Review Inbox:** uncategorized items, low-confidence AI, duplicates, unpaired transfers, failed imports, and overdue reimbursements with batch correction and “create rule from correction.”
2. **Budgets:** category/group budgets, rollover, variance, alerts, and dashboard progress.
3. **Recurring/subscription detection:** upcoming bills, price changes, confirmation/dismissal, and cash-flow forecast.
4. **Actionable analytics:** custom date ranges, prior-period comparisons, account/tag filters, saved views, drill-down, and exports.
5. **Reconciliation:** statement balance, cleared status, discrepancy detection, and import audit history.
6. **Goal coaching:** projected completion, missed cadence, milestones, and goal-specific history.
7. **Weekly insight digest:** spending changes, upcoming bills, budget risk, and goal progress.

### Strategic bets (months)

1. Historical FX conversion, liability-aware net worth, investment valuation, and net-worth history.
2. PSD2/Open Banking plus CAMT.053/OFX/QIF support and pending/posted reconciliation.
3. Household/shared finance with permissions, shared goals/accounts, split requests, and settlement matching.
4. Planning/scenario engine combining recurring cash flow, budgets, goals, and major purchase simulations.
5. Privacy-controlled hybrid categorization: local/rule-first, explainable AI fallback, confidence policies, and audit history.

## Recommended execution order

1. **Trust and safety:** tenant ownership, account deletion, CSV corruption, mixed currencies, date boundaries.
2. **Production reliability:** API proxy, CI, secure deployment, backups/observability, dependency upgrades.
3. **Mobile/accessibility:** shell redesign, clipping, contrast, names/labels, keyboard upload.
4. **Workflow completion:** export, accurate Help, pending states, errors, goal/archive/split fixes.
5. **Retention:** Review Inbox → budgets/recurring detection → weekly insights → planning.
