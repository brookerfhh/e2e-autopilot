/**
 * Auth + browser helper for flow-kit flows. Self-contained — no repo scaffolding needed.
 *
 * Env:
 *   APP_URL         full origin of the target app, e.g. https://app.example.com  (required)
 *   SESSION_ID      the session cookie value copied from DevTools (auth)
 *   SESSION_COOKIE  cookie name to inject      (default "SessionId")
 *   SLOWMO          ms between actions when --headed (default 0)
 */
import {Browser, BrowserContext, chromium} from "@playwright/test";

export function appUrl(): string {
    const url = process.env.APP_URL;
    if (!url) {
        throw new Error("APP_URL is not set — export APP_URL=https://your-app.example.com");
    }
    return url.replace(/\/+$/, "");
}

/** Launch chromium (headless unless --headed is in argv). */
export function launchBrowser(argv: string[] = process.argv): Promise<Browser> {
    const headed = argv.includes("--headed");
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
    const headed = argv.includes("--headed");
    const context = await browser.newContext({
        baseURL: base,
        ignoreHTTPSErrors: true,
        viewport: headed ? null : {width: 1280, height: 720},
    });
    const sessionId = process.env.SESSION_ID;
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
