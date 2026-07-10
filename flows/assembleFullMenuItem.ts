/**
 * @flow         assembleFullMenuItem
 * @action       composite                       // create | search | delete | update | verify | composite
 * @target       Item · fully-configured Menu item (component + concept + service + nutrition)
 * @summary      Create a menu item + an HDR consumable, add the consumable as a component, then
 *               configure the menu item: set a Concept, mark Service Setting reviewed, mark Nutrition
 *               reviewed. The end-to-end "seed a fully set-up menu item" pipeline.
 * @params       concept?="2PRs Fred's"  usage?="1"
 * @returns      { menu, component, added, conceptSet, serviceReviewed, nutritionReviewed }
 * @requires     —                               // entry point — composes six base flows
 * @sideEffects  persistent · creates 2 items, links them, and flips several review flags on QA
 * @pages        ItemPage
 * @composes     assembleMenuItemWithComponent (createDraftMenuItem + createDraftHdrConsumable + addComponentToItem)
 *               → setItemConcept → setServiceSettingReviewed → setNutritionReviewed
 */
import {Page} from "@playwright/test";
import {assembleMenuItemWithComponent} from "./assembleMenuItemWithComponent";
import {setItemConcept} from "./setItemConcept";
import {setServiceSettingReviewed} from "./setServiceSettingReviewed";
import {setNutritionReviewed} from "./setNutritionReviewed";

export interface AssembleFullInput {
    concept?: string;
    usage?: string;
    verify?: boolean; // default true; false = skip each step's reopen-verify (much faster)
}

export async function assembleFullMenuItem(
    page: Page,
    input: AssembleFullInput = {},
): Promise<{
    menu: {itemId: string; name: string; url: string};
    component: {itemId: string; name: string; url: string};
    added: boolean;
    conceptSet: boolean;
    serviceReviewed: boolean;
    nutritionReviewed: boolean;
}> {
    const concept = input.concept ?? "2PRs Fred's";
    const verify = input.verify;

    // 1-3. create menu + create hdr consumable + add the consumable as a component
    const asm = await assembleMenuItemWithComponent(page, {usage: input.usage});
    const url = asm.menu.url; // the update flows reach the item directly by this url (exact version)
    console.log(`[full] assembled ${asm.menu.name} (+component ${asm.component.name}, added=${asm.added})`);

    // 4. set Concept (Item Information card)
    const conceptRes = await setItemConcept(page, {url, concept, verify});
    console.log(`[full] concept "${concept}" set=${conceptRes.set}`);

    // 5. mark Service Setting reviewed
    const serviceRes = await setServiceSettingReviewed(page, {url, reviewed: true, verify});
    console.log(`[full] service reviewed=${serviceRes.reviewed}`);

    // 6. mark Nutrition reviewed
    const nutritionRes = await setNutritionReviewed(page, {url, reviewed: true, verify});
    console.log(`[full] nutrition reviewed=${nutritionRes.reviewed}`);

    return {
        menu: asm.menu,
        component: asm.component,
        added: asm.added,
        conceptSet: conceptRes.set,
        serviceReviewed: serviceRes.reviewed,
        nutritionReviewed: nutritionRes.reviewed,
    };
}
