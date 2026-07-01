# Stable-Page Regression Suite

Standing Playwright e2e coverage for admin pages that **rarely change**. Unlike the
per-ticket scripts under `openspec/changes/**`, these are not tied to a diff — run
them before a release or whenever you want to confirm the core admin pages still work.

**59 cases across 12 pages.** Built on the official `@playwright/test` runner
(config: `../../playwright.config.ts`).

---

## Quick start

```powershell
# 1) get a SessionId: log into QA, then DevTools → Application → Cookies → copy "SessionId"
# 2) run everything against QA (headless, produces an HTML report)
$env:SESSION_ID="<your-SessionId>"; $env:TARGET="qa"; npx playwright test
# 3) open the report
npx playwright show-report
```

`SESSION_ID` is a live credential — don't share it; it expires after a few hours.
If omitted, the saved `../test-auth/auth.json` storageState is used instead.

> First time on a machine: `pnpm install` then `npx playwright install chromium`.

---

## Commands

```powershell
# --- run ---------------------------------------------------------------
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test                 # all pages
$env:SESSION_ID="<id>"; $env:TARGET="local"; npx playwright test               # against local dev (6443)
$env:SESSION_ID="<id>"; $env:TARGET="local"; $env:LOCAL_PORT="6444"; npx playwright test  # local on a custom Vite port

# --- run a single page (use the spec name) ----------------------------
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test brand-management
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test concept-management
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test location-mapping
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test facilities
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test kitchens
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test filter-code
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test units
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test erp-item-fields
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test kitchen-sub-location
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test erp-sync-log
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test agent
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test allergens

# --- watch the page flow ----------------------------------------------
# A) real browser, slow motion (watch it navigate / fill / click). --headed = maximized window.
$env:SESSION_ID="<id>"; $env:TARGET="qa"; $env:SLOWMO="800"; npx playwright test brand-management --headed --workers=1
# B) interactive UI mode (run/re-run tests, time-travel each step's DOM snapshot)
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test --ui

# --- investigate a FAILED test ----------------------------------------
# 1) the report already has it: failed test → screenshot + video + (on retry) trace attached
#    open monocart-report\index.html  (or: npx playwright show-report)
# 2) watch it fail live in a maximized browser, slowed down:
$env:SESSION_ID="<id>"; $env:TARGET="qa"; $env:SLOWMO="800"; npx playwright test brand-management --headed --workers=1
# 3) step through it with the Inspector (pause / resume / step):
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test brand-management --debug
# 4) record a full trace and replay every step (DOM + network + console):
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test brand-management --trace on
npx playwright show-trace test-results\<dir>\trace.zip

# --- review results ----------------------------------------------------
# Prettier dashboard (charts + per-step detail), generated every run — open in a browser:
start monocart-report\index.html                 # Windows; or just open the file
npx playwright show-report                       # default HTML report (steps + failure screenshots)
npx playwright test brand-management --trace on  # record a full trace, then:
npx playwright show-trace test-results\<dir>\trace.zip
```

Windows shortcut (sets env for you, opens UI mode):

```
scripts\regression\run.cmd <SessionId>             # QA
scripts\regression\run.cmd <SessionId> local       # local dev (6443)
scripts\regression\run.cmd <SessionId> local 6444  # local dev, custom port
```

---

## Test cases (59)

### Brand Management (8) — `brand-management.spec.ts`
1. loads the list page with header and at least one row
2. search for a non-existent name yields no rows, clear restores
3. create a brand and find it via search
4. row actions menu opens (Edit / Delete reachable)
5. create requires a name (validation)
6. edit a brand: create, rename, verify
7. delete a brand: create, delete, verify gone
8. sorting a column toggles its order

### Concept Management (9) — `concept-management.spec.ts`
1. loads the list page with header and at least one row
2. search by R&D Lead yields no rows for a non-existent value, clear restores
3. create requires a name (validation)
4. create a concept
5. edit drawer opens prefilled for the first row
6. Map Brand drawer opens for the first row
7. delete shows a confirmation dialog (cancelled)
8. row actions expose Edit and Map Brand
9. create a concept, verify it appears, then delete it

### Location Mappings (10) — `location-mapping.spec.ts`
1. loads the list page with header and at least one row
2. search and clear controls are present
3. create modal opens with the Facility Name field
4. create requires Facility Name (validation)
5. create a mapping (new route) then delete it
6. duplicate mapping shows an error
7. edit modal opens for the first row
8. delete shows a confirmation dialog (cancelled)
9. row actions expose Edit
10. pagination navigates to page 2

