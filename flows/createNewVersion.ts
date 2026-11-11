/**
 * @flow         createNewVersion
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Versions (detail-page "Create New Version" button + modal)
 * @summary      On a PUBLISHED item, click "Create New Version", fill Reason for Change (and optionally
 *               Jira Link), copy from the chosen existing version (default: first listed) and save.
 *               Returns the id of the new draft version.
 * @params       url? | itemNumber? | name?  (one required)
 *               reason?="e2e new version <ts>"  jiraLink?  copyFromVersion?  (text of the option, e.g. "Version 1")
 * @returns      { versionId: string; url: string; reason: string }   // the new DRAFT version
 * @requires     url OR itemNumber OR name — an item with a non-draft version (the button does not exist
 *               on a draft; e.g. publishHdrConsumable / publishMenuItem output)
 * @sideEffects  persistent · adds a DRAFT version to the item on QA; no teardown
 * @pages        ItemPage
 * @verified     2026-11-05 on QA with a Recipe item (e2e-1784268643658). HDR Consumable has NO Create New
 *               Version button; a DRAFT version has none either. Some old e2e menu items fail earlier
 *               (dialog never opens) — pick a Recipe/Menu item whose latest version is published.
 * @recorded     NOT RECORDED — generated from the prod usage ranking (CREATE_NEW_VERSION, Tier A, the most
 *               stable write action) + frontend source (Versions/components/CreateVersion.tsx).
 * @source       Code: logs CREATE_NEW_VERSION OPEN → SAVE → SAVE_SUCCESS; toast "New version has been
 *               created successfully."; Copy from version is required (antd Select, options
 *               "Version N (start ~ end)").
 */
import {Page, expect} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateNewVersionInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    reason?: string;
    jiraLink?: string;
    copyFromVersion?: string;
}

export async function createNewVersion(
    page: Page,
    input: CreateNewVersionInput,
): Promise<{versionId: string; url: string; reason: string}> {
    const reason = input.reason ?? `e2e new version ${Date.now()}`;

    const item = new ItemPage(page);
    if (!input.url) await item.goto();
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);
    const before = page.url();

    await item.dismissAnyModal();
    await page.getByRole("button", {name: "Create New Version"}).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({state: "visible", timeout: 15000});

    await dialog.getByLabel(/Reason for Change/).fill(reason);
    if (input.jiraLink) await dialog.getByLabel("Jira Link").fill(input.jiraLink);

    // "Copy from version" is required; it may be pre-filled with the current version.
    const copy = dialog.getByRole("combobox", {name: /Copy from version/});
    await copy.click({force: true});
    const options = page
        .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
        .locator(".ant-select-item-option");
    await options.first().waitFor({state: "visible", timeout: 10000});
    const wanted = input.copyFromVersion
        ? options.filter({hasText: input.copyFromVersion}).first()
        : options.first();
    await wanted.click();

    await dialog.getByRole("button", {name: "Save"}).click();
    await expect(page.getByText("New version has been created successfully.")).toBeVisible({timeout: 30000});
    await dialog.waitFor({state: "hidden", timeout: 20000}).catch(() => {});
    await item.waitForNoModal();

    // The app navigates to the new version (successCallback) — read its id from the URL.
    await page.waitForURL(u => u.toString() !== before, {timeout: 20000}).catch(() => {});
    const url = page.url();
    const versionId = new URL(url).searchParams.get("version_id") ?? "";
    return {versionId, url, reason};
}
