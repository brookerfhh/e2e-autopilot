/**
 * @flow         createIngredientItem
 * @action       create                       // create | search | delete | update | verify | composite
 * @target       Item · Ingredient            // entity + variant this flow operates on
 * @summary      Create an Ingredient item and return its id.
 * @params       name?="e2e-<ts>"  subType?="Produce"  unit?="g"
 * @returns      { itemId: string; name: string }        // what this flow PRODUCES (for composition)
 * @requires     —                                       // ids/names it CONSUMES from other flows
 * @sideEffects  persistent · creates a real item; no teardown (unique e2e-* name)
 * @pages        ItemPage
 * @recorded     <date> vs <APP_URL>
 *
 * This is the shape every flow follows: a `@flow` header (the source of truth for FLOWS.md),
 * a typed input, and a return that later flows can consume. Selectors live in flows/pages/.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateIngredientItemInput {
    name?: string;
    subType?: string;
    unit?: string;
}

export async function createIngredientItem(
    page: Page,
    input: CreateIngredientItemInput = {},
): Promise<{itemId: string; name: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const items = new ItemPage(page);
    await items.open();
    const itemId = await items.createIngredient({
        name,
        subType: input.subType ?? "Produce",
        unit: input.unit ?? "g",
    });
    return {itemId, name};
}
