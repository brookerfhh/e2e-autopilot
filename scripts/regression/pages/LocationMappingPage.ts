/**
 * Page Object for the Location Mappings page (src/page/locations/locationMapping).
 *
 * Runs against the deployed env; locators use role/label/text. Create opens an
 * AntD Modal (not a Drawer). The search form is all selects, so this suite does
 * not exercise a text-filter round-trip.
 *
 * Verified against QA/local 2026-06-16.
 */
import {expect, Locator, Page} from "@playwright/test";

export class LocationMappingPage {
    static readonly PATH = "/locations/location-mapping";

    constructor(private readonly page: Page) {}

    // --- locators ---------------------------------------------------------
    /** Scoped to #content: the page title also appears as a breadcrumb with the same text. */
    heading(): Locator {
        return this.page.locator("#content").getByText("Location Mappings", {exact: true});
    }
    searchButton(): Locator {
        return this.page.getByRole("button", {name: "Search"});
    }
    clearButton(): Locator {
        return this.page.getByRole("button", {name: "Clear"});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: /Create New Location/});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    /** The currently-open form modal (AntD may keep closed ones in the DOM). */
    private modal(): Locator {
        return this.page.locator(".ant-modal-content:visible");
    }
    private confirmModal(): Locator {
        return this.page.locator(".ant-modal-confirm");
    }
    private firstRow(): Locator {
        return this.dataRows().first();
    }

    // --- actions ----------------------------------------------------------
    async open(): Promise<void> {
        await this.page.goto(LocationMappingPage.PATH); // baseURL from playwright.config.ts
        // Route is code-split — allow a generous cold-load timeout.
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    /** Open the Create modal and assert it is ready; does NOT submit. */
    async openCreateModal(): Promise<Locator> {
        await this.createButton().click();
        const modal = this.modal();
        await expect(modal).toBeVisible();
        await expect(modal.getByLabel("Facility Name")).toBeVisible();
        return modal;
    }

    async cancelModal(): Promise<void> {
        await this.modal().getByRole("button", {name: "Cancel"}).click();
    }

    private locationModal(): Locator {
        return this.page.locator(".ant-modal-content").filter({hasText: "Location Mapping"});
    }
    private visibleDropdown(): Locator {
        return this.page.locator(".ant-select-dropdown:visible");
    }

    /** Open the Location-form select for `label`; settle past any closing dropdown. */
    private async openSelect(label: string): Promise<void> {
        await this.locationModal().locator(`.ant-form-item:has(label:text-is("${label}")) .ant-select-selector`).first().click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Pick the first existing Facility/Kitchen/Route and save. Because the backend
     * enforces a unique facility+kitchen, the first-first combo is already mapped,
     * so this deterministically triggers the "duplicate" error.
     */
    async attemptExistingCombo(): Promise<void> {
        await this.openCreateModal();
        await this.openSelect("Facility Name");
        await this.visibleDropdown().locator(".ant-select-item-option").first().click();
        await this.openSelect("Kitchen Location");
        await this.visibleDropdown().locator(".ant-select-item-option").first().click();
        await this.openSelect("Route");
        await this.visibleDropdown().locator(".ant-select-item-option").filter({hasNotText: "Create"}).first().click();
        await this.locationModal().getByRole("button", {name: "Save"}).click();
    }

    private e2eRows(): Locator {
        return this.page.locator("tr.ant-table-row").filter({hasText: "e2e-route-"});
    }

    /** Delete any leftover e2e-route mappings so facility+kitchen+route are free for a fresh create. */
    async cleanupE2eMappings(): Promise<void> {
        await expect(this.dataRows().first()).toBeVisible({timeout: 20000});
        for (let i = 0; i < 20; i++) {
            const row = this.e2eRows().first();
            if ((await row.count()) === 0) break;
            await row.getByText("Delete", {exact: true}).click();
            const confirm = this.confirmModal();
            await expect(confirm).toBeVisible();
            await confirm.getByRole("button", {name: "Yes"}).click();
            await expect(confirm).toBeHidden({timeout: 20000});
            await this.page.waitForTimeout(800);
        }
    }

    /**
     * Idempotent full create: a brand-new Route (passes the unique-route check) plus
     * a Facility/Kitchen combo freed by cleanupE2eMappings (passes the unique
     * facility+kitchen check). Returns the new route name (used to find/delete the row).
     * Waits for the created route to be filled back into the Route field before saving.
     */
    async createMappingWithNewRoute(): Promise<string> {
        const routeName = `e2e-route-${Date.now()}`;
        await this.openCreateModal();

        await this.openSelect("Facility Name");
        await this.page.keyboard.type("test");
        await this.page.waitForTimeout(500);
        await this.visibleDropdown().locator(".ant-select-item-option").first().click();

        await this.openSelect("Kitchen Location");
        await this.visibleDropdown().locator(".ant-select-item-option").first().click();

        await this.openSelect("Route");
        await this.visibleDropdown().locator(".ant-select-item-option").filter({hasText: "Create"}).first().click();
        const routeModal = this.page.locator(".ant-modal-content").filter({hasText: "Create New Route Name"});
        await expect(routeModal).toBeVisible();
        await routeModal.getByLabel("Route Name").fill(routeName);
        await routeModal.getByRole("button", {name: "Save"}).click();

        // KEY: wait until the new route is created AND back-filled into the Route field
        // before saving — otherwise the mapping submits without the new route_id.
        const routeField = this.locationModal().locator('.ant-form-item:has(label:text-is("Route")) .ant-select-selection-item');
        await expect(routeField).toHaveText(routeName, {timeout: 20000});

        await this.locationModal().getByRole("button", {name: "Save"}).click();
        return routeName;
    }

    /** Delete the mapping row identified by its (unique) route name; verify it is gone. */
    async deleteMappingByRoute(routeName: string): Promise<void> {
        const row = this.page.locator("tr.ant-table-row").filter({hasText: routeName});
        await expect(row).toBeVisible({timeout: 20000});
        await row.getByText("Delete", {exact: true}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "Yes"}).click();
        await expect(confirm).toBeHidden({timeout: 20000});
        await expect(this.page.locator("tr.ant-table-row").filter({hasText: routeName})).toHaveCount(0, {timeout: 20000});
    }

    /** Open the first row's Edit modal (does not submit); returns the modal. */
    async openEditFirstRow(): Promise<Locator> {
        await this.firstRow().getByText("Edit", {exact: true}).click();
        const modal = this.modal();
        await expect(modal).toBeVisible();
        return modal;
    }

    /** Open the first row's delete confirmation, then dismiss it with "No". */
    async openDeleteConfirmThenCancel(): Promise<void> {
        await this.firstRow().getByText("Delete", {exact: true}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "No"}).click();
        await expect(confirm).toBeHidden();
    }
}
