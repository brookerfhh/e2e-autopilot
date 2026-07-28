---
name: prepare-data
description: >-
  Front door for "I need test data" requests — MATCH the request against existing flows and RUN
  them, only building something new when nothing fits. Use when the user asks to prepare/seed/set
  up data in natural language (not naming a flow), e.g. "帮我准备一个可以 publish 的 menu item",
  "造一个带组件的 ingredient", "seed a fully-configured menu item", "准备一批测试数据",
  "prepare data for X", "/prepare-data <what>". Reads flows/FLOWS.md + cb-knowledge/, picks a single
  flow / composes existing flows / or — if nothing satisfies — tells the user what's missing and
  asks whether to create a new flow, then HANDS OFF to build-flow. It does NOT record or author
  flows itself (that is build-flow's job) and does NOT set up the repo (that is flow-kit's job).
---

# prepare-data — match a data request to existing flows, run it, or route to build-flow

prepare-data is the **intent / routing** layer that sits in front of the flow skills. The user
describes the *data they want* (not a flow name); this skill decides **how to produce it** from
what already exists, runs it, and reports the result with links. It only escalates to authoring a
new flow when the catalog genuinely can't satisfy the request — and even then it **asks first**.

This is the opposite direction from `build-flow`: build-flow's entry assumes "I want to author a
flow"; prepare-data's entry is "I want the data, don't care how". Keeping them separate keeps each
skill's routing clean.

**Sibling skills (do NOT duplicate their work — hand off):**
- `flow-kit` — repo setup / onboarding (deps, scaffolding). If `flows/` or `flows/FLOWS.md` is
  missing, or a run fails on a missing prerequisite, hand off to flow-kit first.
- `build-flow` — records + authors + registers a NEW flow. When no existing flow fits, this is
  where prepare-data hands off. **prepare-data never records or refactors a flow itself.**

## Inputs
- A natural-language description of the wanted data (e.g. "a publishable menu item with fields
  configured", "an ingredient with stock fields set").
- Runtime env: `APP_URL` + `SESSION_ID` (same as any flow run). These are usually in
  `.claude/settings.local.json`'s `env`, or the shell env. If absent, ask the user (SESSION_ID is a
  live cookie from DevTools → Application → Cookies); never store, commit, or echo it.

## Step 0 — Read the catalog and the domain knowledge
Read these before deciding anything (they are the source of truth for what exists and what the
business needs):
- `flows/FLOWS.md` — the catalog of executable flows (table + per-flow detail: params, **Returns**,
  **Requires**, side effects, gotchas).
- `cb-knowledge/` (if present at repo root) — the hand-maintained business knowledge (object types,
  required fields, what "publishable" means for each entity). Use it to judge whether a flow really
  produces what the user asked for (e.g. a *publishable* menu item needs component + concept +
  service reviewed + nutrition reviewed).

If `flows/FLOWS.md` doesn't exist → the repo isn't set up. Hand off to **flow-kit**, then resume.

## Step 1 — Match the request to a resolution (in priority order)
Classify the request into exactly one of these, and say which one you picked and why:

**A. One existing flow satisfies it.** A single catalog flow's Target + Returns matches the ask —
where "matches" means the flow produces the *complete* end-state per `cb-knowledge/`, not just a
name that sounds right. Example: a **publishable menu item** needs component + concept + service +
nutrition **+ Packaged SKU** (see `cb-knowledge/流程.md`), so the right flow is **`buildFullMenuItem`**
(it configures Packaged SKU too), run with an existing published item as its `component` — NOT
`assembleFullMenuItem`, which stops at nutrition and omits Packaged SKU, so its output is not truly
publish-ready. Use `assembleFullMenuItem` only when the user does NOT need Packaged SKU / publish
and wants the component auto-created too. → go to Step 2, run it.

