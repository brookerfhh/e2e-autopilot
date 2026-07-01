/**
 * Save QA + Local login state to auth.json (shared by all e2e scripts).
 *
 * Usage:
 *   npx ts-node -P tsconfig.scripts.json scripts/test-auth/save-auth.ts
 *
 * Flow:
 *   1. Opens a Chromium window pointed at QA.
 *   2. You complete the QA login manually.
 *   3. Press Enter in the terminal.
 *   4. Script then opens Local once so the same context auto-logs into localhost.
 *   5. The full storageState is persisted to scripts/test-auth/auth.json.
 *
 * The resulting auth.json is consumed via:
 *   await browser.newContext({ storageState: AUTH_FILE });
 */
import {chromium} from "@playwright/test";
import * as path from "path";

export const AUTH_FILE = path.resolve(__dirname, "auth.json");
const QA_URL = process.env.APP_URL || "https://cookbook.foodtruck-qa.com"; // other apps: set APP_URL
const LOCAL_URL = "https://localhost:6443";

const saveAuth = async () => {
    const browser = await chromium.launch({headless: false});
    const context = await browser.newContext({ignoreHTTPSErrors: true});
    const page = await context.newPage();

    await page.goto(QA_URL);
    console.log("Step 1: Complete QA login in the browser, then press Enter here...");
    await new Promise<void>(resolve => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve();
        });
    });

    console.log("Step 2: Opening Local to inherit login (best-effort, OK if dev server is down)...");
    try {
        await page.goto(LOCAL_URL, {timeout: 8000});
        await page.waitForTimeout(3000);
        console.log("Local inherited login.");
    } catch (err) {
        console.warn(`Local step skipped: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
        console.warn("auth.json will still be saved with QA cookies — fine for running tests against --qa.");
    }

    await context.storageState({path: AUTH_FILE});
    console.log(`Auth state saved to ${AUTH_FILE}`);
    await browser.close();
};

if (require.main === module) {
    saveAuth().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
