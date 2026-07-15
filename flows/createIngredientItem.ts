/**
 * @flow         createIngredientItem
 * @action       create                          // create | search | delete | update | verify | composite
 * @target       Item · Ingredient (DRAFT version)
 * @summary      Create an Ingredient item — a new DRAFT version — and return its id.
 * @params       name?="e2e-<ts>"  unit?="g"
 * @returns      { itemId: string; name: string; url: string }   // what this flow PRODUCES (for composition)
 * @requires     —                                       // entry point — consumes nothing
 * @sideEffects  persistent · creates a real DRAFT item on QA; no teardown (unique e2e-* name avoids collisions)
 * @pages        ItemPage
 * @recorded     2026-07-14 vs QA (cookbook.foodtruck-qa.com)
 * @note         Single-button object type (Create New → Ingredient), like HDR Consumable. One extra
 *               required combobox — * Unit Used in BOM (Ant combo, picked via selectCombo which matches
 *               the VISIBLE option by title/text; Ant renders a hidden measurement copy a plain match grabs).
 *               The create dialog submits with "Next" (not "Save") — see ItemPage.confirmCreateNext.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateIngredientItemInput {
    name?: string;
    unit?: string;
}

export async function createIngredientItem(
    page: Page,
    input: CreateIngredientItemInput = {},
): Promise<{itemId: string; name: string; url: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const unit = input.unit ?? "g";

    const item = new ItemPage(page);
    await item.goto();
    await item.createNewOfType("Ingredient");
    await item.fillName(name);
    await item.selectCombo(/Unit Used in BOM/, unit);
    await item.confirmCreateNext();

    const itemId = await item.readIdFromUrl();
    return {itemId, name, url: page.url()};
}
