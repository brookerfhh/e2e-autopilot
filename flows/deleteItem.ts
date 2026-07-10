/**
 * @flow         deleteItem
 * @action       delete                          // create | search | delete | update | verify | composite
 * @target       Item                            // types with a "Delete This Item" action (e.g. Menu/Food)
 *                                               // NOT HDR Consumable — that type has no delete, only Dormant
 * @summary      Find an item by name, open it, and delete it from the detail page.
 * @params       name (required — the exact item name)
 * @returns      { deleted: boolean; name: string }   // deleted=false when the item was not found
 * @requires     name                            // consumes a name produced by a create or search flow
 * @sideEffects  destructive · permanently deletes a real item on QA (no undo)
 * @pages        ItemPage
 * @recorded     2026-07-07 vs QA (cookbook.foodtruck-qa.com)
 * @note         Reaches the detail page via search-by-name — the detail URL needs the item's
 *               numeric code, which is not the returned version_id, so deep-linking by id isn't viable.
 *               Smart Search is index-backed with lag: a re-search immediately after delete may still
 *               show the item briefly even though the delete committed. `deleted` reflects that the
 *               delete action completed, not a re-query.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface DeleteItemInput {
    name: string;
}

export async function deleteItem(
    page: Page,
    input: DeleteItemInput,
): Promise<{deleted: boolean; name: string}> {
    const {name} = input;
    const item = new ItemPage(page);
    await item.goto();
    await item.search(name);

    const found = await item.resultLink(name).isVisible({timeout: 20000}).catch(() => false);
    if (!found) {
        return {deleted: false, name};
    }

    await item.openResult(name);
    await item.deleteFromDetail();

    return {deleted: true, name};
}
