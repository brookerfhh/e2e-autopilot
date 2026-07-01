/**
 * Regression suite for the Concept Management page.
 *
 * Run (see playwright.config.ts for env vars):
 *   SESSION_ID=xxx npx playwright test concept-management
 *
 * Behavioral assertions only — no dependence on a specific pre-existing row.
 */
import {test, expect} from "./fixtures";
import {ConceptManagementPage} from "./pages/ConceptManagementPage";

test.describe("Concept Management", () => {
    test("loads the list page with header and at least one row", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        await expect(page.getByRole("columnheader", {name: "CONCEPT NAME"})).toBeVisible();
        await expect(concepts.dataRows().first()).toBeVisible();
    });

    test("search by R&D Lead yields no rows for a non-existent value, clear restores", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        await concepts.searchRdLead(`zzz-no-such-lead-${Date.now()}`);
        await expect(concepts.dataRows()).toHaveCount(0);
        await concepts.clearSearch();
        await expect(concepts.dataRows().first()).toBeVisible();
    });

    test("create requires a name (validation)", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        const drawer = await concepts.openCreateDrawer();
        await drawer.getByRole("button", {name: "Save"}).click();
        await expect(page.getByText("Concept Name is required", {exact: true})).toBeVisible();
    });

    test("create a concept", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        await concepts.createConcept(`e2e-${Date.now()}`);
    });

    test("edit drawer opens prefilled for the first row", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        const drawer = await concepts.openEditFirstRow();
        await expect(drawer.getByLabel("Concept Name")).not.toHaveValue("");
        await concepts.cancelDrawer();
    });

    test("Map Brand drawer opens for the first row", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        const drawer = await concepts.openMapBrandFirstRow();
        await expect(drawer.getByText("Brand Name")).toBeVisible();
        await concepts.cancelDrawer();
    });

    test("delete shows a confirmation dialog (cancelled)", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        await concepts.openDeleteConfirmThenCancel();
    });

    test("row actions expose Edit and Map Brand", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        const firstRow = concepts.dataRows().first();
        await expect(firstRow.getByRole("button", {name: "Edit"})).toBeVisible();
        await expect(firstRow.getByRole("button", {name: /Map Brand/})).toBeVisible();
    });

    test("create a concept, verify it appears, then delete it", async ({page}) => {
        const concepts = new ConceptManagementPage(page);
        await concepts.open();
        const name = `e2e-concept-${Date.now()}`;
        await concepts.createConcept(name);
        // Create does not auto-refresh the list; reload, then the newest row (sorted
        // by updated time) shows it — this is the create read-back.
        await concepts.open();
        await expect(concepts.row(name)).toBeVisible({timeout: 20000});
        await concepts.deleteConceptByName(name);
    });
});
