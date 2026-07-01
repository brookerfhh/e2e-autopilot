/**
 * Page Object for the ERP Sync Log page (src/page/syncJobLog/management, route /sync-job-log/erp).
 * Read-only log with a search form (Item Numbers / Job Name / Status / date range).
 */
import {expect, Locator, Page} from "@playwright/test";

export class ErpSyncLogPage {
    static readonly PATH = "/sync-job-log/erp";

    constructor(private readonly page: Page) {}

    heading(): Locator {
        return this.page.locator("#content").getByText("Sync Job Log", {exact: true});
    }
    itemNumbersInput(): Locator {
        return this.page.getByLabel("Item Numbers");
    }
    searchButton(): Locator {
        return this.page.getByRole("button", {name: "Search"});
    }
    clearButton(): Locator {
        return this.page.getByRole("button", {name: "Clear"});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }

    async open(): Promise<void> {
        await this.page.goto(ErpSyncLogPage.PATH); // baseURL from playwright.config.ts
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    async search(itemNumber: string): Promise<void> {
        await this.itemNumbersInput().fill(itemNumber);
        await this.searchButton().click();
    }
}
