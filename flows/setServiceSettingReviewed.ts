/**
 * @flow         setServiceSettingReviewed
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Service Setting card ("Service Setting Reviewed" switch)
 * @summary      Open an item's Service Setting modal and set the "Reviewed" switch to a desired state.
 * @params       url? | itemNumber? | name?  (one required — how to reach the item)  reviewed?=true
 * @returns      { reviewed: boolean }            // the switch state read back after save
 * @requires     url OR itemNumber OR name        // consumes a create* flow's url (preferred)
 * @sideEffects  persistent · flips the item's Service Setting Reviewed flag on QA
 * @pages        ItemPage
 * @recorded     2026-07-09 vs QA (cookbook.foodtruck-qa.com)
 * @note         Reach the item by url (direct goto — exact version, no search lag) when available,
 *               else by itemNumber/name via Smart Search. The switch is the Ant `#basic_reviewed`
 *               toggle inside the "Service Setting" modal; setting is idempotent (click only if it
 *               differs). The recording's extra "unordered-list" nav click was incidental and dropped.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SetServiceSettingReviewedInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    reviewed?: boolean;
    verify?: boolean; // default FALSE (fast, returns the desired state); pass true to reopen-and-confirm
}

export async function setServiceSettingReviewed(
    page: Page,
    input: SetServiceSettingReviewedInput,
): Promise<{reviewed: boolean}> {
    const desired = input.reviewed ?? true;

    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);

    await item.openServiceSetting();
    await item.setSwitch("basic_reviewed", desired);
    await item.saveDialog();

    if (input.verify !== true) return {reviewed: desired}; // default: skip verify (pass verify:true to confirm)

    // verify: reopen the modal and read the persisted switch state. The switch renders its default
    // (off) then hydrates the saved value a beat later, so read the SETTLED state (else false-negative).
    await item.openServiceSetting();
    const reviewed = await item.switchIsOnSettled("basic_reviewed");
    await item.cancelDialog();

    return {reviewed};
}
