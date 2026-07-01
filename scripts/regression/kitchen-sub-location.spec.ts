/**
 * Regression suite for the Kitchen Sub-Location page.
 * No delete here, so create is only opened + validated, never submitted.
 * Run: SESSION_ID=xxx npx playwright test kitchen-sub-location
 */
import {test, expect} from "./fixtures";
import {KitchenSubLocationPage} from "./pages/KitchenSubLocationPage";

test.describe("Kitchen Sub-Location", () => {
    test("loads with the Value Name column", async ({page}) => {
        const ksl = new KitchenSubLocationPage(page);
        await ksl.open();
        await expect(ksl.valueNameHeader()).toBeVisible();
    });

    test("create modal opens with the name field", async ({page}) => {
        const ksl = new KitchenSubLocationPage(page);
        await ksl.open();
        await ksl.openCreateModal();
        await ksl.cancelModal();
    });

    test("create requires a name (validation)", async ({page}) => {
        const ksl = new KitchenSubLocationPage(page);
        await ksl.open();
        const modal = await ksl.openCreateModal();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Kitchen Sub-Location Name is required.", {exact: true})).toBeVisible();
        await ksl.cancelModal();
    });
});
