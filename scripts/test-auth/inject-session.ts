/**
 * SessionId-based authentication helpers.
 *
 * Two authentication strategies are supported across e2e scripts:
 *
 *  A. storageState mode (save-auth.ts)  — full cookies after an interactive login.
 *  B. SessionId injection mode (this file) — paste a single SessionId cookie value
 *     (copied from DevTools or env var) and inject it before navigation. Faster, no
 *     interactive browser window needed.
 *
 * Usage in a test script:
 *
 *   import {createAuthenticatedContext} from "../../../scripts/test-auth/inject-session";
 *
 *   const context = await createAuthenticatedContext(browser, {
 *       target: "qa",                          // "qa" | "local"
 *       sessionId: process.env.SESSION_ID,      // optional; falls back to auth.json
 *   });
 *
 * If `sessionId` is provided, it is injected and storageState is ignored.
 * If `sessionId` is omitted, the helper falls back to the storageState file
 * produced by save-auth.ts.
 */
import {Browser, BrowserContext} from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

export const AUTH_FILE = path.resolve(__dirname, "auth.json");

export type AuthTarget = "qa" | "local";

export interface AuthOptions {
    target: AuthTarget;
    sessionId?: string;
}

// Default app (Cookbook QA). OTHER teams point this at their own app WITHOUT editing code:
//   set env APP_URL=https://your-app.example.com   (a full origin)
// The SessionId cookie's domain is derived from this URL, so no per-app hardcoding.
const DEFAULT_QA_URL = "https://cookbook.foodtruck-qa.com";

export const BASE_URL: Record<AuthTarget, string> = {
    qa: process.env.APP_URL || DEFAULT_QA_URL,
    local: process.env.LOCAL_PORT ? `https://localhost:${process.env.LOCAL_PORT}` : "https://localhost:6443",
};

/** Cookie domain derived from the resolved base URL — no hardcoded per-app domain. */
function cookieDomain(target: AuthTarget): string {
    try {
        return new URL(BASE_URL[target]).hostname;
    } catch {
        return "localhost";
    }
}

/**
 * Resolve the base URL, honoring overrides (useful when Vite picks a non-default
 * port, e.g. 6444, because 6443 is already in use). Precedence:
 *   1. --base=<url>            explicit full URL
 *   2. --local-port=<n>        localhost on a custom port
 *   3. LOCAL_PORT env          localhost on a custom port
 *   4. BASE_URL[target]        default (qa, or localhost:6443)
 */
export function resolveBaseUrl(options: AuthOptions, argv: string[]): string {
    for (const arg of argv.slice(2)) {
        if (arg.startsWith("--base=")) return arg.slice("--base=".length);
        if (arg.startsWith("--local-port=")) return `https://localhost:${arg.slice("--local-port=".length)}`;
    }
    if (options.target === "local" && process.env.LOCAL_PORT) {
        return `https://localhost:${process.env.LOCAL_PORT}`;
    }
    return BASE_URL[options.target];
}

export async function createAuthenticatedContext(
    browser: Browser,
    options: AuthOptions,
): Promise<BrowserContext> {
    const {target, sessionId} = options;

    if (sessionId) {
        const context = await browser.newContext({ignoreHTTPSErrors: true});
        await context.addCookies([
            {
                name: "SessionId",
                value: sessionId,
                domain: cookieDomain(target),
                path: "/",
                secure: true,
                sameSite: "None",
            },
        ]);
        return context;
    }

    if (!fs.existsSync(AUTH_FILE)) {
        throw new Error(
            `No SessionId provided and ${AUTH_FILE} does not exist. ` +
                "Run `npx ts-node -P tsconfig.scripts.json scripts/test-auth/save-auth.ts` first, " +
                "or pass --session=<value> to the test script.",
        );
    }
    return browser.newContext({
        storageState: AUTH_FILE,
        ignoreHTTPSErrors: true,
    });
}

/**
 * Parse `--session=xxx` / `--target=qa|local` from process.argv.
 * Designed to be the standard arg shape every generated test script accepts.
 */
export function parseAuthArgs(argv: string[]): AuthOptions {
    let target: AuthTarget = "qa";
    let sessionId: string | undefined = process.env.SESSION_ID;
    for (const arg of argv.slice(2)) {
        if (arg.startsWith("--session=")) sessionId = arg.slice("--session=".length);
        else if (arg === "--qa") target = "qa";
        else if (arg === "--local") target = "local";
        else if (arg.startsWith("--target=")) target = arg.slice("--target=".length) as AuthTarget;
    }
    return {target, sessionId};
}
