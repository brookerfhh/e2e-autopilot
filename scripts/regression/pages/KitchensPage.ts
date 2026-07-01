/**
 * Page Object for the Kitchens page (src/page/locations/kitchens, route /locations/kitchen).
 *
 * No search form. Create/Edit open an AntD Modal; row Edit/Delete are inline <a>.
 * Only the Kitchen name is required, so full create is idempotent (unique e2e name
 * → find row by name → delete). Covered: load, create-modal-opens, validation,
 * create→delete lifecycle, edit-opens, row actions.
 */
import {expect, Locator, Page} from "@playwright/test";

export class KitchensPage {
    static readonly PATH = "/locations/kitchen";

    constructor(private readonly page: Page) {}

    /** Scoped to #content: the title also appears as a breadcrumb with the same text. */
    heading(): Locator {
        return this.page.locator("#content").getByText("Kitchens", {exact: true});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: /Create New Kitchen/});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    private modal(): Locator {
        return this.page.locator(".ant-modal-content:visible");
    }
    private confirmModal(): Locator {
        return this.page.locator(".ant-modal-confirm");
    }
    private firstRow(): Locator {
        return this.dataRows().first();
    }

    async open(): Promise<void> {
        await this.page.goto(KitchensPage.PATH); // baseURL from playwright.config.ts
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    /** Open the Create modal; returns it (does not submit). */
    async openCreateModal(): Promise<Locator> {
        await this.createButton().click();
        const modal = this.modal();
        await expect(modal).toBeVisible();
        await expect(modal.getByLabel("Kitchen Location")).toBeVisible();
        return modal;
    }

    async cancelModal(): Promise<void> {
        await this.modal().getByRole("button", {name: "Cancel"}).click();
    }

    /** Create a kitchen with a unique name and save; asserts success. Returns the name. */
    async createKitchen(name: string): Promise<string> {
        await this.openCreateModal();
        await this.modal().getByLabel("Kitchen Location").fill(name);
        await this.modal().getByRole("button", {name: "Save"}).click();
        await expect(this.page.getByText("Successfully created kitchen.")).toBeVisible({timeout: 20000});
        return name;
    }

    /** Delete the kitchen row identified by name; verify it is gone. */
    async deleteKitchenByName(name: string): Promise<void> {
        const row = this.page.locator("tr.ant-table-row").filter({hasText: name});
        await expect(row.first()).toBeVisible({timeout: 20000});
        await row.first().getByText("Delete", {exact: true}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "Yes"}).click();
        await expect(confirm).toBeHidden({timeout: 20000});
    }

    /** Open the first row's Edit modal (does not submit); returns it. */
    async openEditFirstRow(): Promise<Locator> {
        await this.firstRow().getByText("Edit", {exact: true}).click();
        const modal = this.modal();
        await expect(modal).toBeVisible();
        return modal;
    }
}
