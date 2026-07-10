/**
 * @flow         searchItem
 * @action       search                          // create | search | delete | update | verify | composite
 * @target       Item                            // generic — any item type, matched by exact name
 * @summary      Search an item by name via Smart Search; report whether it was found and its id.
 * @params       query (required — the exact item name)
 * @returns      { found: boolean; itemId: string; name: string }   // itemId "" when not found
 * @requires     name                            // consumes a name produced by a create* flow
 * @sideEffects  read-only · no data mutated
 * @pages        ItemPage
 * @recorded     2026-07-07 vs QA (cookbook.foodtruck-qa.com)
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SearchItemInput {
    query: string;
}

export async function searchItem(
    page: Page,
    input: SearchItemInput,
): Promise<{found: boolean; itemId: string; name: string}> {
    const {query} = input;
    const item = new ItemPage(page);
    await item.goto();
    await item.search(query);

    const found = await item.resultLink(query).isVisible({timeout: 20000}).catch(() => false);
    if (!found) {
        return {found: false, itemId: "", name: query};
    }

    // Open the result to surface the item's id from its detail URL (feeds delete/update flows).
    await item.openResult(query);
    const itemId = await item.readIdFromUrl();
    return {found: true, itemId, name: query};
}