### Facilities (8) — `facilities.spec.ts`
1. loads the list page with header and at least one row
2. create modal opens with the Facility Name field
3. create requires a Facility Name (validation)
4. address line 1 returns autocomplete options
5. create a facility then delete it
6. edit modal opens for the first row
7. delete shows a confirmation dialog (cancelled)
8. row actions expose Edit

### Kitchens (6) — `kitchens.spec.ts`
1. loads the list page with header and at least one row
2. create modal opens with the Kitchen Location field
3. create requires a name (validation)
4. create a kitchen then delete it
5. edit modal opens for the first row
6. row actions expose Edit

### Filter Code (5) — `filter-code.spec.ts`
1. loads with the Filter Code column
2. create drawer opens with the Filter Code field
3. create requires a Filter Code (validation)
4. create a filter code then delete it
5. edit drawer opens for the first row

### Units (3) — `units.spec.ts`
1. loads with the Units title and at least one unit
2. create drawer opens with the Unit Code field
3. create requires a valid Unit Code (validation)

### ERP Item Fields (3) — `erp-item-fields.spec.ts`
1. loads with the Value Name column and at least one row
2. new-value modal opens
3. new value requires a name (validation)

### Kitchen Sub-Location (3) — `kitchen-sub-location.spec.ts`
1. loads with the Value Name column
2. create modal opens with the name field
3. create requires a name (validation)

### ERP Sync Log (2) — `erp-sync-log.spec.ts`
1. loads with the Job Name column
2. search and clear controls are present and usable

### Agent Configuration (1) — `agent.spec.ts`
1. loads with the title and the Agents / Prompt Library tabs

### Allergens (1) — `allergens.spec.ts`
1. loads the list with header and at least one row

> **Not covered — OG Sync Log** (`/sync-job-log/og`): the test account lacks that
> permission, so the route redirects to the home page. Needs an OG-permissioned account.

---

## Design & strategy

- **Page Object Model** (`pages/`): one object per page (locators + actions).
- **Behavioral assertions, not data-bound**: assert structure/behavior (loads,
  search narrows, dialog opens) — never "row 1 must be X" — so tests stay green as
  QA data drifts.
- **Locators**: `getByTestId` > `getByRole`/`getByLabel` > text; no brittle CSS.
- **No junk data**, by page capability:
  - **Has delete** → full, idempotent create→delete (the test deletes what it
    creates, using a unique `e2e-*` name): Brand, Concept, Kitchens, Location
    Mapping, Facilities, Filter Code.
  - **Create but no delete** → open the create form + validate + cancel only,
    never submit: Units, ERP Item Fields, Kitchen Sub-Location.
  - **Read-only** → load + structure (+ search): Allergens, ERP Sync Log, Agent.
- **Serial + retry** (`workers: 1`, `retries: 1`): the suite mutates data against a
  single shared backend (local dev proxies to QA), so parallel workers contend and
  flake. A full run is ~15–20 min.

Notable idempotency tricks:
- **Facilities** drives the async Address Line 1 autocomplete (types "abc", picks
  an option), then deletes its row.
- **Location Mapping** create has two backend uniqueness checks (route must be
  unused AND facility+kitchen unique), so the test creates a brand-new route on a
  facility+kitchen freed by `cleanupE2eMappings`, waits for the new route to
  back-fill into the form before saving, then deletes its own row.

---

## Files

```
playwright.config.ts                 # runner config (project root): baseURL, reporters, workers, timeouts
scripts/test-auth/                   # shared auth (SessionId injection / saved storageState)
scripts/regression/
  README.md
  fixtures.ts                        # authenticated `context` fixture
  run.cmd                            # Windows launcher (env + npx playwright test --ui)
  pages/                             # one Page Object per page
    BrandManagementPage.ts   ConceptManagementPage.ts   LocationMappingPage.ts
    FacilitiesPage.ts        KitchensPage.ts            FilterCodePage.ts
    UnitsPage.ts             ErpItemFieldsPage.ts       KitchenSubLocationPage.ts
    ErpSyncLogPage.ts        AgentPage.ts               AllergensPage.ts
  *.spec.ts                          # one spec per page (see Test cases above)
```

Generated artifacts (`playwright-report/`, `monocart-report/`, `test-results/`) are gitignored.

Reporters (configured in `playwright.config.ts`): `list` (terminal) + default `html`
+ **`monocart-reporter`** (the prettier dashboard at `monocart-report/index.html`).
`monocart-reporter` is a devDependency — `pnpm install` brings it in.
