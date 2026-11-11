/**
 * @flow         setIngredientStockFields
 * @action       update                          // API only — no browser
 * @target       Item · Ingredient · Item Information (Stock UOM + Out of Stock Name)
 * @summary      Set an Ingredient's Stock UOM and Out of Stock Name through the API (the UI version needed an inline
 *               edit with fragile selectors), then read the saved values back.
 * @params       url? | versionId?  (one required)  stockUom?="g"  outOfStockName?="e2e-oos"
 * @returns      { stockUom: string | null; outOfStockName: string | null }   // read back after save
 * @requires     url OR versionId of an Ingredient
 * @sideEffects  persistent · updates two fields on the item's version on QA; only items named e2e-auto-*
 * @pages        —
 */
import {Page} from "@playwright/test";
import {get} from "../api/client";
import {updateIngredientInfo} from "../api/updateItem";

export interface SetIngredientStockFieldsInput {
    url?: string;
    versionId?: string;
    stockUom?: string;
    outOfStockName?: string;
}

export async function setIngredientStockFields(
    _page: Page,
    input: SetIngredientStockFieldsInput = {},
): Promise<{stockUom: string | null; outOfStockName: string | null}> {
    const versionId = input.versionId ?? (input.url ? new URL(input.url).searchParams.get("version_id") : null);
    if (!versionId) {
        throw new Error("setIngredientStockFields needs a url with ?version_id=… or a versionId");
    }
    await updateIngredientInfo(versionId, {stockUom: input.stockUom ?? "g", outOfStockName: input.outOfStockName ?? "e2e-oos"});

    const saved = await get<{stock_uom: string | null; out_of_stock_name: string | null}>(`/ajax/v2/item/version/${versionId}/ingredient`);
    return {stockUom: saved.stock_uom, outOfStockName: saved.out_of_stock_name};
}
