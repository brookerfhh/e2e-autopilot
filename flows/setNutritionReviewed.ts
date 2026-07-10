/**
 * @flow         setNutritionReviewed
 * @action       update                          // create | search | delete | update | verify | composite
 * @target       Item · Nutrition ("Nutrition Reviewed" switch)
 * @summary      Open an item's Edit Nutrition page and set the "Nutrition Reviewed" switch.
 * @params       url? | itemNumber? | name?  (one required — how to reach the item)  reviewed?=true
 * @returns      { reviewed: boolean }            // settled switch state read back after save
 * @requires     url OR itemNumber OR name
 * @sideEffects  persistent · flips the item's Nutrition Reviewed flag on QA
 * @pages        ItemPage
 * @recorded     2026-07-09 vs QA (cookbook.foodtruck-qa.com)
 * @note         Nutrition edits are a full "Edit Nutrition" PAGE (not a modal), reached by its DIRECT
 *               URL /ItemV2/nutrition_allergen/<number>/<versionId>. When a `url` is given we parse
 *               that URL directly — NO detour through the (slow) detail page.
 * @behaviour    Primary path = just toggle the switch + Save. If the app blocks it with the toast
 *               "Unable to save changes. Nutrients shouldn't be blank.", we fall back to entering the
 *               Item Nutrients as 0 and retry (their shown "0" is only a placeholder). The fallback
 *               OVERWRITES nutrient values with 0 — fine for test data, so it's error-driven only.
 *               The switch renders default-off then hydrates ~1-2s later, so reads use switchIsOnSettled.
 * @limitation   reviewed=FALSE (un-reviewing an already-reviewed item) may not reliably persist.
 */
import {Page} from "@playwright/test";
import {ItemPage} from "./pages/ItemPage";

export interface SetNutritionReviewedInput {
    url?: string;
    itemNumber?: string;
    name?: string;
    reviewed?: boolean;
    verify?: boolean; // default FALSE (fast, returns the desired state); pass true to reopen-and-confirm
}

const SWITCH = "basic_nutrition_reviewed";

/** Build the Edit Nutrition page URL from an item detail URL. */
function editNutritionUrl(detailUrl: string): string {
    const u = new URL(detailUrl);
    const number = u.pathname.split("/").filter(Boolean).pop();
    const versionId = u.searchParams.get("version_id");
    if (!number || !versionId) {
        throw new Error(`could not derive nutrition edit URL from ${detailUrl}`);
    }
    return `${u.origin}/ItemV2/nutrition_allergen/${number}/${versionId}`;
}

/** Navigate to the Edit Nutrition page. Uses the given url directly (no detail-page detour). */
async function openEditNutrition(page: Page, item: ItemPage, target: SetNutritionReviewedInput): Promise<void> {
    let detailUrl = target.url;
    if (!detailUrl) {
        // only when we lack a url: resolve the item via search to learn its detail URL
        await item.openItem({itemNumber: target.itemNumber, name: target.name});
        await page.waitForTimeout(1000);
        detailUrl = page.url();
    }
    await page.goto(editNutritionUrl(detailUrl));
    await item.waitForIdle();
    await page.locator(`#${SWITCH}`).waitFor({state: "visible", timeout: 20000});
    // brief settle (~1s); the switch's real value is then read via the fine-grained switchIsOnSettled
    // poll. (networkidle is avoided — the app's background traffic makes it hang to the 30s timeout.)
    await page.waitForTimeout(1000);
}

/**
 * Click Save on the Edit Nutrition page and classify the outcome by the toast the app shows:
 *   "blank" — "Unable to save changes. Nutrients shouldn't be blank." (needs nutrient values entered)
 *   "ok"    — no blocking toast (save accepted)
 * Retries past the transient "Calculating nutrition data, please save later." toast.
 */
async function trySave(page: Page, item: ItemPage): Promise<"ok" | "blank"> {
    // regexes avoid the apostrophe in "shouldn't" (straight vs curly) by matching around it
    const calculating = page.getByText(/Calculating nutrition data/i);
    const blank = page.getByText(/Nutrients.*blank/i);
    for (let attempt = 1; attempt <= 6; attempt++) {
        await item.save();
        // race the two toasts appearing (catch as soon as visible); null if neither within the window
        const signal = await Promise.race([
            blank.waitFor({state: "visible", timeout: 1500}).then(() => "blank").catch(() => null),
            calculating.waitFor({state: "visible", timeout: 1500}).then(() => "calc").catch(() => null),
        ]);
        if (signal === "blank") return "blank";
        if (signal === "calc") {
            await calculating.waitFor({state: "hidden", timeout: 20000}).catch(() => {});
            continue; // recalculation finished — save again
        }
        return "ok";
    }
    return "ok";
}

export async function setNutritionReviewed(
    page: Page,
    input: SetNutritionReviewedInput,
): Promise<{reviewed: boolean}> {
    const desired = input.reviewed ?? true;
    const item = new ItemPage(page);

    // Primary path: just set the switch and save.
    await openEditNutrition(page, item, input);
    await item.setSwitch(SWITCH, desired);
    const outcome = await trySave(page, item);

    // Fallback (deterministic, driven by the app's own error toast): the save was blocked because
    // the nutrients are blank → enter them (0) and retry. Only now, since this overwrites nutrition.
    if (desired && outcome === "blank") {
        await item.fillNutrientsZero();
        await item.setSwitch(SWITCH, true);
        await trySave(page, item);
    }

    if (input.verify !== true) return {reviewed: desired}; // default: skip verify (pass verify:true to confirm)

    // Verify (settled read — the switch renders default-off then hydrates the saved value).
    await openEditNutrition(page, item, input);
    return {reviewed: await item.switchIsOnSettled(SWITCH)};
}
