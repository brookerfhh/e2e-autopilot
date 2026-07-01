/**
 * Page Object for the Allergens page (src/page/configurations/allergen).
 * Read-only: a table only (no create/edit/delete, no search).
 */
import {expect, Locator, Page} from "@playwright/test";

export class AllergensPage {
    static readonly PATH = "/configurations/allergens";

    constructor(private readonly page: Page) {}

    heading(): Locator {
        return this.page.locator("#content").getByText("Allergens", {exact: true});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }

    async open(): Promise<void> {
        await this.page.goto(AllergensPage.PATH); // baseURL from playwright.config.ts
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }
}
