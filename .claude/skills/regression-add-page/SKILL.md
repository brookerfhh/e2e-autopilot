---
name: regression-add-page
description: >-
  Add a stable-page Playwright e2e regression suite for one admin page, the same way
  the existing scripts/regression suite was built. Recons the LIVE page to discover
  its real elements (incl. modals/dropdowns by opening them), writes a human-readable
  tests.md for review, compiles a Page Object + <page>.spec.ts, then runs it against QA
  and fixes anchors until green. Use when the user says /regression-add-page <page>,
  "给 X 页加回归测试", "add regression tests for <page>".
---

# regression-add-page — generate + verify an e2e regression suite for one page

Builds tests the same way `scripts/regression/` was built: recon the real page →
human-readable cases (tests.md) → Page Object + spec → run on QA → fix until green.
Works WITH or WITHOUT frontend source: source makes it faster/more accurate; recon
on the live page is what actually proves the anchors.

## Inputs
- A page: a name ("Filter Code"), a route ("/configurations/filter-code"), or a menu path.
- Optional: intent / specific cases the user wants ("verify duplicate shows an error").

## Prerequisites (tell the user if missing)
- On a branch that has `scripts/regression/` (the suite) + `playwright.config.ts`.
- One-time per machine: `pnpm install`, then `npx playwright install chromium`.
- A QA **SessionId** (DevTools → Application → Cookies → `SessionId`) for recon + verify.
- Working dir for all commands: `frontend/recipe-site-frontend`.

## Conventions (match the existing suite — read 1-2 existing pages as templates)
Look at `scripts/regression/pages/BrandManagementPage.ts` (+ `LocationMappingPage.ts`)
and `scripts/regression/*.spec.ts` and COPY their style:
- **Page Object Model**: one `pages/<Name>Page.ts` per page (locators + actions) + one
  `<page>.spec.ts` using `import {test, expect} from "./fixtures"`.
- **`open()` uses a RELATIVE goto** (`this.page.goto(<Name>Page.PATH)`); baseURL comes
  from `playwright.config.ts`. Routes are code-split — assert readiness with `{timeout: 20000}`.
- **Behavioral assertions, not data-bound**: assert load / search-narrows / dialog-opens —
  never "row 1 must be X". Use `.ant-table-tbody tr.ant-table-row` for data rows.
- **Locators**: `getByTestId` > `getByRole`/`getByLabel` > visible text. No `nth-child`.
- **Modals/drawers**: scope to the visible one — `.ant-modal-content:visible` /
  `.ant-drawer-content:visible` (AntD keeps closed ones in the DOM). Confirm dialogs are
  `.ant-modal-confirm`.
- **Title clashes**: if the page title also appears as a breadcrumb/column, scope to
  `#content` (e.g. Location Mappings) or use the unambiguous Create button + table.
- **AntD Select**: click `.ant-form-item:has(label:text-is("X")) .ant-select-selector`,
  wait 500ms (let any closing dropdown settle), then click
  `.ant-select-dropdown:visible .ant-select-item-option` (skip a "Create" shortcut option).
  Async-search selects: type the query first, then wait for an option.
- The suite runs **serial** (`workers: 1`) with **1 retry**; backend writes get `{timeout: 20000}`.

## Step 0 — Resolve the page (catalog → source → ask; recon always confirms)
The **catalog is an OPTIONAL accelerator** — recon (Step 1) is the core and is always done.
Pick whichever source of "what to test / hidden rules" is available:
1. **Catalog (optional)**: a `PAGES.md` sits next to this skill (`.claude/skills/regression-add-page/PAGES.md`).
   If present and the page is listed, use its route, columns, create flow (fields / required +
   exact validation message / success toast), delete + confirm text, capability, hidden backend
   rules, and suggested **Strategy** as the basis — this lets QA generate WITHOUT reading code.
   (If the catalog marks the page **Known-blocked**, stop and tell the user.) The user may also
   ask to skip the catalog and recon only — that's fine.
2. **Source (if available)**: skim the page's `route.ts*` (full URL = parent + child path) +
   `List`/`index` + `CreateOrEdit`/`DeleteAction` for the same facts.
3. **Neither**: ask the user for the URL + intent, and rely on recon.

Catalog/source can drift, so **always recon the live page (Step 1) to confirm the real anchors**
before writing the spec.

## Step 1 — Recon the LIVE page (prove the real anchors)
Goal: never guess. Observe the deployed page. **Default: a throwaway diagnostic script
(no MCP needed)**; if Playwright MCP is configured, you may use it instead for interactive
snapshots.

