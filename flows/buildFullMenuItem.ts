/**
 * @flow         buildFullMenuItem
 * @action       composite                       // create | search | delete | update | verify | composite
 * @target       Item · fully-configured Menu item (DRAFT) with a published HDR component
 * @summary      The full example: create a draft menu + draft HDR consumable, add the consumable as a
 *               component, configure the menu (concept + service + nutrition + packaged SKU), and
 *               publish the HDR consumable. The menu item itself is left as a DRAFT (not published).
 * @params       concept?="2PRs Fred's"  usage?="1"  verify?=false
 * @returns      { menu, component, added, conceptSet, serviceReviewed, nutritionReviewed,
 *                 packageSku, componentPublished }
 * @requires     —                               // entry point — composes most of the flow library
 * @sideEffects  persistent · creates 2 items, links & configures them, PUBLISHES the HDR component
 *               (the menu stays a draft — publish it separately via publishMenuItem if needed)
 * @pages        ItemPage
 * @composes     assembleFullMenuItem → setPackageSku → publishHdrConsumable
 * @note         Each run creates fresh drafts so it's repeatable. Publishing the menu is intentionally
 *               NOT part of this flow (use publishMenuItem for that).
 */
import {Page} from "@playwright/test";
import {assembleFullMenuItem, AssembleFullInput} from "./assembleFullMenuItem";
import {setPackageSku} from "./setPackageSku";
import {publishHdrConsumable} from "./publishHdrConsumable";

export type BuildFullMenuItemInput = AssembleFullInput;

export async function buildFullMenuItem(
    page: Page,
    input: BuildFullMenuItemInput = {},
): Promise<{
    menu: {itemId: string; name: string; url: string};
    component: {itemId: string; name: string; url: string};
    added: boolean;
    conceptSet: boolean;
    serviceReviewed: boolean;
    nutritionReviewed: boolean;
    packageSku: {serviceLocation: string; smallwareTool: string; panSize: string};
    componentPublished: boolean;
}> {
    // 1-6. create + assemble + configure (concept / service / nutrition)
    const full = await assembleFullMenuItem(page, input);

    // 7. packaged-SKU required selects on the menu item
    const packageSku = await setPackageSku(page, {url: full.menu.url});
    console.log("[build] package SKU set");

    // 8. publish the HDR consumable component (fills its required Out of Stock Name first)
    const comp = await publishHdrConsumable(page, {url: full.component.url});
    console.log(`[build] component published: ${comp.published}`);

    // NOTE: the menu item is intentionally left as a DRAFT (not published).
    return {
        menu: full.menu,
        component: full.component,
        added: full.added,
        conceptSet: full.conceptSet,
        serviceReviewed: full.serviceReviewed,
        nutritionReviewed: full.nutritionReviewed,
        packageSku,
        componentPublished: comp.published,
    };
}
