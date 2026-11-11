/**
 * @flow         publishMenuItem
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Menu (publish the version)
 * @summary      Publish a (fully-configured) menu item's version.
 * @params       url? | itemNumber? | name?  (one required)
 * @returns      { published: boolean }
 * @requires     url OR itemNumber OR name — a DRAFT version that is complete enough to publish
 * @sideEffects  persistent + hard to undo · publishes the item version on QA
 * @pages        ItemPage
 * @recorded     2026-07-10 vs QA (cookbook.foodtruck-qa.com)
 * @note         Same publish control as HDR: "Publish Version" then confirm "Publish" (reused via
 *               ItemPage.publishVersion). No fields to fill — a fully-configured menu publishes
 *               directly; an under-configured one will be blocked by the app (validation), and the
 *               "Publish Version" button disappears once already published (run on a fresh draft).
 */
import {Page} from "@playwright/test";
import {get} from "../api/client";
import {ItemPage} from "./pages/ItemPage";

export interface PublishMenuItemInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    /** default true: continue past warning-only "Incomplete info" (e.g. Line Build missing). false → cancel instead. */
    publishAnyway?: boolean;
}

export async function publishMenuItem(
    page: Page,
    input: PublishMenuItemInput,
): Promise<{published: boolean; status?: string; blockers?: string; warnings?: string}> {
    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);
    const versionId = new URL(page.url()).searchParams.get("version_id");
    let warnings: string | undefined;
    await item.publishVersion();

    // Clicking Publish is not success: the app can answer with an "Unable to Publish" dialog listing what is
    // missing. Report the real outcome — read the version status back through the API.
    //   "Unable to Publish"  → required fields missing: a real blocker, nothing is published.
    //   "Incomplete info"    → warnings only (e.g. Line Build is not required): "Publish anyway" continues.
    const blocked = page.getByRole("dialog").filter({hasText: "Unable to Publish"});
    const warned = page.getByRole("dialog").filter({hasText: "Incomplete info"});
    const first = await Promise.race([
        blocked.waitFor({state: "visible", timeout: 8000}).then(() => "blocked" as const),
        warned.waitFor({state: "visible", timeout: 8000}).then(() => "warned" as const),
    ]).catch(() => null);

    if (first === "blocked") {
        const text = (await blocked.innerText()).replace(/\s+/g, " ").trim();
        await blocked.getByRole("button", {name: "Confirm"}).click();
        return {published: false, blockers: text};
    }
    if (first === "warned") {
        const text = (await warned.innerText()).replace(/\s+/g, " ").trim();
        if (input.publishAnyway === false) {
            await warned.getByRole("button", {name: "Cancel"}).click();
            return {published: false, blockers: `warnings, not published: ${text}`};
        }
        await warned.getByRole("button", {name: "Publish anyway"}).click();
        warnings = text;
    }
    if (!versionId) {
        return {published: false, blockers: "no version_id in the page url, cannot verify"};
    }
    for (let i = 0; i < 10; i++) {
        const v = await get<{version_status: string}>(`/ajax/v2/item/version/${versionId}`);
        if (v.version_status !== "DRAFT") {
            return {published: true, status: v.version_status, ...(warnings ? {warnings} : {})};
        }
        await page.waitForTimeout(1500);
    }
    return {published: false, blockers: "still DRAFT after publishing"};
}
