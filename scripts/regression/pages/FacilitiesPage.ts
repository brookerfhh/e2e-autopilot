/**
 * Page Object for the Facilities page (src/page/locations/facilities).
 *
 * No search form. Create/Edit open an AntD Modal; row Edit/Delete are inline <a>.
 * Full create is idempotent: unique e2e name + first Type + an async address picked
 * by typing "abc", then delete the row by name.
 */
import {expect, Locator, Page} from "@playwright/test";

export class FacilitiesPage {
    static readonly PATH = "/locations/facilities";

    constructor(private readonly page: Page) {}

    /** Scoped to #content: the title also appears as a breadcrumb with the same text. */
    heading(): Locator {
        return this.page.locator("#content").getByText("Facilities", {exact: true});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: /Create New Facility/});
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
        await this.page.goto(FacilitiesPage.PATH); // baseURL from playwright.config.ts
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    /** Open the Create modal; returns it (does not submit). */
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

    private visibleDropdown(): Locator {
        return this.page.locator(".ant-select-dropdown:visible");
    }

    /** Open the modal select for `label`; settle past any closing dropdown. */
    private async openSelect(label: string): Promise<void> {
        await this.modal().locator(`.ant-form-item:has(label:text-is("${label}")) .ant-select-selector`).first().click();
        await this.page.waitForTimeout(500);
    }

    /** Type into the Address Line 1 search and return the live options dropdown. */
    async addressTypeahead(query: string): Promise<Locator> {
        await this.openSelect("Address Line 1");
        await this.page.keyboard.type(query);
        const option = this.visibleDropdown().locator(".ant-select-item-option").first();
        await expect(option).toBeVisible({timeout: 15000}); // async address lookup
        return this.visibleDropdown();
    }

    /** Full create: unique name + first Type + an address from typing "abc". Returns the name. */
    async createFacility(name: string): Promise<string> {
        await this.openCreateModal();
        await this.modal().getByLabel("Facility Name").fill(name);
        await this.openSelect("Type");
        await this.visibleDropdown().locator(".ant-select-item-option").first().click();
        await this.addressTypeahead("abc");
        await this.visibleDropdown().locator(".ant-select-item-option").first().click();
        await this.modal().getByRole("button", {name: "Save"}).click();
        await expect(this.page.getByText(/created/i).first()).toBeVisible({timeout: 20000});
        return name;
    }

    /** Delete the facility row identified by name; verify it is gone. */
    async deleteFacilityByName(name: string): Promise<void> {
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

    /** Open the first row's delete confirmation, then dismiss it with "No". */
    async openDeleteConfirmThenCancel(): Promise<void> {
        await this.firstRow().getByText("Delete", {exact: true}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "No"}).click();
        await expect(confirm).toBeHidden();
    }
}
