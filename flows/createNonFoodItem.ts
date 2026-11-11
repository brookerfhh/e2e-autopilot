/**
 * @flow         createNonFoodItem
 * @action       create                          // create | search | delete | update | verify | composite
 * @target       Item · Non-food (DRAFT version)
 * @summary      Create a Non-food item — a new DRAFT version — and return its id.
 * @params       name?="e2e-<ts>"  subType?="Smallware"
 *               (sub-types: Internal Packaging | Guest Packaging | Smallware | Marketing | Equipment |
 *                PPE | Sanitation | Storage | Appliance | Vessel)
 * @returns      { itemId: string; name: string; url: string }   // what this flow PRODUCES (for composition)
 * @requires     —                                  // entry point — consumes nothing
 * @sideEffects  persistent · creates a real DRAFT item on QA; no teardown (unique e2e-* name)
 * @pages        ItemPage
 * @recorded     NOT RECORDED — written from UI exploration on QA (Create New → Non-food dialog).
 * @note         Two-field dialog: Object Sub-Type (Ant combo, picked by option title) + Item Name; Concept
 *               is optional. Submits with "Next". Packaged items are a different type (Edit Item modal);
 *               THIS type opens the full-page editor (UPDATE_NONFOOD_ITEM). Avoid Guest Packaging /
 *               Appliance / Vessel as a default: changing their sub-type later raises confirm dialogs.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateNonFoodItemInput {
    name?: string;
    subType?: string;
}

export async function createNonFoodItem(
    page: Page,
    input: CreateNonFoodItemInput = {},
): Promise<{itemId: string; name: string; url: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const subType = input.subType ?? "Smallware";

    const item = new ItemPage(page);
    await item.goto();
    await item.createNewOfType("Non-food");
    await item.selectComboOption(/Object Sub-Type/, subType);
    await item.fillName(name);
    await item.confirmCreateNext();

    const itemId = await item.readIdFromUrl();
    return {itemId, name, url: page.url()};
}
