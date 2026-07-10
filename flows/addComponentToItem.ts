/**
 * @flow         addComponentToItem
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · BOM (add a component)
 * @summary      Add an existing item (e.g. an HDR Consumable) as a component in another item's
 *               Components (Bill of Materials), then save. Returns whether the row is present.
 * @params       url? | itemNumber? | itemName?  (one required — how to reach the target item)
 *               componentName (required)  usage?="1"
 * @returns      { added: boolean; componentName: string }
 * @requires     (url OR itemNumber OR itemName) + componentName   // prefer a create* flow's url
 * @sideEffects  persistent · mutates the target item's BOM on QA (adds a component); no teardown
 * @pages        ItemPage
 * @recorded     2026-07-08 vs QA (cookbook.foodtruck-qa.com)
 * @note         Reaches the item via ItemPage.openItem — prefer `url` (direct, no Smart Search lag)
 *               so a freshly-created item can be used immediately without waiting to be indexed. The
 *               BOM editor is opened by an icon-only pencil anchored to the "Service Setting" button.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface AddComponentToItemInput {
    url?: string;
    itemNumber?: string;
    itemName?: string;
    componentName: string;
    usage?: string;
}

export async function addComponentToItem(
    page: Page,
    input: AddComponentToItemInput,
): Promise<{added: boolean; componentName: string}> {
    const {componentName} = input;
    const usage = input.usage ?? "1";

    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.itemName});
    await page.waitForTimeout(1000);

    await item.openBomEditor();
    await item.addComponent(componentName, usage);
    await item.save();
    await item.waitForIdle();

    // isVisible() does NOT wait — it returns the instantaneous state. The BOM row can render a beat
    // after save, so poll with waitFor instead (else we get a false-negative added:false).
    let added = false;
    try {
        await item.componentRow(componentName).first().waitFor({state: "visible", timeout: 20000});
        added = true;
    } catch {
        added = false;
    }
    return {added, componentName};
}
