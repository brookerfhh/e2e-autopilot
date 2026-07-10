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
import {ItemPage} from "./pages/ItemPage";

export interface PublishMenuItemInput {
    url?: string;
    itemNumber?: string;
    name?: string;
}

export async function publishMenuItem(
    page: Page,
    input: PublishMenuItemInput,
): Promise<{published: boolean}> {
    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);
    await item.publishVersion();
    return {published: true};
}
