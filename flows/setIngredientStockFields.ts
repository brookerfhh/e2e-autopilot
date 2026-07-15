/**
 * @flow         setIngredientStockFields
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Ingredient · Item Information card (Stock UOM + Out of Stock Name)
 * @summary      On an Ingredient's detail page, set its Stock UOM and Out of Stock Name, then Save.
 * @params       url?|itemNumber?|name?  stockUom?="g"  outOfStockName?="e2e-oos"
 * @returns      { stockUom: string; outOfStockName: string }   // the values read back after save (verifies persistence)
 * @requires     url OR itemNumber OR name                       // how to reach the item (prefer a url from a create* flow)
 * @sideEffects  persistent · updates two fields on the item's DRAFT version on QA; no teardown
 * @pages        ItemPage
 * @recorded     2026-07-14 vs QA (cookbook.foodtruck-qa.com)
 * @note         Both fields live in the ONE "Item Information" card (id #BasicInfo), edited INLINE — clicking
 *               its edit pencil makes the fields editable IN PLACE (no modal / drawer / role=dialog, unlike
 *               other cards), and Save is a page-level button. So this uses enterBasicInfoEdit()/saveInline()
 *               (NOT openCardEditor/saveDialog). The recording opened the pencil via a fragile global
 *               button.nth(5); the coordinate-based openCardEditor also misfires here (long header title),
 *               so we scope to #BasicInfo. Stock UOM is an Ant combobox with a stable id (#stock_uom) whose
 *               search input is covered by the selected-value span, so it's set via selectComboById (force
 *               open + force pick the visible option; a plain click hits the value span). Out of Stock Name's
 *               accessible name carries a trailing "info-circle", so it's matched by /Out of Stock Name/.
 *               Verification reloads the page and re-enters edit to read the persisted values.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SetIngredientStockFieldsInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    stockUom?: string;
    outOfStockName?: string;
}

export async function setIngredientStockFields(
    page: Page,
    input: SetIngredientStockFieldsInput = {},
): Promise<{stockUom: string; outOfStockName: string}> {
    const stockUom = input.stockUom ?? "g";
    const outOfStockName = input.outOfStockName ?? "e2e-oos";

    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});

    // Both fields live in the one "Item Information" card, edited INLINE (no modal) — edit both, save once.
    await item.enterBasicInfoEdit();
    await item.selectComboById("stock_uom", stockUom); // inline select; its input is covered by the value span
    await item.fillOutOfStockName(outOfStockName);
    await item.saveInline();

    // Verify persistence: reload the detail page, re-enter edit, read the values back.
    await page.goto(input.url ?? page.url());
    await item.waitForIdle();
    await item.enterBasicInfoEdit();
    const readUom = await item.comboSelectedText(/Stock UOM/);
    const readName = await page.getByRole("textbox", {name: /Out of Stock Name/}).inputValue();

    return {stockUom: readUom, outOfStockName: readName};
}
