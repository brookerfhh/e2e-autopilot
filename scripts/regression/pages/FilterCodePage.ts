/**
 * Page Object for the Filter Code page (src/page/configurations/filterCode, route
 * /configurations/filter-code). Create/Edit open a Drawer; rows have Edit + Delete.
 * Has delete, so full create→delete is idempotent (unique e2e code, deleted by the test).
 */
import {expect, Locator, Page} from "@playwright/test";

export class FilterCodePage {
    static readonly PATH = "/configurations/filter-code";

    constructor(private readonly page: Page) {}

    createButton(): Locator {
        return this.page.getByRole("button", {name: "Create", exact: true});
    }
    table(): Locator {
        return this.page.getByRole("table");
    }
    dataRows(): Locator {
        return this.page.locator(".ant-table-tbody tr.ant-table-row");
    }
    private drawer(): Locator {
        return this.page.locator(".ant-drawer-content:visible");
    }
    private confirmModal(): Locator {
        return this.page.locator(".ant-modal-confirm");
    }

    async open(): Promise<void> {
        await this.page.goto(FilterCodePage.PATH); // baseURL from playwright.config.ts
        // "Filter Code" is both the page title and a column header, so use the
        // unambiguous Create button + table as the readiness signal.
        await expect(this.createButton()).toBeVisible({timeout: 20000});
        await expect(this.table()).toBeVisible({timeout: 20000});
    }

    /** Open the Create drawer; returns it (does not submit). */
    async openCreateDrawer(): Promise<Locator> {
        await this.createButton().click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        await expect(drawer.getByLabel("Filter Code", {exact: true})).toBeVisible();
        return drawer;
    }

    /** The Create/Edit drawer has no Cancel button — close it via the X. */
    async closeDrawer(): Promise<void> {
        await this.page.locator(".ant-drawer-open .ant-drawer-close").first().click();
        await expect(this.drawer()).toBeHidden();
    }

    /** Full create: unique code + description, save. Returns the code. */
    async createFilterCode(code: string): Promise<string> {
        await this.openCreateDrawer();
        const drawer = this.drawer();
        await drawer.getByLabel("Filter Code", {exact: true}).fill(code);
        await drawer.getByLabel("Description").fill("e2e regression");
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(this.page.getByText(`${code} successfully saved.`)).toBeVisible({timeout: 20000});
        return code;
    }

    /** Delete the filter-code row by its code; verify it is gone. */
    async deleteFilterCodeByCode(code: string): Promise<void> {
        const row = this.page.locator("tr.ant-table-row").filter({hasText: code});
        await expect(row.first()).toBeVisible({timeout: 20000});
        await row.first().getByRole("button", {name: "Delete"}).click();
        const confirm = this.confirmModal();
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", {name: "Yes"}).click();
        await expect(confirm).toBeHidden({timeout: 20000});
        await expect(this.page.locator("tr.ant-table-row").filter({hasText: code})).toHaveCount(0, {timeout: 20000});
    }

    /** Open the first row's Edit drawer (does not submit); returns it. */
    async openEditFirstRow(): Promise<Locator> {
        await this.dataRows().first().getByRole("button", {name: "Edit"}).click();
        const drawer = this.drawer();
        await expect(drawer).toBeVisible();
        return drawer;
    }
}
