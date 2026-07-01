/**
 * Regression suite for the Brand Management page (/brands).
 *
 * Run (see playwright.config.ts for env vars):
 *   SESSION_ID=xxx npx playwright test brand-management
 *   SESSION_ID=xxx npx playwright test --ui
 *
 * Behavioral assertions only — no dependence on a specific pre-existing row.
 * Mutating tests use a unique e2e-${ts} name and delete their own data (idempotent).
 */
import {test, expect} from "./fixtures";
import {BrandManagementPage} from "./pages/BrandManagementPage";

test.describe("Brand Management", () => {
    test("loads the list page with header and at least one row", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        await expect(page.getByRole("columnheader", {name: "BRAND NAME"})).toBeVisible();
        await expect(brands.dataRows().first()).toBeVisible();
    });

    test("search for a non-existent name yields no rows, clear restores", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        await brands.search(`zzz-no-such-brand-${Date.now()}`);
        await expect(brands.dataRows()).toHaveCount(0);
        await brands.clearSearch();
        await expect(brands.dataRows().first()).toBeVisible();
    });

    test("create a brand and find it via search", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        const name = `e2e-${Date.now()}`;
        await brands.createBrand(name);
        await brands.search(name);
        await expect(brands.row(name)).toBeVisible();
        // teardown so reruns stay idempotent
        await brands.deleteFirstRow(name);
    });

    test("row actions menu opens (Edit / Delete reachable)", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        await brands.openFirstRowActions();
        await expect(page.getByRole("menuitem").first()).toBeVisible();
    });

    test("create requires a name (validation)", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        const drawer = await brands.openCreateDrawer();
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Brand Name is required", {exact: true})).toBeVisible();
    });

    test("edit a brand: create, rename, verify", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        const name = `e2e-${Date.now()}`;
        await brands.createBrand(name);
        await brands.openEditFor(name);
        const renamed = `${name}-edited`;
        await brands.renameInDrawer(renamed);
        await brands.search(renamed);
        await expect(brands.row(renamed)).toBeVisible();
        // teardown so reruns stay idempotent
        await brands.deleteFirstRow(renamed);
    });

    test("delete a brand: create, delete, verify gone", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        const name = `e2e-${Date.now()}`;
        await brands.createBrand(name);
        await brands.deleteFirstRow(name);
        await brands.search(name);
        await brands.expectNoRows();
    });

    test("sorting a column toggles its order", async ({page}) => {
        const brands = new BrandManagementPage(page);
        await brands.open();
        const header = page.getByRole("columnheader", {name: /CREATED TIME/});
        await header.click();
        const first = await header.getAttribute("aria-sort");
        await header.click();
        const second = await header.getAttribute("aria-sort");
        expect(first).toBeTruthy(); // column is now sorted
        expect(second).not.toBe(first); // clicking again toggled the direction
    });
});
