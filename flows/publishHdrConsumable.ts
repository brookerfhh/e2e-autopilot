/**
 * @flow         publishHdrConsumable
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · HDR Consumable (fill required "Out of Stock Name", then Publish)
 * @summary      On an HDR Consumable, fill the required "Out of Stock Name" field, save, then publish
 *               the version.
 * @params       url? | itemNumber? | name?  (one required)  outOfStockName?="e2e-oos"
 * @returns      { published: boolean; outOfStockName: string }
 * @requires     url OR itemNumber OR name
 * @sideEffects  persistent · sets a field and PUBLISHES the item version on QA (hard to undo)
 * @pages        ItemPage
 * @recorded     2026-07-10 vs QA (cookbook.foodtruck-qa.com)
 * @note         "Out of Stock Name" is a required ("missing field") text input in the Item Information
 *               (Edit Item) modal — publishing is blocked until it's filled. Reached via the shared
 *               openCardEditor(/Item Information/); publish = "Publish Version" then confirm "Publish".
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface PublishHdrConsumableInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    outOfStockName?: string;
}

export async function publishHdrConsumable(
    page: Page,
    input: PublishHdrConsumableInput,
): Promise<{published: boolean; outOfStockName: string}> {
    const outOfStockName = input.outOfStockName ?? "e2e-oos";

    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);

    // fill the required Out of Stock Name (else publish is blocked), then save the modal
    await item.openCardEditor(/Item Information/);
    await item.fillOutOfStockName(outOfStockName);
    await item.saveDialog();

    // publish the version
    await item.publishVersion();

    return {published: true, outOfStockName};
}
