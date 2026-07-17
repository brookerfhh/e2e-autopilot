/**
 * @flow         createPackageItem
 * @action       create                          // create | search | delete | update | verify | composite
 * @target       Item · Packaged (DRAFT version)
 * @summary      Create a Packaged item — a new DRAFT version — and return its id.
 * @params       name?="e2e-<ts>"  subType?="Common Stock"
 * @returns      { itemId: string; name: string; url: string }   // what this flow PRODUCES (for composition)
 * @requires     —                                  // entry point — consumes nothing
 * @sideEffects  persistent · creates a real DRAFT item on QA; no teardown (unique e2e-* name)
 * @pages        ItemPage
 * @recorded     2026-07-17 vs QA (cookbook.foodtruck-qa.com)
 * @note         Single-button object type: Create New → Packaged (one step, like Ingredient/HDR).
 *               Extra required combobox * Object Sub-Type (recorded value = "Common Stock"), picked
 *               via ItemPage.selectComboOption (the app renders a duplicate web-ui-kit text node with
 *               the same label that intercepts a plain selectCombo click, so we match the real Ant
 *               option by its title attr). Submits with "Save" (not "Next", unlike Ingredient).
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreatePackageItemInput {
    name?: string;
    subType?: string;
}

export async function createPackageItem(
    page: Page,
    input: CreatePackageItemInput = {},
): Promise<{itemId: string; name: string; url: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const subType = input.subType ?? "Common Stock";

    const item = new ItemPage(page);
    await item.goto();
    await item.createNewOfType("Packaged");
    await item.fillName(name);
    await item.selectComboOption(/Object Sub-Type/, subType);
    await item.save();

    const itemId = await item.readIdFromUrl();
    return {itemId, name, url: page.url()};
}
