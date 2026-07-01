/**
 * Regression suite for the Allergens page (read-only).
 * Run: SESSION_ID=xxx npx playwright test allergens
 */
import {test, expect} from "./fixtures";
import {AllergensPage} from "./pages/AllergensPage";

test.describe("Allergens", () => {
    test("loads the list with header and at least one row", async ({page}) => {
        const allergens = new AllergensPage(page);
        await allergens.open();
        await expect(page.getByRole("columnheader", {name: "Allergen Name"})).toBeVisible();
        await expect(allergens.dataRows().first()).toBeVisible();
    });
});