**B. A composition of existing flows satisfies it.** No single flow, but chaining existing flows by
matching `Returns` → `Requires` does (e.g. "create a menu item then delete it" =
`createDraftMenuItem` → `searchItem` → `deleteItem`). Prefer an existing **composite** flow if one
already covers the chain. If it's a brand-new chain the user will want again, note that build-flow
can persist it as a `@action composite` flow — but for a one-off you may just run the steps in order
via the runner. → Step 2.

**C. Nothing fits (a required step is missing).** Part of the request has no flow, and it can't be
composed from what exists (e.g. the user wants a brand-new object type never recorded). → Step 3,
ask before building.

When unsure between A and B, prefer the **fewest side effects** and the flow whose `@summary`/detail
most exactly matches the wanted end-state. Do not force a poor match into "close enough" — a wrong
flow creates junk data on QA.

## Step 2 — Confirm parameters, then run
Before running, surface the choices that change the outcome or have side effects, and pick sensible
defaults (state them):
- Parameters the user likely cares about (name, concept, type, quantities). Use the flow's documented
  defaults unless the user specified otherwise.
- **Destructive / hard-to-undo branches** — publish, delete. Default to the SAFE stopping point:
  produce the DRAFT / configured item and **stop before** publish/delete unless the user explicitly
  asked to publish/delete. Publish is persistent and hard to undo — always confirm first.
- Headed vs headless: default **headed** — run WITHOUT `--headless` so a maximized browser window
  opens and the user can watch the flow drive the app (this is the runner's own default too). Only
  add `--headless` if the user explicitly asks for no window (e.g. a background/batch run).

Run via the generic runner from repo root (headed by default — no `--headless`):
```bash
npx ts-node -P tsconfig.flows.json flows/_run.ts <flowName> [--input '{"k":"v"}']
```
For a composition without a persisted composite flow, run each step in order, threading the returned
ids/names (a `create`'s `name`/`itemId` into the next step's input).

Report the result: the entity name(s), item number(s), the clickable detail URL, and which fields
were configured/verified (read them from the `RESULT:` JSON). If the request had a
publish/delete follow-up you intentionally stopped before, give the exact command to finish it and
ask whether to run it.

## Step 3 — Nothing fits: tell the user what's missing, then ask (don't auto-build)
When the catalog can't satisfy the request:
1. Say clearly **what's missing** — which step/entity has no flow and can't be composed. Reference
   `cb-knowledge/` for the fields/steps that step would need, if known.
2. Show the **closest partial matches** (flows that cover part of it) so the user sees what's already
   there.
3. **Ask** whether to create the missing flow. Building records real interaction and mutates QA data,
   so it's the user's call — never silently launch a recording.
4. On yes → **hand off to build-flow** (record → refactor → register). Do not record or refactor
   here. After build-flow registers the new flow, resume prepare-data from Step 1 to run it and
   deliver the data.

## Output contract
```
prepare-data: <what was asked>
  - catalog:    read flows/FLOWS.md (+ cb-knowledge/ if present)
  - resolution: A single flow <name> | B compose <a→b→c> | C missing → build-flow
  - ran:        <flow(s)> [--input ...]   (headed by default; --headless only if user asked)
  - produced:   <entity> #<number> — <url>   (fields configured: <...>, verified: <...>)
  - stopped-before: <publish/delete>  → command to finish + ask
  - next:       <finish command | build-flow handoff | done>
```

## Common mistakes
- **Recording or refactoring here.** If you're about to `playwright codegen` or write a
  `flows/*.ts`, stop — that's build-flow. prepare-data matches and runs; it only *routes* to authoring.
- **Auto-publishing / auto-deleting.** Default to the DRAFT / safe state and confirm before any
  hard-to-undo step.
- **Forcing a poor match.** If no flow really produces the asked-for end-state, that's a Step 3
  (missing), not a "close enough" run — a wrong flow just litters QA.
- **Skipping cb-knowledge/.** It's how you know whether a flow's output is *actually* complete
  (e.g. what makes a menu item publishable). Don't judge completeness from flow names alone.
- **Ignoring setup failures.** Missing `flows/` or a prerequisite error → hand off to flow-kit, don't
  improvise scaffolding.
Do NOT commit unless the user asks.
