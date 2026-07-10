/**
 * @flow         setPackageSku
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Packaged SKUs (required column selects)
 * @summary      Open an item's "Edit Packaged SKUs" modal and set the per-SKU required selects —
 *               Service Location, Smallware Tool, Pan Size — then save.
 * @params       url? | itemNumber? | name?  (one required)
 *               serviceLocation?="N/A"  smallwareTool?="N/A"  panSize?="N/A"
 * @returns      { serviceLocation, smallwareTool, panSize }
 * @requires     url OR itemNumber OR name
 * @sideEffects  persistent · sets the item's packaged-SKU required fields on QA
 * @pages        ItemPage
 * @recorded     2026-07-10 vs QA (cookbook.foodtruck-qa.com)
 * @note         Packaged SKUs section has a stable id `#PACKAGE_SKU` (its edit pencil is scoped there).
 *               The three column selects are matched by input id SUFFIX (prefix is dynamic per SKU),
 *               and clicked via their `.ant-select` container (the search input is covered by the
 *               selection display). Default "N/A" is a valid non-empty selection for all three.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SetPackageSkuInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    serviceLocation?: string;
    smallwareTool?: string;
    panSize?: string;
}

export async function setPackageSku(
    page: Page,
    input: SetPackageSkuInput,
): Promise<{serviceLocation: string; smallwareTool: string; panSize: string}> {
    const serviceLocation = input.serviceLocation ?? "N/A";
    const smallwareTool = input.smallwareTool ?? "N/A";
    const panSize = input.panSize ?? "N/A";

    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);

    await item.openPackageSkuEditor();
    await item.selectPackageSkuField("service_locations", serviceLocation);
    await item.selectPackageSkuField("smallware_tool", smallwareTool);
    await item.selectPackageSkuField("pan_size", panSize);
    await item.saveDialog();

    return {serviceLocation, smallwareTool, panSize};
}
