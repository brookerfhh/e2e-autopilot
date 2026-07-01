/**
 * Regression suite for the ERP Item Fields page.
 * No delete on this page, so create is only opened + validated, never submitted.
 * Run: SESSION_ID=xxx npx playwright test erp-item-fields
 */
import {test, expect} from "./fixtures";
import {ErpItemFieldsPage} from "./pages/ErpItemFieldsPage";

test.describe("ERP Item Fields", () => {
    test("loads with the Value Name column and at least one row", async ({page}) => {
        const erp = new ErpItemFieldsPage(page);
        await erp.open();
        await expect(erp.dataRows().first()).toBeVisible();
    });

    test("new-value modal opens", async ({page}) => {
        const erp = new ErpItemFieldsPage(page);
        await erp.open();
        await erp.openCreateModal();
        await erp.cancelModal();
    });

    test("new value requires a name (validation)", async ({page}) => {
        const erp = new ErpItemFieldsPage(page);
        await erp.open();
        const modal = await erp.openCreateModal();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Name is required.", {exact: true})).toBeVisible();
        await erp.cancelModal();
    });
});
