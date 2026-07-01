/**
 * Page Object for the Units page (src/page/configurations/units, route /configurations/units).
 * Tabbed page (Cookbook Unit / OG UOMs). Create opens a Drawer; there is NO delete,
 * so the suite opens the create form + validates, but never submits (no junk data).
 */
import {expect, Locator, Page} from "@playwright/test";

export class UnitsPage {
    static readonly PATH = "/configurations/units";

    constructor(private readonly page: Page) {}

    heading(): Locator {
        return this.page.locator("#content").getByText("Units", {exact: true});
    }
    createButton(): Locator {
        return this.page.getByRole("button", {name: "Create", exact: true});
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    private drawer(): Locator {
        return this.page.locator(".ant-drawer-content:visible");
    }

    async open(): Promise<void> {
        await this.page.goto(UnitsPage.PATH); // baseURL from playwright.config.ts
        await expect(this.heading()).toBeVisible({timeout: 20000});
        await expect(this.dataRows().first()).toBeVisible({timeout: 20000});
    }

    /** Open the Create Unit drawer; returns it (does not submit). */
    async openCreateDrawer(): Promise<Locator> {
        await this.createButton().click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        await expect(drawer.getByLabel("Unit Code")).toBeVisible();
        return drawer;
    }

    async cancelDrawer(): Promise<void> {
        await this.drawer().getByRole("button", {name: "Cancel"}).click();
    }
}
