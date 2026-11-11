/**
 * Network trace for a UI flow: records every /ajax/ request the browser makes while the flow runs, so the
 * sequence the UI really uses (check → confirm → update) can be compared with an API-only version.
 *
 *   npm run flow -- <flowName> --trace            (writes flows/.recorded/<flowName>-<stamp>.trace.json, gitignored)
 *
 * Paths are also kept in a normalized form (uuid -> :id, item numbers -> :n) so two runs can be compared.
 */
import {Page} from "@playwright/test";
import {mkdirSync, writeFileSync} from "fs";
import {join} from "path";

export interface TraceEntry {
    readonly seq: number;
    readonly method: string;
    readonly path: string;
    readonly normalizedPath: string;
    readonly query: string | null;
    readonly body: unknown;
    status: number | null;
    readonly startedAt: number;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ITEM_NUMBER = /\/\d{6,}(?=\/|$)/g;
const MAX_BODY = 4000;

export const normalizePath = (path: string): string => path.replace(UUID, ":id").replace(ITEM_NUMBER, "/:n");

function bodyOf(postData: string | null): unknown {
    if (!postData) {
        return null;
    }
    const text = postData.length > MAX_BODY ? `${postData.slice(0, MAX_BODY)}…(truncated)` : postData;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export interface Trace {
    readonly entries: TraceEntry[];
    /** writes + any "check" call, in order — the part that matters for an API replay */
    writes(): TraceEntry[];
    save(name: string): string;
}

export function attachTrace(page: Page): Trace {
    const entries: TraceEntry[] = [];
    const started = Date.now();
    page.on("request", request => {
        const url = new URL(request.url());
        if (!url.pathname.startsWith("/ajax/")) {
            return;
        }
        entries.push({
            seq: entries.length + 1,
            method: request.method(),
            path: url.pathname,
            normalizedPath: normalizePath(url.pathname),
            query: url.search || null,
            body: bodyOf(request.postData()),
            status: null,
            startedAt: Date.now() - started,
        });
    });
    page.on("response", response => {
        const url = new URL(response.url());
        const entry = [...entries].reverse().find(e => e.status === null && e.path === url.pathname && e.method === response.request().method());
        if (entry) {
            entry.status = response.status();
        }
    });
    return {
        entries,
        writes: () => entries.filter(e => e.method !== "GET" || /check/i.test(e.path)),
        save(name: string): string {
            const dir = join(__dirname, ".recorded");
            mkdirSync(dir, {recursive: true});
            const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
            const file = join(dir, `${name}-${stamp}.trace.json`);
            writeFileSync(file, JSON.stringify(entries, null, 2));
            return file;
        },
    };
}

/** One line per write / check call, for the console. */
export function formatTrace(trace: Trace): string {
    const gets = trace.entries.filter(e => e.method === "GET").length;
    const lines = trace.writes().map(e => `${String(e.seq).padStart(4)}  ${e.method.padEnd(6)} ${e.normalizedPath}  -> ${e.status ?? "?"}`);
    return [`TRACE: ${trace.entries.length} ajax calls (${gets} GET); writes and checks in order:`, ...lines].join("\n");
}
