/**
 * Auth + browser helper for flow-kit flows. Self-contained — no repo scaffolding needed.
 *
 * Env:
 *   APP_URL         full origin of the target app, e.g. https://app.example.com  (required)
 *   SESSION_ID      the session cookie value copied from DevTools (auth)
 *   SESSION_COOKIE  cookie name to inject      (default "SessionId")
 *   SLOWMO          ms between actions (default 0)
 *
 * The browser opens by DEFAULT (headed). Pass --headless in argv to run without a visible UI.
 */
import {Browser, BrowserContext, chromium} from "@playwright/test";
import {appUrl, readSessionId} from "../api/env";

// The QA-only guard, APP_URL default and session lookup live in api/env.ts (no Playwright needed there);
// re-exported so existing `from "./_auth"` imports keep working.
export {appUrl, assertNonProd, DEFAULT_APP_URL, readSessionId, SESSION_FILE} from "../api/env";

/** Headed by DEFAULT (the browser opens). Pass --headless in argv to run without a UI. */
export function isHeaded(argv: string[] = process.argv): boolean {
    return !argv.includes("--headless");
}

/** Launch chromium (headed by default; pass --headless to hide the UI). */
export function launchBrowser(argv: string[] = process.argv): Promise<Browser> {
    const headed = isHeaded(argv);
    return chromium.launch({
        headless: !headed,
        slowMo: Number(process.env.SLOWMO) || 0,
        args: headed ? ["--start-maximized"] : [],
    });
}

/** A context with baseURL set (so flows use relative goto) and the session cookie injected. */
export async function authedContext(browser: Browser, argv: string[] = process.argv): Promise<BrowserContext> {
    const base = appUrl();
    // headed → viewport:null so the page fills the maximized window (else Playwright locks 1280x720)
    const headed = isHeaded(argv);
    const context = await browser.newContext({
        baseURL: base,
        ignoreHTTPSErrors: true,
        viewport: headed ? null : {width: 1280, height: 720},
    });
    const sessionId = readSessionId();
    if (sessionId) {
        await context.addCookies([
            {
                name: process.env.SESSION_COOKIE || "SessionId",
                value: sessionId,
                domain: new URL(base).hostname,
                path: "/",
                secure: true,
                sameSite: "None",
            },
        ]);
    }
    return context;
}
