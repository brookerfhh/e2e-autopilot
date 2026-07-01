/**
 * Regression suite for the Units page.
 * No delete on this page, so create is only opened + validated, never submitted.
 * Run: SESSION_ID=xxx npx playwright test units
 */
import {test, expect} from "./fixtures";
import {UnitsPage} from "./pages/UnitsPage";

test.describe("Units", () => {
    test("loads with the Units title and at least one unit", async ({page}) => {
        const units = new UnitsPage(page);
        await units.open();
        await expect(units.dataRows().first()).toBeVisible();
    });

    test("create drawer opens with the Unit Code field", async ({page}) => {
        const units = new UnitsPage(page);
        await units.open();
        await units.openCreateDrawer();
        await units.cancelDrawer();
    });

    test("create requires a valid Unit Code (validation)", async ({page}) => {
        const units = new UnitsPage(page);
        await units.open();
        const drawer = await units.openCreateDrawer();
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Unit Code can only include a-z and A-Z!", {exact: true})).toBeVisible();
        await units.cancelDrawer();
    });
});
