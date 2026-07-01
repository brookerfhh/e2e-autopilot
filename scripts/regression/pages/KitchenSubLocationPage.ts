/**
 * Page Object for Kitchen Sub-Location (src/page/configurations/kitchenSubLocation),
 * shown under route /configurations/erpItemFields/kitchen-sub-location.
 * Create opens a Modal; row edit/delete are disabled here, so the suite opens the
 * create form + validates, but never submits (no junk data).
 */
import {expect, Locator, Page} from "@playwright/test";

export class KitchenSubLocationPage {
    static readonly PATH = "/configurations/erpItemFields/kitchen-sub-location";

    constructor(private readonly page: Page) {}

    valueNameHeader(): Locator {
        return this.page.getByRole("columnheader", {name: "Value Name"});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: "+ New Value"});
    }
    private modal(): Locator {
        return this.page.locator(".ant-modal-content:visible");
    }

    async open(): Promise<void> {
        await this.page.goto(KitchenSubLocationPage.PATH); // baseURL from playwright.config.ts
        await expect(this.valueNameHeader()).toBeVisible({timeout: 20000});
    }

    /** Open the Create modal; returns it (does not submit). */
    async openCreateModal(): Promise<Locator> {
        await this.createButton().click();
        const modal = this.modal();
        await expect(modal).toBeVisible();
        await expect(modal.getByLabel("Kitchen Sub-Location Name")).toBeVisible();
        return modal;
    }

    async cancelModal(): Promise<void> {
        await this.modal().getByRole("button", {name: "Cancel"}).click();
    }
}
