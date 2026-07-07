---
name: flow-kit
description: >-
  Use when a repo needs to be SET UP / onboarded for the e2e flow skills before any flow can be
  built — Playwright/deps not installed, no flows/ scaffolding, first-time use, or a run failed on
  a missing prerequisite. Triggers: /flow-kit, "初始化 e2e 环境", "环境没装好/装依赖", "从零准备造数脚本环境",
  "set up before build-flow", "bootstrap playwright flows". Checks the environment, installs deps,
  scaffolds flows/ + auth + runner, verifies prerequisites, then hands off to build-flow. It does
  NOT record or author flows — that is build-flow's job.
---

# flow-kit — prepare a repo for the e2e flow skills (env · deps · init)

flow-kit is the **setup / onboarding** step. It gets a repo ready — dependencies, browser, auth,
and the `flows/` scaffolding — then **hands off**. It deliberately does NOT record, refactor, or
compose flows; that is build-flow's job, and duplicating it here would only drift.

**REQUIRED NEXT SKILL:** once flow-kit reports "ready", use `build-flow` to record and build a flow
(and `regression-add-page` for per-page regression tests). Do not re-explain those workflows here.

`<skill-dir>` = this skill's base directory; `templates/` holds the files to copy.

## Step 1 — Environment & dependencies
- **Node ≥ 20** (`node -v`).
- Dev deps present in the repo: `@playwright/test`, `ts-node`, `typescript`, `@types/node`.
  If any are missing, install them (`npm i -D @playwright/test ts-node typescript @types/node`,
  or the repo's package manager — pnpm/yarn).
- **Chromium** downloaded: `npx playwright install chromium` (Playwright drives its own browser;
  no system Chrome needed).

## Step 2 — Target app config (don't verify auth here)
The flow skills hit a deployed app:
- `APP_URL` — full origin of the target app (e.g. `https://app.example.com`). Set it (or confirm the
  repo defaults it); the cookie domain is derived from it. Set `SESSION_COOKIE` only if the app's
  session cookie isn't named `SessionId`.

Do **not** check or require `SESSION_ID` here. Auth is a **live, short-lived credential supplied at
run time** — the user passes it when build-flow records/runs a flow, not during setup. Just mention
it'll be needed then (DevTools → Application → Cookies → `SessionId`); never store, commit, or echo it.

## Step 3 — Initialize the flows/ scaffolding (idempotent; never overwrite existing files)
For each, copy from `<skill-dir>/templates/` **only if the destination is absent**:
- `flows/_auth.ts`      ← `templates/_auth.ts`      (APP_URL→baseURL + SESSION_ID cookie injection)
- `flows/_run.ts`       ← `templates/_run.ts`       (generic runner: `flows/_run.ts <name>`)
- `tsconfig.flows.json` ← `templates/tsconfig.flows.json`   (repo root; `include` is `flows/**`)
- `flows/FLOWS.md`      ← `templates/FLOWS.template.md`     (the flow catalog)
- `mkdir -p flows/pages flows/.recorded`

Also suggest gitignoring generated output: `flows/` is per-user (recordings, throwaway runners, and
the flows themselves) — add `flows/` and `.tmp-storage.json` to `.gitignore` if not already ignored.

## Step 4 — Verify readiness (smoke check)
Confirm the scaffold type-checks before handing off:
```bash
npx tsc --noEmit -p tsconfig.flows.json
```
Green = the toolkit is wired correctly. (A full end-to-end check happens when build-flow runs its
first flow with real `APP_URL` + `SESSION_ID`.)

## Step 5 — Hand off
Report what was installed/created and what was already present, then point the user on:
```
flow-kit: ready
  - env:     node <v>, @playwright/test <v>, chromium installed
  - config:  APP_URL <set/missing>   (SESSION_ID supplied at run time, not here)
  - created: <files created>   (already present: <files skipped>)
  - next:    use build-flow to record & build a flow  (or regression-add-page for page tests)
```

## Common mistakes
- **Duplicating build-flow here.** If you find yourself writing record/refactor/compose steps, stop —
  hand off to build-flow instead.
- **Overwriting a user's existing scaffolding.** Every copy in Step 3 is conditional on absence.
- **Committing secrets or generated flows.** `SESSION_ID` is a live credential; `flows/` is per-user.
Do NOT commit unless the user asks.
