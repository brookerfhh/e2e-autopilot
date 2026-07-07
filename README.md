# e2e-autopilot

AI-agent-generated **Playwright e2e regression suite** for stable admin pages of the Cookbook
app (Wonder). The method: **recon the live page → generate reviewable test cases → compile
Playwright scripts → run against QA and fix until green.** Tests are behavioral (not data-bound)
and leave QA clean (no junk data), so they're safe to re-run before every release.

Ships with **59 cases across 12 pages** plus a Claude Code skill (`regression-add-page`) and a
page knowledge base (`PAGES.md`) so QA can add tests for new pages **without reading code**.

---

## Prerequisites

- **Node.js ≥ 20**
- Access to the **QA** environment — log in via `login.cmd` (or paste a `SessionId`); see [Auth](#auth).
  No local Chrome needed; Playwright downloads its own Chromium.
- To *generate new* tests (not just run existing ones): **Claude Code** (or another agent) in this repo.

## Install (one-time)

```bash
npm install
npx playwright install chromium
```
> pnpm/yarn also work. `npx playwright install chromium` downloads the browser binary Playwright drives.

## Quick start

```powershell
# 1) log in once (opens a browser; log into QA, then press Enter):
.\login.cmd
# 2) run everything against QA:
$env:TARGET="qa"; npm test
# 3) open the pretty dashboard:
start monocart-report\index.html
```

Prefer not to use `login.cmd`? Paste a SessionId instead:
`$env:SESSION_ID="<id>"; $env:TARGET="qa"; npm test` (macOS/Linux: `SESSION_ID=<id> TARGET=qa npm test`).

---

## Auth

Tests hit the deployed **QA** app and need you to be logged in. Two ways:

**Option A — `login.cmd` (recommended, no cookie hunting).** Double-click `login.cmd` (or run it):
a browser opens, you log into QA, press Enter — your session is saved to
`scripts/test-auth/auth.json` and every run uses it automatically. Re-run when it expires
(after a few hours). `auth.json` is gitignored — never commit it.

**Option B — paste a SessionId.** Log into QA (`https://cookbook.foodtruck-qa.com`) →
DevTools → Application → Cookies → copy the **`SessionId`** value → pass it via the `SESSION_ID`
env var (below). It's a live credential — don't share it; it expires after a few hours.

Env vars (read by `playwright.config.ts`):

| Var | Values | Meaning |
|-----|--------|---------|
| `SESSION_ID` | cookie value | auth (falls back to a saved `scripts/test-auth/auth.json` if set up) |
| `APP_URL` | full origin, e.g. `https://your-app.example.com` | which app to test — **default is Cookbook QA**; other teams set this (no code edit), cookie domain is auto-derived |
| `TARGET` | `qa` (default) / `local` | which environment to hit |
| `LOCAL_PORT` | e.g. `6444` | local dev on a non-default Vite port |
| `SLOWMO` | e.g. `800` | ms between actions (watch a `--headed` run) |
| `MAXIMIZE` | `1` | force a maximized window (auto when `--headed`) |

## Commands

```powershell
# run everything (QA, headless, HTML + monocart reports)
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npm test

# one page (spec name)
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npx playwright test brand-management

# interactive UI mode (run/re-run, time-travel each step)
$env:SESSION_ID="<id>"; $env:TARGET="qa"; npm run test:ui

# watch the flow live (real browser, slow motion, maximized)
$env:SESSION_ID="<id>"; $env:TARGET="qa"; $env:SLOWMO="800"; npx playwright test brand-management --headed --workers=1

# reports
start monocart-report\index.html    # prettier dashboard
npm run report                       # default Playwright HTML report
```

Windows shortcut (sets env + opens UI mode): `scripts\regression\run.cmd <SessionId>`

Full command list + the 59-case inventory: [`scripts/regression/README.md`](scripts/regression/README.md).

---

## AI skills (`.claude/skills`)

This is the "autopilot" part — three **Claude Code** skills that pair to set up, seed, and test.
They form a pipeline: **flow-kit** prepares the ground; **build-flow** and **regression-add-page**
do the work.

| Skill | Use it when… | What it produces |
|-------|--------------|------------------|
| **flow-kit** | a repo isn't set up yet — no Playwright/deps, no `flows/`, first-time use | installs deps + chromium, scaffolds `flows/` (auth helper, runner, tsconfig, `FLOWS.md`), verifies it compiles, then hands off. Doesn't author flows. |
| **build-flow** | you need to **seed data / drive a business flow** — create an item, search, delete; or a fixture for regression | records the flow once → refactors into a parameterized `flows/<name>.ts` (returns the new id) → verifies → registers it in `flows/FLOWS.md`. Existing flows **compose** into longer ones (create→search→delete) via `returns→requires`. |
| **regression-add-page** | you need **behavioral e2e regression tests** for one stable admin page | recons the live page → reviewable `tests/<page>.md` → Page Object + `<page>.spec.ts` → runs against QA and fixes anchors until green. Leaves QA clean. |

**Auth is supplied at run time** (not during setup): pass `SESSION_ID` when a skill records or runs
against the app. It's a live, short-lived credential — never commit or share it.

### build-flow (seed data / flows)

```powershell
$env:SESSION_ID="<id>"                       # live session cookie, passed at run time
/build-flow create-item                       # or: "做一个 create item 的造数脚本"
```
Records once (a logged-in browser opens — do the flow, then close it), refactors into
`flows/createIngredientItem.ts`, verifies, and registers it in `flows/FLOWS.md`. Ask it to
**compose** (`"把 create→search→delete 组合起来"`) and it chains existing flows without re-recording.
`flows/` is per-user generated (gitignored). See `.claude/skills/build-flow/SKILL.md`.

### regression-add-page (page tests)

```powershell
$env:SESSION_ID="<id>"
/regression-add-page https://cookbook.foodtruck-qa.com/<path>
```
The agent then:
1. Looks up the page in the knowledge base `.claude/skills/regression-add-page/PAGES.md` (what it
   has, what to test, hidden rules) — so **QA needs no source code**.
2. **Recons the live page** (opens modals/dropdowns to read real elements) to confirm anchors.
3. Writes a human-readable `scripts/regression/tests/<page>.md` for **you to review**.
4. Compiles a Page Object + `<page>.spec.ts`.
5. Runs it against QA and fixes anchors until green.

Not in the catalog? The agent recons the live page and asks you for the URL/intent. See
`.claude/skills/regression-add-page/SKILL.md` for the full playbook.

### flow-kit (first-time setup)

```
/flow-kit                                     # or: "初始化 e2e 环境" / "装依赖准备造数脚本"
```
Mainly for a **fresh/other repo** without this suite's scaffolding: it installs deps, sets up
`APP_URL`, scaffolds `flows/`, and points you to build-flow. This repo already ships the full
`scripts/` scaffold, so here flow-kit is only needed to bootstrap `flows/` or a clean checkout.

---

## Layout

```
e2e-autopilot/
├── package.json / tsconfig*.json / playwright.config.ts   # project + runner config
├── login.cmd           # double-click to log into QA (saves the session for runs)
├── .claude/skills/
│   ├── flow-kit/       # first-time setup: env/deps/init, then hands off (SKILL.md + templates/)
│   ├── build-flow/     # record → build → compose data-setup flows (SKILL.md + FLOWS template)
│   └── regression-add-page/
│       ├── SKILL.md    # the generation playbook (recon → cases → script → verify)
│       └── PAGES.md    # per-page knowledge base (elements, capabilities, hidden rules)
├── flows/              # build-flow output: per-user data-setup scripts + FLOWS.md (gitignored)
└── scripts/
    ├── test-auth/      # SessionId / storageState auth helpers
    └── regression/
        ├── fixtures.ts        # authenticated Playwright fixture
        ├── run.cmd            # Windows launcher
        ├── pages/*.ts         # one Page Object per page
        ├── *.spec.ts          # one spec per page (the cases)
        ├── tests/*.md         # human-readable cases (skill output; reviewable)
        └── README.md          # full command list + 59-case inventory
```

## Notes / conventions

- **Behavioral assertions**, not data-bound (assert "search narrows", "dialog opens" — never "row 1 = X").
- **No junk data**: pages with delete → idempotent create→delete; create-only pages → open form +
  validate + cancel (never submit); read-only → load + structure.
- **Serial + 1 retry** (`workers: 1`): the suite mutates data against one shared backend, so
  parallel workers contend and flake.
- **App source is NOT in this repo by design** — that's why it uses the `PAGES.md` catalog + live
  recon. Regenerate `PAGES.md` when pages change (re-read the app's components).
- **Reusing for another app / team**: no code edit — set `APP_URL=https://your-app.example.com`
  (a full origin); the cookie domain is derived from it. The `regression-add-page` skill also
  reads the origin from the full page URL you give it, so it can just ask once and set `APP_URL`.
  You'd start a fresh `PAGES.md` for your app (or skip it and rely on recon).
- **Known-blocked**: OG Sync Log (`/sync-job-log/og`) needs an account with that permission.
- **Never commit `scripts/test-auth/auth.json`** (session cookies) — it's gitignored.
