/**
 * Page Object for the ERP Item Fields page (src/page/configurations/erpItemField,
 * route /configurations/erpItemFields → redirects to /erp-item-fields).
 * Grouped table; each type has a "+ New Value" trigger opening a Modal. No delete,
 * so the suite opens the create form + validates, but never submits (no junk data).
 */
import {expect, Locator, Page} from "@playwright/test";

export class ErpItemFieldsPage {
    static readonly PATH = "/configurations/erpItemFields";

    constructor(private readonly page: Page) {}

    valueNameHeader(): Locator {
        return this.page.getByRole("columnheader", {name: "Value Name"});
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    newValueButton(): Locator {
        return this.page.getByRole("button", {name: "+ New Value"});
    }
    private modal(): Locator {
        return this.page.locator(".ant-modal-content:visible");
    }

    async open(): Promise<void> {
        await this.page.goto(ErpItemFieldsPage.PATH); // redirects to /erp-item-fields
        await expect(this.valueNameHeader()).toBeVisible({timeout: 20000});
    }

    /** Open the first "+ New Value" modal; returns it (does not submit). */
    async openCreateModal(): Promise<Locator> {
        await this.newValueButton().first().click();
        const modal = this.modal();
        await expect(modal).toBeVisible();
        await expect(modal.getByRole("textbox")).toBeVisible();
        return modal;
    }

    async cancelModal(): Promise<void> {
        await this.modal().getByRole("button", {name: "Cancel"}).click();
    }
}
