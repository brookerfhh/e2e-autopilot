/**
 * @flow         createDraftHdrConsumable
 * @action       create                          // create | search | delete | update | verify | composite
 * @target       Item · HDR Consumable (DRAFT version)
 * @summary      Create an HDR Consumable item — a new DRAFT version — and return its id.
 * @params       name?="e2e-<ts>"  state?="Thawed"  unit?="g"
 * @returns      { itemId: string; name: string; url: string }   // what this flow PRODUCES (for composition)
 * @requires     —                                       // entry point — consumes nothing
 * @sideEffects  persistent · creates a real DRAFT item on QA; NO teardown — HDR Consumable items have
 *               no "Delete This Item" action (only "Dormant Item"), so deleteItem does NOT apply here.
 * @pages        ItemPage
 * @recorded     2026-07-08 vs QA (cookbook.foodtruck-qa.com)
 * @note         Created as an unpublished DRAFT (publish later via publishHdrConsumable). HDR Consumable
 *               has more required fields than Menu/Food: * State and * Unit Used in BOM (Ant comboboxes).
 *               The create form is a tall modal — Save sits below the fold, but Playwright auto-scrolls to it.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface CreateDraftHdrConsumableInput {
    name?: string;
    state?: string;
    unit?: string;
}

export async function createDraftHdrConsumable(
    page: Page,
    input: CreateDraftHdrConsumableInput = {},
): Promise<{itemId: string; name: string; url: string}> {
    const name = input.name ?? `e2e-${Date.now()}`;
    const state = input.state ?? "Thawed";
    const unit = input.unit ?? "g";

    const item = new ItemPage(page);
    await item.goto();
    await item.createNewOfType("HDR Consumable");
    await item.fillName(name);
    await item.selectCombo(/State/, state);
    await item.selectCombo(/Unit Used in BOM/, unit);
    await item.save();

    const itemId = await item.readIdFromUrl();
    return {itemId, name, url: page.url()};
}
