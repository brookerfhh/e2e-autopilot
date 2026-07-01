/**
 * Page Object for the Concept Management page (src/page/concepts).
 *
 * Runs against the deployed env; locators use role/label/text (no testid needed —
 * the row actions Edit/Delete/Map Brand are inline text buttons, not a "…" menu).
 *
 * Verified against QA/local 2026-06-16.
 */
import {expect, Locator, Page} from "@playwright/test";

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class ConceptManagementPage {
    static readonly PATH = "/concepts";

    constructor(private readonly page: Page) {}

    // --- locators ---------------------------------------------------------
    heading(): Locator {
        return this.page.getByText("Concept Management", {exact: true});
    }
    /** R&D Lead is a plain text input — the easiest stable filter to drive. */
    rdLeadInput(): Locator {
        return this.page.getByPlaceholder("Search by R&D Lead");
    }
    searchButton(): Locator {
        return this.page.getByRole("button", {name: "Search"});
    }
    clearButton(): Locator {
        return this.page.getByRole("button", {name: "Clear"});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: "Create", exact: true});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    row(name: string): Locator {
        return this.page.getByRole("row", {name: new RegExp(escapeRegExp(name))});
    }
    /** The currently-open drawer (AntD keeps closed drawers in the DOM). */
    private drawer(): Locator {
        return this.page.locator(".ant-drawer-content:visible");
    }
    private confirmModal(): Locator {
        return this.page.locator(".ant-modal-confirm");
    }
    private firstRow(): Locator {
        return this.dataRows().first();
    }

    // --- actions ----------------------------------------------------------
    async open(): Promise<void> {
        await this.page.goto(ConceptManagementPage.PATH); // baseURL from playwright.config.ts
        // Route is code-split — allow a generous cold-load timeout.
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    async searchRdLead(value: string): Promise<void> {
        await this.rdLeadInput().fill(value);
        await this.searchButton().click();
    }

    async clearSearch(): Promise<void> {
        await this.clearButton().click();
    }

    /** Open the Create drawer and assert it is ready; does NOT submit. */
    async openCreateDrawer(): Promise<Locator> {
        await this.createButton().click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        await expect(drawer.getByLabel("Concept Name")).toBeVisible();
        return drawer;
    }

    async cancelDrawer(): Promise<void> {
        await this.drawer().getByRole("button", {name: "Cancel"}).click();
    }

    /** Fill the create drawer's required name and save; asserts the drawer closes. */
    async createConcept(name: string): Promise<void> {
        await this.openCreateDrawer();
        await this.drawer().getByLabel("Concept Name").fill(name);
        await this.drawer().getByRole("button", {name: "Save"}).click();
        await expect(this.drawer()).toBeHidden({timeout: 20000}); // waits on the backend write
    }

    /** Open the first row's Edit drawer (does not submit); returns the drawer. */
    async openEditFirstRow(): Promise<Locator> {
        await this.firstRow().getByRole("button", {name: "Edit"}).click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        return drawer;
    }

    /** Open the first row's Map Brand drawer (does not submit); returns the drawer. */
    async openMapBrandFirstRow(): Promise<Locator> {
        await this.firstRow().getByRole("button", {name: /Map Brand/}).click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        return drawer;
    }

    /** Open the first row's delete confirmation, then cancel it (no real delete). */
    async openDeleteConfirmThenCancel(): Promise<void> {
        await this.firstRow().getByRole("button", {name: "Delete"}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "Cancel"}).click();
        await expect(confirm).toBeHidden();
    }

    /** Delete the concept row identified by name (confirm "Delete"); verify it is gone. */
    async deleteConceptByName(name: string): Promise<void> {
        const row = this.page.locator("tr.ant-table-row").filter({hasText: name});
        await expect(row.first()).toBeVisible({timeout: 20000});
        await row.first().getByRole("button", {name: "Delete"}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "Delete"}).click();
        await expect(confirm).toBeHidden({timeout: 20000});
        await expect(this.page.locator("tr.ant-table-row").filter({hasText: name})).toHaveCount(0, {timeout: 20000});
    }
}
