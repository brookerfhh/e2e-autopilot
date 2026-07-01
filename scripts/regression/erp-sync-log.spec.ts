/**
 * Regression suite for the ERP Sync Log page (read-only log + search).
 * Run: SESSION_ID=xxx npx playwright test erp-sync-log
 */
import {test, expect} from "./fixtures";
import {ErpSyncLogPage} from "./pages/ErpSyncLogPage";

test.describe("ERP Sync Log", () => {
    test("loads with the Job Name column", async ({page}) => {
        const log = new ErpSyncLogPage(page);
        await log.open();
        await expect(page.getByRole("columnheader", {name: "Job Name"})).toBeVisible();
    });

    test("search and clear controls are present and usable", async ({page}) => {
        const log = new ErpSyncLogPage(page);
        await log.open();
        await expect(log.searchButton()).toBeVisible();
        await expect(log.clearButton()).toBeVisible();
        // a search round-trip should not break the table
        await log.search(`e2e-no-such-item-${Date.now()}`);
        await expect(log.table()).toBeVisible();
    });
});
