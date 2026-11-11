/**
 * Single exit point for every direct `/ajax/...` call made by e2e data-setup code.
 *
 * Env:
 *   APP_URL         origin of the target app, QA only (default: the QA origin in flows/_auth.ts)
 *   SESSION_ID      session cookie value; falls back to ~/.e2e-autopilot/session (outside the repo). Never logged.
 *   SESSION_COOKIE  cookie name (default "SessionId")
 *   API_TIMEOUT_MS  per-request timeout (default 30000)
 *
 * Guards:
 *   - assertNonProd(APP_URL) runs before any request (shared with flows/_auth.ts, no override).
 *   - assertE2EName(name) lets callers refuse to create/modify anything not named e2e-auto-*.
 */
import {appUrl, readSessionId, SESSION_FILE} from "./env";

export const E2E_NAME_PREFIX = "e2e-auto-";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class ApiError extends Error {
    constructor(
        readonly method: HttpMethod,
        readonly path: string,
        readonly status: number,
        readonly responseBody: string,
    ) {
        super(`${method} ${path} -> ${status}: ${responseBody.slice(0, 500)}`);
        this.name = "ApiError";
    }
}

interface ApiConfig {
    readonly origin: string;
    readonly cookie: string;
    readonly timeoutMs: number;
}

function readConfig(): ApiConfig {
    const origin = appUrl(); // APP_URL or the QA default; assertNonProd inside

    const sessionId = readSessionId();
    if (!sessionId) {
        throw new Error(`SESSION_ID is not set — export it, or put it in ${SESSION_FILE} (outside the repo)`);
    }
    const cookieName = process.env.SESSION_COOKIE || "SessionId";
    const timeoutMs = Number(process.env.API_TIMEOUT_MS) || 30000;
    return {origin, cookie: `${cookieName}=${sessionId}`, timeoutMs};
}

export async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    if (!path.startsWith("/ajax/")) {
        throw new Error(`Refusing non-ajax path: ${path}`);
    }
    const {origin, cookie, timeoutMs} = readConfig();

    const headers: Record<string, string> = {Cookie: cookie, Accept: "application/json"};
    const hasBody = body !== undefined;
    if (hasBody) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${origin}${path}`, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
    });

    const text = await response.text();
    if (!response.ok) {
        throw new ApiError(method, path, response.status, text);
    }
    // Many PUT endpoints return an empty body (void).
    return (text ? JSON.parse(text) : undefined) as T;
}

export const get = <T>(path: string): Promise<T> => request<T>("GET", path);
export const post = <T>(path: string, body?: unknown): Promise<T> => request<T>("POST", path, body);
export const put = <T>(path: string, body?: unknown): Promise<T> => request<T>("PUT", path, body);
export const del = <T>(path: string): Promise<T> => request<T>("DELETE", path);

/** Throws unless the name carries the e2e-auto- prefix. Call before creating or modifying an item. */
export function assertE2EName(name: string | null | undefined): asserts name is string {
    if (!name || !name.startsWith(E2E_NAME_PREFIX)) {
        throw new Error(`Refusing to touch item "${name ?? ""}": name must start with "${E2E_NAME_PREFIX}"`);
    }
}

/** Local time as YYYYMMDD-HHmm: readable and sortable for cleanup. Two runs in the same minute share a stamp. */
export function runStamp(date: Date = new Date()): string {
    const p = (v: number, len = 2) => String(v).padStart(len, "0");
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
}

/** e2e-auto-<YYYYMMDD-HHmm>-<n>; pass the same runId for every item of one run. */
export function e2eName(n: number | string, runId: string = runStamp()): string {
    return `${E2E_NAME_PREFIX}${runId}-${n}`;
}
