/**
 * @flow         createRecipeItem
 * @action       create                          // create | search | delete | update | verify | composite
 * @target       Item · Recipe (DRAFT version)
 * @summary      Create a Recipe item — a new DRAFT version — and return its id.
 * @params       name?="e2e-<ts>"  variant?="Primary"
 * @returns      { itemId: string; name: string; url: string }   // what this flow PRODUCES (for composition)
 * @requires     —                                  // entry point — consumes nothing
 * @sideEffects  persistent · creates a real DRAFT item on QA; no teardown (unique e2e-* name)
 * @pages        ItemPage
 * @recorded     2026-07-17 vs QA (cookbook.foodtruck-qa.com)
 * @note         Two-step object type: Create New → Recipe → <variant> (recorded variant = "Primary"),
 *               then fill * Item Name and Save (no extra required combobox, unlike Ingredient/HDR).
 *               Reuses ItemPage.createNewOfType, like createDraftMenuItem's two-step create.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateRecipeItemInput {
    name?: string;
    variant?: string;
}

export async function createRecipeItem(
    page: Page,
    input: CreateRecipeItemInput = {},
): Promise<{itemId: string; name: string; url: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const variant = input.variant ?? "Primary";

    const item = new ItemPage(page);
    await item.goto();
    await item.createNewOfType("Recipe", variant);
    await item.fillName(name);
    await item.save();

    const itemId = await item.readIdFromUrl();
    return {itemId, name, url: page.url()};
}
