import {defineConfig} from "@playwright/test";
import {BASE_URL, AuthTarget} from "./scripts/test-auth/inject-session";

/**
 * Playwright config for the stable-page regression suite (scripts/regression).
 *
 * Target + auth are driven by env vars so the same suite runs against QA or local:
 *   SESSION_ID=<cookie>            inject a SessionId (falls back to scripts/test-auth/auth.json)
 *   TARGET=local                  run against local dev (default: qa)
 *   LOCAL_PORT=6444               local dev on a non-default Vite port
 *   SLOWMO=500                    pause 500ms between actions (watch a --headed run)
 *
 * Run:
 *   SESSION_ID=xxx npx playwright test                 headless, HTML report
 *   SESSION_ID=xxx npx playwright test --ui            interactive UI mode
 *   TARGET=local LOCAL_PORT=6444 SESSION_ID=xxx npx playwright test --ui
 *   npx playwright show-report                          open the last HTML report
 */
const target: AuthTarget = process.env.TARGET === "local" ? "local" : "qa";
const baseURL = target === "local" && process.env.LOCAL_PORT ? `https://localhost:${process.env.LOCAL_PORT}` : BASE_URL[target];

// Maximize the window automatically when watching (--headed / --debug), or force via MAXIMIZE=1.
// Headless runs keep a fixed, consistent 1280x720 viewport.
const maximize = process.env.MAXIMIZE === "1" || process.argv.some(a => a === "--headed" || a === "--debug");

export default defineConfig({
    testDir: "./scripts/regression",
    // Code-split routes can be slow to cold-load; give navigations room.
    timeout: 60_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    // Serial: the suite mutates data against a single shared backend (local dev
    // proxies to QA). Parallel workers contend on that backend and flake.
    workers: 1,
    // 1 retry absorbs transient backend latency on the shared QA backend.
    retries: 1,
    reporter: [
        ["list"],
        ["html", {open: "never"}],
        // Prettier self-contained dashboard (charts + per-step detail): open monocart-report/index.html
        ["monocart-reporter", {name: "Stable-Page Regression", outputFile: "./monocart-report/index.html"}],
    ],
    use: {
        baseURL,
        ignoreHTTPSErrors: true,
        screenshot: "only-on-failure",
        trace: "on-first-retry",
        video: "retain-on-failure",
        // viewport: null lets the page fill the maximized window (MAXIMIZE=1); otherwise a fixed size.
        viewport: maximize ? null : {width: 1280, height: 720},
        // Slow-motion for watching a --headed run: SLOWMO=500 pauses 500ms between actions.
        // Default 0 — no effect on normal/headless/CI runs.
        launchOptions: {
            slowMo: Number(process.env.SLOWMO) || 0,
            args: maximize ? ["--start-maximized"] : [],
        },
    },
});
