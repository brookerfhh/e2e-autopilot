/**
 * Regression suite for the Facilities page.
 * Run: SESSION_ID=xxx npx playwright test facilities
 */
import {test, expect} from "./fixtures";
import {FacilitiesPage} from "./pages/FacilitiesPage";

test.describe("Facilities", () => {
    test("loads the list page with header and at least one row", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        await expect(page.getByRole("columnheader", {name: "FACILITY NAME"})).toBeVisible();
        await expect(facilities.dataRows().first()).toBeVisible();
    });

    test("create modal opens with the Facility Name field", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        await facilities.openCreateModal();
        await facilities.cancelModal();
    });

    test("create requires a Facility Name (validation)", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        const modal = await facilities.openCreateModal();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Facility Name is required.", {exact: true})).toBeVisible();
    });

    test("address line 1 returns autocomplete options", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        await facilities.openCreateModal();
        const dropdown = await facilities.addressTypeahead("abc");
        await expect(dropdown.locator(".ant-select-item-option").first()).toBeVisible();
        await facilities.cancelModal();
    });

    test("create a facility then delete it", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        const name = `e2e-fac-${Date.now()}`;
        await facilities.createFacility(name);
        await facilities.deleteFacilityByName(name);
    });

    test("edit modal opens for the first row", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        const modal = await facilities.openEditFirstRow();
        await expect(modal.getByLabel("Facility Name")).toBeVisible();
        await facilities.cancelModal();
    });

    test("delete shows a confirmation dialog (cancelled)", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        await facilities.openDeleteConfirmThenCancel();
    });

    test("row actions expose Edit", async ({page}) => {
        const facilities = new FacilitiesPage(page);
        await facilities.open();
        await expect(facilities.dataRows().first().getByText("Edit", {exact: true})).toBeVisible();
    });
});
