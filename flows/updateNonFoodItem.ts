/**
 * @flow         updateNonFoodItem
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Non-food / Packaged · Item Information (full-page editor)
 * @summary      Open a non-food (e.g. Packaged) item's detail page, open the Item Information full-page
 *               editor, change Jira Link / Reason for Change and save.
 * @params       url? | itemNumber? | name?  (one required)
 *               jiraLink?="https://e2e.invalid/browse/E2E-<ts>"  reason?="e2e update <ts>"
 * @returns      { jiraLink, reason }   // the values submitted
 * @requires     url OR itemNumber OR name — a non-food item (createPackageItem produces one)
 * @sideEffects  persistent · overwrites Jira Link / Reason for Change of the item on QA only
 * @pages        ItemPage
 * @recorded     NOT RECORDED — generated from the prod usage ranking (UPDATE_NONFOOD_ITEM, Tier A)
 *               + frontend source (page/item/detail/pages/editNonFood). Run against QA only.
 * @source       Code: route package/edit/:item_number/:version_id (EditPackagePage); logs
 *               UPDATE_NONFOOD_ITEM SAVE → SAVE_SUCCESS (entry_name EditPackagePage); on success
 *               toast "<name> successfully saved." then returns to the detail page.
 * @note         Only low-risk text fields are changed. Object type / sub type / units are not touched.
 */
import {Page, expect} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface UpdateNonFoodItemInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    jiraLink?: string;
    reason?: string;
}

export async function updateNonFoodItem(
    page: Page,
    input: UpdateNonFoodItemInput,
): Promise<{jiraLink: string; reason: string}> {
    const stamp = Date.now();
    const jiraLink = input.jiraLink ?? `https://e2e.invalid/browse/E2E-${stamp}`;
    const reason = input.reason ?? `e2e update ${stamp}`;

    const item = new ItemPage(page);
    if (!input.url) await item.goto();
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);

    // The Item Information card's pencil opens a full-page editor (not a modal).
    await item.clickCardEditPencil(/Item Information/);
    await page.waitForURL(/\/ItemV2\/package\/edit\//, {timeout: 20000});
    await item.waitForIdle();

    await page.getByLabel("Jira Link").fill(jiraLink);
    await page.getByLabel("Reason for Change").fill(reason);

    await item.save();

    await expect(page.getByText(/successfully saved\./)).toBeVisible({timeout: 20000});
    await page.waitForURL(/\/ItemV2\/detail\//, {timeout: 20000});

    return {jiraLink, reason};
}
