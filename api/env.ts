/**
 * Environment guards shared by the API client and the browser flows. No Playwright import on purpose:
 * everything under api/ must work without a browser.
 *
 * Env:
 *   APP_URL         target origin, QA only (default: DEFAULT_APP_URL)
 *   SESSION_ID      session cookie value; falls back to SESSION_FILE. Never logged.
 *   SESSION_COOKIE  cookie name (default "SessionId")
 */
import {readFileSync} from "fs";
import {homedir} from "os";
import {join} from "path";

/** QA origin used when APP_URL is not set. Still passes through assertNonProd. */
export const DEFAULT_APP_URL = "https://cookbook.foodtruck-qa.com";

/**
 * QA-only guard. Everything here writes real data (create versions, edit items, publish), so it must never
 * run against production. A host is accepted only if it is localhost or its name contains a non-prod marker
 * (qa / uat / staging / dev / local). There is deliberately no override switch.
 */
export function assertNonProd(origin: string): void {
    const host = new URL(origin).hostname.toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const hasMarker = /(^|[.-])(qa|uat|staging|stage|dev|local)([.-]|$)/.test(host);
    if (!isLocal && !hasMarker) {
        throw new Error(`Refusing to run: APP_URL host "${host}" does not look like a QA/non-prod environment. Only QA is allowed.`);
    }
}

export function appUrl(): string {
    const origin = (process.env.APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");
    assertNonProd(origin);
    return origin;
}

/** Fallback file for SESSION_ID, in the user's home dir — deliberately outside the repo so it can never be committed. */
export const SESSION_FILE = process.env.E2E_SESSION_FILE || join(homedir(), ".e2e-autopilot", "session");

/** SESSION_ID env first, then SESSION_FILE. */
export function readSessionId(): string | undefined {
    if (process.env.SESSION_ID) {
        return process.env.SESSION_ID;
    }
    try {
        return readFileSync(SESSION_FILE, "utf8").trim() || undefined;
    } catch {
        return undefined;
    }
}
