/**
 * @flow         setItemConcept
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Item Information card ("Concept" multi-select)
 * @summary      Open an item's Item Information (Edit Item) modal and ensure a Concept is selected.
 * @params       url? | itemNumber? | name?  (one required — how to reach the item)  concept (required)
 * @returns      { set: boolean; concept: string }   // the concept tag present after save
 * @requires     (url OR itemNumber OR name) + concept
 * @sideEffects  persistent · sets the item's Concept on QA
 * @pages        ItemPage
 * @recorded     2026-07-09 vs QA (cookbook.foodtruck-qa.com)
 * @note         Reach the item by url (preferred) / number / name via ItemPage.openItem. The Item
 *               Information card's edit pencil is icon-only → opened via ItemPage.openCardEditor
 *               (anchors to the card heading). Concept is an Ant multi-select; setConcept is
 *               idempotent and matches the option by visible text (its title attr is an opaque key).
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SetItemConceptInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    concept: string;
    verify?: boolean; // default FALSE (fast, assumes success); pass true to reopen-and-confirm
}

export async function setItemConcept(
    page: Page,
    input: SetItemConceptInput,
): Promise<{set: boolean; concept: string}> {
    const {concept} = input;

    const item = new ItemPage(page);
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);

    await item.openCardEditor(/Item Information/);
    const changed = await item.setConcept(concept);
    // Save only when something changed — the Edit Item modal won't close on a no-op Save.
    if (changed) {
        await item.saveDialog();
    } else {
        await item.cancelDialog();
    }

    if (input.verify !== true) return {set: true, concept}; // default: skip verify (pass verify:true to confirm)

    // Verify by REOPENING and reading the persisted tag (conceptHas polls for the late-hydrating
    // tag). An in-editor read right after selecting false-negatives under pipeline timing.
    await item.openCardEditor(/Item Information/);
    const set = await item.conceptHas(concept);
    await item.cancelDialog();

    return {set, concept};
}
