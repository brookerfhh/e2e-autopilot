/**
 * Regression suite for the Location Mappings page.
 *
 * Run (see playwright.config.ts for env vars):
 *   SESSION_ID=xxx npx playwright test location-mapping
 *
 * Behavioral assertions only. Search filters are all selects, so this suite
 * verifies load / create-modal / row-actions rather than a text-search round-trip.
 */
import {test, expect} from "./fixtures";
import {LocationMappingPage} from "./pages/LocationMappingPage";

test.describe("Location Mappings", () => {
    test("loads the list page with header and at least one row", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await expect(page.getByRole("columnheader", {name: "FACILITY NAME"})).toBeVisible();
        await expect(locations.dataRows().first()).toBeVisible();
    });

    test("search and clear controls are present", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await expect(locations.searchButton()).toBeVisible();
        await expect(locations.clearButton()).toBeVisible();
    });

    test("create modal opens with the Facility Name field", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await locations.openCreateModal();
        await locations.cancelModal();
    });

    test("create requires Facility Name (validation)", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        const modal = await locations.openCreateModal();
        await modal.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Facility Name is required.", {exact: true})).toBeVisible();
    });

    test("create a mapping (new route) then delete it", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await locations.cleanupE2eMappings(); // free facility+kitchen from any leftover
        const routeName = await locations.createMappingWithNewRoute();
        // createMappingWithNewRoute already waited for the route back-fill before saving;
        // deleteMappingByRoute waits for the new row, proving the create succeeded.
        await locations.deleteMappingByRoute(routeName);
    });

    test("duplicate mapping shows an error", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await locations.attemptExistingCombo();
        await expect(page.getByText(/same Location Mapping exists/i)).toBeVisible({timeout: 20000});
    });

    test("edit modal opens for the first row", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        const modal = await locations.openEditFirstRow();
        await expect(modal.getByLabel("Facility Name")).toBeVisible();
        await locations.cancelModal();
    });

    test("delete shows a confirmation dialog (cancelled)", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await locations.openDeleteConfirmThenCancel();
    });

    test("row actions expose Edit", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        await expect(locations.dataRows().first().getByText("Edit", {exact: true})).toBeVisible();
    });

    test("pagination navigates to page 2", async ({page}) => {
        const locations = new LocationMappingPage(page);
        await locations.open();
        const page2 = page.locator(".ant-pagination-item-2");
        await expect(page2).toBeVisible({timeout: 20000});
        const firstBefore = await locations.dataRows().first().innerText();
        await page2.click();
        await expect(page.locator(".ant-pagination-item-active")).toHaveText("2");
        await expect(locations.dataRows().first()).not.toHaveText(firstBefore);
    });
});
