/**
 * @flow         buildFullMenuItem
 * @action       composite                       // create | search | delete | update | verify | composite
 * @target       Item · fully-configured DRAFT Menu item built around an EXISTING published component
 * @summary      Create a draft menu item, add an already-published item as its component, then
 *               configure the menu (concept + service + nutrition + packaged SKU). The menu is left
 *               as a DRAFT (not published). Drive it from natural language, e.g. "create a menu item,
 *               add <X> as its component" → run with { component: "<X>" }.
 * @params       component (required — an existing published item's NUMBER or NAME to add as the BOM
 *               component)  concept?="2PRs Fred's"  usage?="1"  verify?=false
 * @returns      { menu, component, added, conceptSet, serviceReviewed, nutritionReviewed, packageSku }
 * @requires     component (a pre-existing, ideally published, item)
 * @sideEffects  persistent · creates + configures a DRAFT menu on QA; does NOT create/publish the
 *               component (it must already exist) and does NOT publish the menu.
 * @pages        ItemPage
 * @composes     createDraftMenuItem → addComponentToItem → setItemConcept → setServiceSettingReviewed
 *               → setNutritionReviewed → setPackageSku
 * @note         The component is matched in the "Add component" dialog which searches by Name OR Item
 *               Number, so `component` may be either. To also create the component, use
 *               createDraftHdrConsumable / assembleFullMenuItem instead; to publish, use publishMenuItem.
 */
import {Page} from "@playwright/test";
import {createDraftMenuItem} from "./createDraftMenuItem";
import {addComponentToItem} from "./addComponentToItem";
import {setItemConcept} from "./setItemConcept";
import {setServiceSettingReviewed} from "./setServiceSettingReviewed";
import {setNutritionReviewed} from "./setNutritionReviewed";
import {setPackageSku} from "./setPackageSku";

export interface BuildFullMenuItemInput {
    component: string;
    concept?: string;
    usage?: string;
    verify?: boolean;
}

export async function buildFullMenuItem(
    page: Page,
    input: BuildFullMenuItemInput,
): Promise<{
    menu: {itemId: string; name: string; url: string};
    component: string;
    added: boolean;
    conceptSet: boolean;
    serviceReviewed: boolean;
    nutritionReviewed: boolean;
    packageSku: {serviceLocation: string; smallwareTool: string; panSize: string};
}> {
    if (!input || !input.component) {
        throw new Error('buildFullMenuItem needs `component` — an existing published item number or name, e.g. --input \'{"component":"4000470"}\'');
    }
    const concept = input.concept ?? "2PRs Fred's";
    const verify = input.verify;

    // 1. create the draft menu item
    const menu = await createDraftMenuItem(page, {});
    console.log(`[build] menu ${menu.name} -> ${menu.url}`);

    // 2. add the EXISTING (published) item as a component
    const {added} = await addComponentToItem(page, {url: menu.url, componentName: input.component, usage: input.usage});
    console.log(`[build] component "${input.component}" added: ${added}`);

    // 3. configure the menu
    const c = await setItemConcept(page, {url: menu.url, concept, verify});
    const s = await setServiceSettingReviewed(page, {url: menu.url, reviewed: true, verify});
    const n = await setNutritionReviewed(page, {url: menu.url, reviewed: true, verify});
    const packageSku = await setPackageSku(page, {url: menu.url});
    console.log(`[build] configured (concept=${c.set}, service=${s.reviewed}, nutrition=${n.reviewed}, packageSku set)`);

    // menu item intentionally left as a DRAFT (publish separately via publishMenuItem)
    return {
        menu,
        component: input.component,
        added,
        conceptSet: c.set,
        serviceReviewed: s.reviewed,
        nutritionReviewed: n.reviewed,
        packageSku,
    };
}
