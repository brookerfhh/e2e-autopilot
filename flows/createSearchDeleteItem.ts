/**
 * @flow         createSearchDeleteItem
 * @action       composite                       // create | search | delete | update | verify | composite
 * @target       Item · Menu / Food (full lifecycle)
 * @summary      Create a menu item, find it by name, then delete it — the full create→search→delete loop.
 * @params       name?="e2e-<ts>"  category?="Menu"  type?="Food"   (forwarded to createDraftMenuItem)
 * @returns      { itemId, name, found, deleted }
 * @requires     —                               // entry point — composes the three base flows
 * @sideEffects  self-cleaning · creates then deletes the same item; nothing should persist on success
 * @pages        ItemPage
 * @composes     createDraftMenuItem → searchItem → deleteItem
 */
import {Page} from "@playwright/test";
import {createDraftMenuItem, CreateDraftMenuItemInput} from "./createDraftMenuItem";
import {searchItem} from "./searchItem";
import {ItemPage} from "./pages/ItemPage";

export async function createSearchDeleteItem(
    page: Page,
    input: CreateDraftMenuItemInput = {},
): Promise<{itemId: string; name: string; found: boolean; deleted: boolean}> {
    // 1. create — produces itemId + name
    const created = await createDraftMenuItem(page, input);
    console.log(`[composite] created ${created.name} (${created.itemId})`);

    // 2. search — consumes name. Smart Search is index-backed with lag, so poll a few times
    //    before giving up (a freshly created item can take a few seconds to become searchable).
    let search = {found: false, itemId: "", name: created.name};
    for (let attempt = 1; attempt <= 6; attempt++) {
        search = await searchItem(page, {query: created.name});
        if (search.found) {
            console.log(`[composite] found on attempt ${attempt} (${search.itemId})`);
            break;
        }
        console.log(`[composite] not indexed yet (attempt ${attempt}) — waiting…`);
        await page.waitForTimeout(3000);
    }

    // 3. delete — searchItem already opened the item's detail page, so delete from there directly
    //    instead of calling deleteItem (which would navigate back to the list and re-search).
    let deleted = false;
    if (search.found) {
        await new ItemPage(page).deleteFromDetail();
        deleted = true;
    }
    console.log(`[composite] delete → deleted=${deleted}`);

    return {itemId: created.itemId, name: created.name, found: search.found, deleted};
}
