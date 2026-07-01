/**
 * Regression suite for the Filter Code page (full CRUD; has delete).
 * Run: SESSION_ID=xxx npx playwright test filter-code
 */
import {test, expect} from "./fixtures";
import {FilterCodePage} from "./pages/FilterCodePage";

test.describe("Filter Code", () => {
    test("loads with the Filter Code column", async ({page}) => {
        const filterCode = new FilterCodePage(page);
        await filterCode.open();
        await expect(page.getByRole("columnheader", {name: "Filter Code", exact: true})).toBeVisible();
        await expect(filterCode.dataRows().first()).toBeVisible();
    });

    test("create drawer opens with the Filter Code field", async ({page}) => {
        const filterCode = new FilterCodePage(page);
        await filterCode.open();
        await filterCode.openCreateDrawer();
        await filterCode.closeDrawer();
    });

    test("create requires a Filter Code (validation)", async ({page}) => {
        const filterCode = new FilterCodePage(page);
        await filterCode.open();
        const drawer = await filterCode.openCreateDrawer();
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Filter Code is required.", {exact: true})).toBeVisible();
        await filterCode.closeDrawer();
    });

    test("create a filter code then delete it", async ({page}) => {
        const filterCode = new FilterCodePage(page);
        await filterCode.open();
        const code = `e2e${Date.now()}`;
        await filterCode.createFilterCode(code);
        await filterCode.deleteFilterCodeByCode(code);
    });

    test("edit drawer opens for the first row", async ({page}) => {
        const filterCode = new FilterCodePage(page);
        await filterCode.open();
        await filterCode.openEditFirstRow();
        await filterCode.closeDrawer();
    });
});
