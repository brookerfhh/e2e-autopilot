---
name: flow-kit
description: >-
  Use when a repo has NO Playwright e2e scaffolding yet and you need reusable data-setup /
  action flows — the user says /flow-kit, "从零搭一个造数脚本", "在这个空项目里做 e2e 流程脚本",
  "build a self-contained data-setup flow", "record a create/search/delete flow" and there is no
  playwright.config / auth helper / flows dir to build on. Bootstraps the whole toolkit into any
  repo, then records → refactors → verifies → registers → composes flows. (If the repo already has
  the scripts/regression suite, use build-flow instead.)
---

# flow-kit — self-contained Playwright flow toolkit (bootstrap + record + compose)

Like `build-flow`, but assumes **nothing**: it works in a bare repo by bootstrapping its own
scaffolding (auth helper, runner, tsconfig, `flows/` catalog) — no `scripts/`, no
`playwright.config.ts`, no fixtures required. Everything it generates lives under `flows/` and is
regenerable, so a first-time user just runs the skill; they don't clone or scaffold anything by hand.

**Produces** parameterized flows with a typed `@flow` contract (`action/target/returns/requires`)
that compose into longer flows (e.g. `create→search→delete`). **Method:** bootstrap → record the
real flow (ground truth) → refactor into a structured flow + Page Object → verify by running once →
register in `flows/FLOWS.md`.

`<skill-dir>` below = this skill's base directory; its `templates/` holds every file to copy.

## Naming
`create` flows are entity-specific (`createIngredientItem`, `createMenuItem`); `search`/`delete`/
`update` flows are generic (`searchItem`, `deleteItem`). Never a vague `createItem` when a type matters.

## Step 1 — Bootstrap the toolkit (idempotent; never overwrite existing files)
1. **Deps**: ensure `@playwright/test`, `ts-node`, `typescript`, `@types/node` are installed
   (`npm i -D` them if missing) and `npx playwright install chromium` has run.
2. **Scaffold** — for each, copy from `<skill-dir>/templates/` only if the destination is absent:
   - `flows/_auth.ts`         ← `templates/_auth.ts`      (APP_URL→baseURL, SESSION_ID cookie inject)
   - `flows/_run.ts`          ← `templates/_run.ts`       (generic runner)
   - `tsconfig.flows.json`    ← `templates/tsconfig.flows.json`  (repo root; `include` is `flows/**`)
   - `flows/FLOWS.md`         ← `templates/FLOWS.template.md`
   - `mkdir -p flows/pages flows/.recorded`
3. **Env**: confirm `APP_URL` (full origin) and `SESSION_ID` are set — the recorder and runner need
   them. The session cookie name defaults to `SessionId`; set `SESSION_COOKIE` if the app differs.
Then read `flows/FLOWS.md` and reuse/compose per the catalog (see Composing below).

## Step 2 — Record (human drives; agent launches + waits)
Build a temp storageState from `SESSION_ID` so codegen opens already logged in, then record:
```bash
node -e "const u=new URL(process.env.APP_URL);require('fs').writeFileSync('flows/.tmp-storage.json',JSON.stringify({cookies:[{name:process.env.SESSION_COOKIE||'SessionId',value:process.env.SESSION_ID,domain:u.hostname,path:'/',secure:true,sameSite:'None',expires:-1}],origins:[]}))"
npx playwright codegen --load-storage=flows/.tmp-storage.json --output flows/.recorded/<flow>.spec.ts "$APP_URL/<start-path>"
```
Tell the user: *a logged-in browser opened — do the flow once, use the recorder's **Assert** buttons
to check it worked, then close the window.* codegen exits when the browser closes.

## Step 3 — Refactor into a flow + Page Object
Turn the linear recording (`flows/.recorded/<flow>.spec.ts`) into structure — see
`templates/flow.example.ts` for the exact shape:
1. `flows/<name>.ts` exports `<name>(page, input)` topped by the standardized **`@flow` header**
   (`@flow @action @target @summary @params @returns @requires @sideEffects @pages @recorded`).
   The **`@returns`/`@requires` pair is the composition contract**.
2. Extract selectors into `flows/pages/<X>Page.ts` (reuse an existing one if the page is covered).
3. Conventions: relative `page.goto` (baseURL is set), `.ant-select-dropdown:visible` etc. for
   modals/dropdowns, locator priority `getByTestId > getByRole/getByLabel > text`, `{timeout: 20000}`
   for code-split loads + backend writes, unique `e2e-*` data, read ids from the URL/DOM (not network).
4. `npx tsc --noEmit -p tsconfig.flows.json`; fix type errors.

## Step 4 — Verify (run once)
```bash
npx ts-node -P tsconfig.flows.json flows/_run.ts <name>            # add --headed [+ SLOWMO] to watch
```
Success = it prints `RESULT: {...}` with a real id. A **locator timeout** = a stale anchor →
re-recon that step, fix the locator, re-run. Then clean up `flows/.tmp-storage.json`,
`flows/.recorded/<flow>.spec.ts`, and any throwaway runner. Note any test data left on the app.

## Step 5 — Register in `flows/FLOWS.md`
Add the flow's **catalog row** + **detail section** (values from the `@flow` header) so it's
discoverable and composable. The header in the `.ts` is the source of truth; FLOWS.md is its index.

## Composing flows into a longer flow
When the user asks for a *combination* of existing flows ("automate create→search→delete an item"),
you **don't record** — you compose:
1. Read `flows/FLOWS.md`; order flows by matching `Returns` → `Requires` (a `create` produces
   `itemId`/`name`; a `search`/`delete` consumes them).
2. Write `flows/<compositeName>.ts` importing them in order, threading the returned ids. Give it a
   `@flow` header with `@action composite`, then register it too:
   ```ts
   // @flow createSearchDeleteItem  @action composite  @target Item  @requires —  @returns { itemId }
   export async function createSearchDeleteItem(page, input = {}) {
       const {itemId, name} = await createIngredientItem(page, input); // produces id + name
       await searchItem(page, {query: name});                          // consumes name
       await deleteItem(page, {itemId});                               // consumes id
       return {itemId};
   }
   ```
3. Verify it once (Step 4). If a needed step doesn't exist yet, record just that flow first, then compose.

## Honest caveats
- The **step sequence/intent must come from a human** (a recording, or an ordered list of existing
  flows for a composite); the agent can't infer a *new* business flow from a bare page.
- Flows **mutate real data** on the target app — prefer unique `e2e-*` names + a teardown flow.
- Multi-page flows are fragile; the record+verify loop is what keeps them honest — don't skip the run.

## Output contract
```
flow-kit: <name>
  - bootstrap:  tsconfig.flows.json + flows/{_auth.ts,_run.ts,FLOWS.md,pages/} (created if missing)
  - flow:       flows/<name>.ts (@flow: action/target, params, returns, requires) + flows/pages/<X>Page.ts
  - verified:   ran once → RESULT {id} against APP_URL
  - registered: flows/FLOWS.md
  - usage:      flows/_run.ts <name>; composable via returns→requires
```
Do NOT commit unless the user asks. `flows/` is per-user generated — suggest gitignoring it.
