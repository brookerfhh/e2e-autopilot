---
name: build-flow
description: >-
  Generate a reusable, multi-page business-FLOW builder (e.g. createIngredientItem) for data
  setup — useful to both dev and QA to seed test data fast. Records the flow with Playwright
  codegen (auth via SESSION_ID, no interactive login), then refactors the recording into a
  parameterized builder (+ Page Objects for the pages it touched) that returns the entity's id,
  verifies it by running once, and registers it in flows/FLOWS.md with a typed contract
  (action/target/returns/requires) so flows can later be COMPOSED into longer flows (e.g.
  create→search→delete). Use when the user says /build-flow <name>, "生成一个 X 流程脚本",
  "做一个 create item 的造数脚本", "build a data-setup flow", "把这几个流程组合起来".
---

# build-flow — record a multi-page flow, refactor into a reusable data-setup builder

Different from `regression-add-page` (which writes per-page assertion tests). This produces a
**reusable, composable flow** for a business flow that spans several pages — e.g.
`createIngredientItem({...})` that navigates → fills → publishes → **returns the new id**. Three uses:
- **Seed data** — dev/QA run it to create test data in seconds.
- **Test fixture** — regression specs call it to set up "given an X exists".
- **Building block** — later flows compose it (e.g. a `create→search→delete` lifecycle) by
  chaining one flow's `returns` into another's `requires`.

Method: **record the real flow (ground truth) → AI refactors into a structured, parameterized
flow with a typed `@flow` header → verify once → register in `flows/FLOWS.md`.** Recording gives
real, working selectors; the refactor gives reuse; the header + catalog make flows discoverable
and composable.

**Naming:** `create` flows are entity-specific (the form differs per type) — `createIngredientItem`,
`createMenuItem`, `createRecipeItem`. `search`/`delete`/`update` flows are generic (take an id/name,
type-agnostic) — `searchItem`, `deleteItem`. Never a vague `createItem` when a type is involved.

## Inputs
- Flow name (e.g. `create-ingredient-item`) + optionally the step outline
  ("items → New → fill Name/Type → publish"). For a *combination* of existing flows, just the
  ordered list (e.g. "create → search → delete an item") — see the Composing section.
- `SESSION_ID` (so the recorder starts logged in — no interactive login).

## Prerequisites (check first; tell the user if missing)
- `npm install` done + `npx playwright install chromium` (offer to run them if missing).
- `SESSION_ID` set (recording auth). `APP_URL` if the app isn't the default Cookbook QA.
- Run all commands from the repo root.

## Step 0 — Initialize `flows/` if missing, then discover existing flows
**Bootstrap (first use in a repo):** if `flows/` or `flows/FLOWS.md` doesn't exist, create it — the
skill is self-contained, the user shouldn't have to scaffold anything by hand:
- `mkdir -p flows`
- copy this skill's bundled template to seed the catalog:
  `cp "<skill-dir>/templates/FLOWS.template.md" flows/FLOWS.md` (`<skill-dir>` = this skill's base
  directory). Don't overwrite an existing `flows/FLOWS.md`.
- ensure the scripts TypeScript config compiles `flows/` — if `tsconfig.scripts.json`'s `include`
  doesn't already cover it, add `"flows/**/*.ts"`.

