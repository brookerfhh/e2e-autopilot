/**
 * Shared test fixtures for the regression suite.
 *
 * Overrides the `context` fixture so every test gets an authenticated browser
 * context — via SessionId injection (SESSION_ID env) or the saved storageState
 * (scripts/test-auth/auth.json). Target (qa|local) comes from the TARGET env and
 * must match the baseURL configured in playwright.config.ts.
 */
import {test as base, expect} from "@playwright/test";
import {createAuthenticatedContext, AuthTarget} from "../test-auth/inject-session";

const target: AuthTarget = process.env.TARGET === "local" ? "local" : "qa";
const sessionId = process.env.SESSION_ID;

export const test = base.extend({
    context: async ({browser}, use) => {
        const context = await createAuthenticatedContext(browser, {target, sessionId});
        await use(context);
        await context.close();
    },
});

export {expect};
