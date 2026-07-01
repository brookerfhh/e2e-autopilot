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

## Generate tests for a NEW page (with an AI agent)

This is the "autopilot" part. In this repo, using **Claude Code**:

1. `$env:SESSION_ID="<id>"`
2. `/regression-add-page https://cookbook.foodtruck-qa.com/<path>`

The agent then:
1. Looks up the page in the knowledge base `.claude/skills/regression-add-page/PAGES.md` (what it
   has, what to test, hidden rules) — so **QA needs no source code**.
2. **Recons the live page** (opens modals/dropdowns to read real elements) to confirm anchors.
3. Writes a human-readable `scripts/regression/tests/<page>.md` for **you to review**.
4. Compiles a Page Object + `<page>.spec.ts`.
5. Runs it against QA and fixes anchors until green.

Not in the catalog? The agent recons the live page and asks you for the URL/intent. See
`.claude/skills/regression-add-page/SKILL.md` for the full playbook.

---

## Layout

```
e2e-autopilot/
├── package.json / tsconfig*.json / playwright.config.ts   # project + runner config
├── login.cmd           # double-click to log into QA (saves the session for runs)
├── .claude/skills/regression-add-page/
│   ├── SKILL.md        # the generation playbook (recon → cases → script → verify)
│   └── PAGES.md        # per-page knowledge base (elements, capabilities, hidden rules)
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