**Discover:** then read `flows/FLOWS.md` (the catalog of existing flows). Use it to:
- **Reuse** Page Objects and helpers the pages already have (don't re-recon a covered page).
- **Name consistently** per the convention above (`create<Entity>` vs generic `searchItem`/`deleteItem`).
- **Compose instead of record** when the user asks for a *combination* of things that already exist
  (e.g. "automate create→search→delete an item"): if each step is already a flow, you may **skip
  recording** and jump to the Composing section below — no new recording needed.

## Step 1 — Prepare auth for the recorder (no login, from SESSION_ID)
Write a temporary Playwright storageState with the SessionId cookie (domain derived from the app URL),
so `codegen` opens already authenticated:
```bash
node -e "const u=new URL(process.env.APP_URL||'https://cookbook.foodtruck-qa.com');require('fs').writeFileSync('.tmp-storage.json',JSON.stringify({cookies:[{name:'SessionId',value:process.env.SESSION_ID,domain:u.hostname,path:'/',secure:true,sameSite:'None',expires:-1}],origins:[]}));console.log('wrote .tmp-storage.json for '+u.hostname)"
```
(If `SESSION_ID` is not set but `scripts/test-auth/auth.json` exists, use `--load-storage=scripts/test-auth/auth.json` instead. If neither, tell the user to set `SESSION_ID` or run `login.cmd`.)

## Step 2 — Record the flow (human drives; agent launches + waits)
Create the output dir, then launch codegen pointed at the flow's start page:
```bash
mkdir -p flows/.recorded
npx playwright codegen --load-storage=.tmp-storage.json --output flows/.recorded/<flow>.spec.ts "<APP_URL>/<start-path>"
```
Then tell the user, clearly:
> A browser opened (already logged in). **Do the flow once** (e.g. New Item → fill required fields →
> add component → publish). Use the recorder toolbar's **Assert** buttons to add a check that it
> worked (e.g. success toast / the new row). **Close the browser window when done.**

`codegen` runs until the browser is closed; the agent waits for it to exit, then the recorded
steps are in `flows/.recorded/<flow>.spec.ts`.

## Step 3 — Refactor the recording into a flow (with a typed `@flow` header)
Read `flows/.recorded/<flow>.spec.ts` and turn the linear recording into structure:
1. Write `flows/<camelCaseName>.ts` (entity-specific for creates — `createIngredientItem`, not
   `createItem`) exporting a **parameterized async function**, topped by the standardized
   **`@flow` header** (see below), e.g.:
   ```ts
   /**
    * @flow         createIngredientItem
    * @action       create                       // create | search | delete | update | verify | composite
    * @target       Item · Ingredient            // the entity + variant it operates on
    * @summary      Create an Ingredient item and return its id.
    * @params       name?="e2e-<ts>"  subType?="Produce"  unit?="g"
    * @returns      { itemId: string; name: string }        // what this flow PRODUCES (for composition)
    * @requires     —                                       // what it CONSUMES from other flows (ids/names)
    * @sideEffects  persistent · creates a real item on QA; no teardown (unique e2e-* name)
    * @pages        ItemPage
    * @recorded     <date> vs QA
    */
   import {Page} from "@playwright/test";
   export interface CreateIngredientItemInput { name?: string; subType?: string; /* ... */ }
   export async function createIngredientItem(page: Page, input: CreateIngredientItemInput = {}): Promise<{itemId: string; name: string}> {
       const name = input.name ?? `e2e-${Date.now()}`;   // unique → idempotent, no junk collisions
       // ...recorded steps, cleaned: relative goto, verified locators, input.* for data...
       // read the created id from the URL / DOM and return it
       return {itemId, name};
   }
   ```
   The **`@returns` / `@requires` pair is the composition contract**: `@returns` lists the ids/objects
   this flow produces; `@requires` lists ids/names it consumes from other flows. That's how a later
   flow (or the agent) knows a `create`'s `itemId` can feed a `delete`.
2. **Extract Page Objects** for the pages the flow touched into `scripts/regression/pages/` (reuse
   existing ones; create new ones only for pages not covered) so selectors live in one place and the
   flow + future regression specs share them.
3. Apply repo conventions: relative `page.goto`, `:visible` for modals/drawers, locator priority
   `getByTestId > getByRole/getByLabel > text`, `{timeout: 20000}` for code-split loads and backend
   writes, unique `e2e-*` data, read ids from URL/DOM (not from network).
4. Parameterize what the user will vary (name, type, …); keep required fields with sensible defaults.
5. If the flow creates persistent data, either expose a matching teardown (`deleteItem(id)`) or rely
   on unique names + the team's no-cleanup policy — state which in `@sideEffects`.
6. `npx tsc --noEmit -p tsconfig.scripts.json`; fix type errors.

## Step 4 — Verify (run it once)
Run the builder against QA via a tiny throwaway runner (or a temp spec) to confirm it creates and
returns an id:
```bash
$env:SESSION_ID="<id>"; npx ts-node -P tsconfig.scripts.json flows/.run-<flow>.ts   # temp: imports the builder, calls it, prints the id
```
- Success = it completes and returns a real id (and any Assert you recorded passes).
- A **locator timeout** = a bad/stale anchor → re-recon that step (open the page, fix the locator), re-run.
- Watch it if needed: record/run with `--headed` (window auto-maximizes) + `$env:SLOWMO="800"`.
- Clean up: delete `.tmp-storage.json`, the temp runner, and `flows/.recorded/<flow>.spec.ts`
  (keep only the refactored `flows/<name>.ts`). Note any test data left on QA.

## Step 5 — Register in `flows/FLOWS.md` (so it's discoverable + composable)
After it verifies, add/update the flow's entry in `flows/FLOWS.md` — this is what future runs and
the agent read to reuse and compose. Take the values straight from the `@flow` header:
1. Add a **row to the catalog table**: `Flow | Action | Target | Params | Returns | Requires`.
2. Add a **detail section**: file, action/target, params+defaults, returns, requires, "composes into",
   side effects, pages, and any gotchas worth carrying forward.
Keep the table and header in sync — the header in the `.ts` file is the source of truth; `FLOWS.md`
is its catalog.

## Step 6 — Output + how to use
- Keep `flows/<name>.ts` (+ any `pages/*.ts`) and the updated `flows/FLOWS.md`. Show the user both usages:
  ```ts
  // seed data (dev/QA):  npx ts-node -P tsconfig.scripts.json -e "..."  or a small script
  // in a regression spec (fixture / precondition):
  import {createIngredientItem} from "../../flows/createIngredientItem";
  const {itemId} = await createIngredientItem(page, {subType: "Buyouts"});
  ```

## Composing flows into a longer flow
When the user asks for a *combination* of existing flows (e.g. "automate create → search → delete
an item"), you don't record — you **compose**:
1. Read `flows/FLOWS.md`; pick the flows and **order them by matching `Returns` → `Requires`**
   (a `create` produces `itemId`/`name`; a `search`/`delete` consumes them).
2. Write a new `flows/<compositeName>.ts` that imports the flows and calls them in order, threading
   the returned ids. Give it a `@flow` header with `@action composite` and register it in `FLOWS.md`
   too (its `@requires` is usually `—`; its `@target` is the whole lifecycle):
   ```ts
   // @flow createSearchDeleteItem  @action composite  @target Item  @requires —  @returns { itemId }
   export async function createSearchDeleteItem(page: Page, input: CreateIngredientItemInput = {}) {
       const {itemId, name} = await createIngredientItem(page, input); // produces id + name
       await searchItem(page, {query: name});                          // consumes name
       await deleteItem(page, {itemId});                               // consumes id
       return {itemId};
   }
   ```
3. Verify it once (Step 4) like any other flow. A composite is itself a flow — bigger flows can
   compose it in turn.
- If a step the combination needs **doesn't exist yet**, record just that missing flow first
  (Steps 1–5), then compose.

## Honest caveats
- Multi-page flows are **more fragile** than single-page tests (more steps, cross-page state, async) —
  the record + verify loop is what keeps them honest; don't skip the run.
- **The step sequence/intent must come from a human** (a recording, or — for a composite — an
  ordered list of existing flows); the agent can't infer a *new* business flow from one page. It
  CAN, though, compose flows that already exist in `flows/FLOWS.md` without recording.
- It **mutates data** (creates real records on QA) — prefer unique names + a teardown; be mindful.

## Output contract
```
build-flow: <name>
  - recorded:   flows/.recorded/<flow>.spec.ts (from your session; skipped when composing)
  - flow:       flows/<name>.ts (@flow header: action/target, params <...>, returns <...>, requires <...>)
                (+ pages/<...>Page.ts reused/added)
  - verified:   ran once → created/acted <id> on qa
  - registered: flows/FLOWS.md (catalog row + detail section)
  - usage:      seed CLI + import in specs; composable via returns→requires
```
Do NOT commit unless the user asks.
