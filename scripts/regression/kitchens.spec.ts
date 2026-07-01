/**
 * Regression suite for the Kitchens page.
 * Run: SESSION_ID=xxx npx playwright test kitchens
 */
import {test, expect} from "./fixtures";
import {KitchensPage} from "./pages/KitchensPage";

test.describe("Kitchens", () => {
    test("loads the list page with header and at least one row", async ({page}) => {
        const kitchens = new KitchensPage(page);
        await kitchens.open();
        await expect(page.getByRole("columnheader", {name: "KITCHEN NAME"})).toBeVisible();
        await expect(kitchens.dataRows().first()).toBeVisible();
    });

    test("create modal opens with the Kitchen Location field", async ({page}) => {
        const kitchens = new KitchensPage(page);
        await kitchens.open();
        await kitchens.openCreateModal();
        await kitchens.cancelModal();
    });

    test("create requires a name (validation)", async ({page}) => {
        const kitchens = new KitchensPage(page);
        await kitchens.open();
        const modal = await kitchens.openCreateModal();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Kitchen Location Name is required.", {exact: true})).toBeVisible();
    });

    test("create a kitchen then delete it", async ({page}) => {
        const kitchens = new KitchensPage(page);
        await kitchens.open();
        const name = `e2e-kitchen-${Date.now()}`;
        await kitchens.createKitchen(name);
        await kitchens.deleteKitchenByName(name);
    });

    test("edit modal opens for the first row", async ({page}) => {
        const kitchens = new KitchensPage(page);
        await kitchens.open();
        const modal = await kitchens.openEditFirstRow();
        await expect(modal.getByLabel("Kitchen Location")).toBeVisible();
        await kitchens.cancelModal();
    });

    test("row actions expose Edit", async ({page}) => {
        const kitchens = new KitchensPage(page);
        await kitchens.open();
        await expect(kitchens.dataRows().first().getByText("Edit", {exact: true})).toBeVisible();
    });
});