Write `scripts/regression/__diag.ts`, run it against QA, read stdout, then DELETE it:
```ts
import {chromium} from "@playwright/test";
import {createAuthenticatedContext, BASE_URL} from "../test-auth/inject-session";
(async () => {
    const browser = await chromium.launch({headless: true});
    const ctx = await createAuthenticatedContext(browser, {target: "qa", sessionId: process.env.SESSION_ID});
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL.qa}<ROUTE>`);
    await page.waitForTimeout(4000);
    console.log("url:", page.url());                                   // catch permission redirects
    console.log("columnheaders:", await page.getByRole("columnheader").allInnerTexts());
    console.log("buttons:", await page.getByRole("button").allInnerTexts());
    console.log("data rows:", await page.locator(".ant-table-tbody tr.ant-table-row").count());
    // OPEN modals/dropdowns to see their contents (they aren't in the DOM until opened):
    // await page.getByRole("button",{name:"Create"}).click();
    // console.log("modal labels:", await page.locator(".ant-modal-content:visible, .ant-drawer-content:visible").locator("label").allInnerTexts());
    await browser.close();
})().catch(e => { console.error(String(e).split("\n")[0]); process.exit(1); });
```
Run: `$env:SESSION_ID="<id>"; npx ts-node -P tsconfig.scripts.json scripts/regression/__diag.ts`

Recon must capture, by **opening each entry point**:
- page title/heading text, column headers, the Create button label;
- the Create modal/drawer: field labels, required-field validation message (click Save empty),
  success toast text (only if you actually submit);
- row actions: Edit / Delete / others — open the Edit form; trigger Delete to read the
  confirm dialog text + button labels (then cancel);
- dropdowns: open them, read option values; async ones: type then read;
- search form fields; sortable column `aria-sort`; pagination (`.ant-pagination-item-2`).
- **If the URL redirects** (e.g. to `/ItemV2`) the account lacks permission — stop and tell the user.

## Step 2 — Write tests.md (human-readable, for review)
Decide the **no-junk strategy** from capabilities:
- **Has delete** → full idempotent `create → verify → delete` (unique `e2e-${Date.now()}` name;
  the test deletes its own row). Plus validation + edit-opens.
- **Create but NO delete** → open the create form + assert validation + cancel. NEVER submit.
- **Read-only** → load + columns (+ search if present).

Write `scripts/regression/tests/<page>.md`: list each case as a title + Given/When/Then,
tagged with the strategy. PAUSE and let the user review/edit before compiling.

Example case:
```
### create requires a name (validation)
- Given: on the page, Create dialog opened
- When: click Save with the name empty
- Then: "<exact validation message from recon>" is visible
```

## Step 3 — Compile to a Page Object + spec
- Create `scripts/regression/pages/<Name>Page.ts` and `scripts/regression/<page>.spec.ts`,
  copying the structure/locators of an existing page, using ONLY recon-verified anchors.
- One `test()` per tests.md case; `test.describe("<Page Title>", ...)`.
- `npx tsc --noEmit -p tsconfig.scripts.json` and fix type errors.

## Step 4 — Run against QA and fix until green
```
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test <page> --workers=1
```
- A **locator timeout / not-found** = bad anchor → re-recon that element, fix the PO, re-run.
- An **assertion mismatch** (expected vs actual) = a real finding → report it, don't "fix" by
  weakening the assertion.
- Watch it live if needed: add `--headed` (window auto-maximizes) and `$env:SLOWMO="800"`.
- Idempotency: if a create test fails the 2nd run, the entity wasn't cleaned up — make the
  test delete what it creates (or, for unique backend constraints, create a fresh dependency,
  e.g. Location Mapping creates a new Route; see `LocationMappingPage.ts`).
- Delete `__diag.ts` and any leftover `e2e-*` data your recon created.

## Output contract
End with:
```
regression-add-page: <Page>
  - route:    <url>           (or: BLOCKED — account lacks permission, redirects to <x>)
  - recon:    <n> anchors verified live
  - tests.md: scripts/regression/tests/<page>.md (<n> cases) — reviewed
  - spec:     scripts/regression/<page>.spec.ts (+ pages/<Name>Page.ts)
  - run:      <P> pass, <F> fail, target=qa
```
Do NOT commit unless the user asks. The suite stays green and leaves QA clean (no junk data).
