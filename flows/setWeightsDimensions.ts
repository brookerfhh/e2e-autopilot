/**
 * @flow         setWeightsDimensions
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Weights & Dimensions card (full-page editor)
 * @summary      Open an item's detail page, go to the Weights & Dimensions card's editor page,
 *               fill Length / Width / Height / Weight (max) and save.
 * @params       url? | itemNumber? | name?  (one required)
 *               length?=10  width?=8  height?=6  maxWeight?=500
 * @returns      { length, width, height, maxWeight }   // the values submitted
 * @requires     url OR itemNumber OR name
 * @sideEffects  persistent · overwrites the item's weights & dimensions on QA
 * @pages        ItemPage
 * @recorded     NOT RECORDED — generated from the Amplitude sequence of 2026-11-03 (knightxiao, QA)
 *               + frontend source (editWeightsDimensions/index.tsx, EditPageWrapper). NOT yet run.
 * @source       Amplitude: ITEM_DETAIL_NAVIGATION{anchor_name:"Weights & Dimensions"}
 *                → PATH_TRACK /ItemV2/weights-dimensions/edit/<item>/<version>
 *                → UPDATE_WEIGHTS_DIMENSIONS_CARD SAVE → SAVE_SUCCESS (same action_id)
 *                → PATH_TRACK /ItemV2/detail/basic/<item>
 *               Code: 4 antd InputNumber fields (labels below); each must be > 0 (min 0.01) and is
 *               rounded to 2 decimals; success toast "Successfully saved change." then returns to
 *               the detail page.
 */
import {Page, expect} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SetWeightsDimensionsInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    length?: number; // inches, > 0, 2 decimals
    width?: number; // inches, > 0, 2 decimals
    height?: number; // inches, > 0, 2 decimals
    maxWeight?: number; // grams, > 0, 2 decimals
}

export async function setWeightsDimensions(
    page: Page,
    input: SetWeightsDimensionsInput,
): Promise<{length: number; width: number; height: number; maxWeight: number}> {
    const length = input.length ?? 10;
    const width = input.width ?? 8;
    const height = input.height ?? 6;
    const maxWeight = input.maxWeight ?? 500;

    const item = new ItemPage(page);
    // search() assumes we are on the item grid; a bare page has no Smart Search, so land there first.
    if (!input.url) await item.goto();
    await item.openItem({url: input.url, itemNumber: input.itemNumber, name: input.name});
    await page.waitForTimeout(1000);

    // Detail cards are lazily rendered: only BasicInfo/BOM exist until their left-rail anchor is
    // clicked (this is the ITEM_DETAIL_NAVIGATION event in the log). The anchor is icon-only, so
    // target it by href. Clicking it renders + scrolls to the #WeightsDimensions card.
    await page.locator('a[href="#WeightsDimensions"]').click();
    const card = page.locator("#WeightsDimensions");
    await card.waitFor({state: "visible", timeout: 20000});

    // The card's edit button (icon-only) navigates to a full-page editor
    // (PATH_TRACK shows /ItemV2/weights-dimensions/edit/<item>/<version>), not a modal.
    await card.locator(".ant-card-head").getByRole("button").first().click();
    await page.waitForURL(/\/ItemV2\/weights-dimensions\/edit\//, {timeout: 20000});
    await item.waitForIdle();

    // Form.Item labels are associated with their input (id = field name), so getByLabel works.
    await page.getByLabel("Length (in)").fill(String(length));
    await page.getByLabel("Width (in)").fill(String(width));
    await page.getByLabel("Height (in)").fill(String(height));
    await page.getByLabel("Weight (max)").fill(String(maxWeight));

    await item.save();

    // Success signal (code + SAVE_SUCCESS event): toast, then back to the detail page.
    await expect(page.getByText("Successfully saved change.")).toBeVisible({timeout: 20000});
    await page.waitForURL(/\/ItemV2\/detail\/basic\//, {timeout: 20000});

    return {length, width, height, maxWeight};
}
