/**
 * @flow         assembleMenuItemWithComponent
 * @action       composite                       // create | search | delete | update | verify | composite
 * @target       Item · Menu item assembled with an HDR Consumable component
 * @summary      Create a menu item, create an HDR consumable, then add the consumable as a component
 *               of the menu item — the full create→create→assemble pipeline. Returns both items
 *               (id/name/detail URL) and whether the component landed.
 * @params       usage?="1"                       // forwarded to addComponentToItem
 * @returns      { menu: {itemId,name,url}, component: {itemId,name,url}, added: boolean }
 * @requires     —                                // entry point — composes three base flows
 * @sideEffects  persistent · creates a menu item + an HDR consumable and links them; no teardown
 *               (the HDR consumable cannot be deleted; the menu item can via deleteItem)
 * @pages        ItemPage
 * @composes     createDraftMenuItem + createDraftHdrConsumable → addComponentToItem
 */
import {Page} from "@playwright/test";
import {createDraftMenuItem} from "./createDraftMenuItem";
import {createDraftHdrConsumable} from "./createDraftHdrConsumable";
import {addComponentToItem} from "./addComponentToItem";

export interface AssembleInput {
    usage?: string;
}

export async function assembleMenuItemWithComponent(
    page: Page,
    input: AssembleInput = {},
): Promise<{
    menu: {itemId: string; name: string; url: string};
    component: {itemId: string; name: string; url: string};
    added: boolean;
}> {
    const usage = input.usage ?? "1";

    // 1. create the target menu item
    const menu = await createDraftMenuItem(page, {});
    console.log(`[assemble] menu item: ${menu.name} -> ${menu.url}`);

    // 2. create the HDR consumable to use as a component
    const component = await createDraftHdrConsumable(page, {});
    console.log(`[assemble] hdr consumable: ${component.name} -> ${component.url}`);

    // 3. add the consumable as a component — reach the menu item by URL (no Smart Search, so no
    //    indexing-lag wait needed; a just-created item is usable immediately).
    const {added} = await addComponentToItem(page, {
        url: menu.url,
        componentName: component.name,
        usage,
    });
    console.log(`[assemble] component added: ${added}`);

    return {menu, component, added};
}
