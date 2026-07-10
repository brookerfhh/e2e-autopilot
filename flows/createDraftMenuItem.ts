/**
 * @flow         createDraftMenuItem
 * @action       create                          // create | search | delete | update | verify | composite
 * @target       Item · Menu / Food (DRAFT version)
 * @summary      Create a Menu (Food) item — a new DRAFT version — and return its id.
 * @params       name?="e2e-<ts>"  category?="Menu"  type?="Food"
 * @returns      { itemId: string; name: string; url: string }   // what this flow PRODUCES (for composition)
 * @requires     —                                  // entry point — consumes nothing
 * @sideEffects  persistent · creates a real DRAFT item on QA; no teardown (unique e2e-* name)
 * @pages        ItemPage
 * @recorded     2026-07-07 vs QA (cookbook.foodtruck-qa.com)
 * @note         The created item is an unpublished DRAFT version (publish it later e.g. via a publish flow).
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateDraftMenuItemInput {
    name?: string;
    category?: string;
    type?: string;
}

export async function createDraftMenuItem(
    page: Page,
    input: CreateDraftMenuItemInput = {},
): Promise<{itemId: string; name: string; url: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const category = input.category ?? "Menu";
    const type = input.type ?? "Food";

    const item = new ItemPage(page);
    await item.goto();
    await item.startCreate(category, type);
    await item.fillName(name);
    await item.save();

    const itemId = await item.readIdFromUrl();
    return {itemId, name, url: page.url()};
}
