/**
 * Page Object for the Brand Management page (src/page/brands, route /brands).
 * Full CRUD: Create Brand opens a Drawer; rows have a "…" menu with Edit / Delete
 * (Delete asks for confirmation). The suite is idempotent — each mutating test
 * creates a unique `e2e-${ts}` brand and deletes it, so QA needs no teardown.
 *
 * Recon verified against QA 2026-06-25: /brands route (no permission redirect),
 * title is a <span> "Brand Management" (not a heading role), 25 rows, Create Brand
 * button, search field "Brand Name", drawer field "Brand Name" + Save/Cancel,
 * validation "Brand Name is required", row menu Edit/Delete, delete confirm modal.
 */
import {expect, Locator, Page} from "@playwright/test";

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class BrandManagementPage {
    static readonly PATH = "/brands";

    constructor(private readonly page: Page) {}

    // --- locators ---------------------------------------------------------
    /** Page title is a styled <span>, not a heading role — locate by exact text. */
    heading(): Locator {
        return this.page.getByText("Brand Management", {exact: true});
    }
    searchInput(): Locator {
        return this.page.getByLabel("Brand Name");
    }
    searchButton(): Locator {
        return this.page.getByRole("button", {name: "Search"});
    }
    clearButton(): Locator {
        return this.page.getByRole("button", {name: "Clear"});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: "Create Brand"});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }
    /** Data rows only (excludes the header row). `.ant-table-row` is a stable AntD class. */
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    row(brandName: string): Locator {
        return this.page.getByRole("row", {name: new RegExp(escapeRegExp(brandName))});
    }
    /**
     * Row "…" actions trigger. Prefers the data-testid (once the source change ships);
     * falls back to the AntD ellipsis icon inside the table body for the current QA build.
     */
    rowActionsTrigger(): Locator {
        return this.page.locator('[data-testid="brand-row-actions"], .ant-table-tbody .anticon-ellipsis');
    }
    /** The currently-open drawer. AntD keeps closed drawers in the DOM, so scope to the visible one. */
    private drawer(): Locator {
        return this.page.locator(".ant-drawer-content:visible");
    }
    private confirmModal(): Locator {
        return this.page.locator(".ant-modal-confirm");
    }

    // --- actions ----------------------------------------------------------
    async open(): Promise<void> {
        await this.page.goto(BrandManagementPage.PATH); // baseURL from playwright.config.ts
        // The route is code-split (async import) — a cold load can exceed the default timeout.
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    async search(name: string): Promise<void> {
        await this.searchInput().fill(name);
        await this.searchButton().click();
    }

    async clearSearch(): Promise<void> {
        await this.clearButton().click();
    }

    /** Create a brand via the drawer; returns the name used. */
    async createBrand(name: string): Promise<string> {
        await this.createButton().click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        await drawer.getByLabel("Brand Name").fill(name);
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(drawer).toBeHidden({timeout: 20000}); // waits on the backend write
        return name;
    }

    /** Open the create drawer (without submitting); returns the visible drawer. */
    async openCreateDrawer(): Promise<Locator> {
        await this.createButton().click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        return drawer;
    }

    /** Open the "…" actions menu on the first data row. */
    async openFirstRowActions(): Promise<void> {
        await this.rowActionsTrigger().first().click();
    }

    /** Search to isolate a row, open its "…" menu, click Edit; returns the edit drawer. */
    async openEditFor(name: string): Promise<Locator> {
        await this.search(name);
        await this.openFirstRowActions();
        await this.page.getByRole("menuitem", {name: "Edit"}).click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        return drawer;
    }

    /** Rename within an open edit drawer and save. */
    async renameInDrawer(newName: string): Promise<void> {
        const drawer = this.drawer();
        await drawer.getByLabel("Brand Name").fill(newName);
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(drawer).toBeHidden({timeout: 20000}); // waits on the backend write
    }

    /** Search to isolate a row, open its "…" menu, click Delete, confirm. */
    async deleteFirstRow(name: string): Promise<void> {
        await this.search(name);
        await this.openFirstRowActions();
        await this.page.getByRole("menuitem", {name: "Delete"}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "Delete"}).click();
        await expect(confirm).toBeHidden({timeout: 20000}); // waits on the backend delete
    }

    /** Assert a search settled to no rows. 20s — a delete is a backend write and
     *  the list must re-query before the row disappears (matches suite convention). */
    async expectNoRows(): Promise<void> {
        await expect(this.dataRows()).toHaveCount(0, {timeout: 20000});
    }
}
