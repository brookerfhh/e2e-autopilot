/**
 * Page Object for the Item list + create flow (route /ItemV2).
 *
 * "Create New" opens a modal wizard. For an Ingredient the first step captures
 * Object Sub-Type, Unit Used in BOM and Item Name; clicking **Next** already
 * creates the item and navigates to its detail page (id in the URL) — there is
 * no separate final Save/Publish. This object exposes just enough to drive that
 * create step and read back the new id; extend it as regression cases need more.
 *
 * Recon source: Playwright codegen recording against QA 2026-07-03
 *   /ItemV2 → "Create New" → type "Ingredient" → Sub-Type → Unit → Item Name → Next.
 * AntD comboboxes: accessible names carry icon text (e.g. "info-circle"), so match
 * them by regex, and pick options from the *visible* dropdown by exact text.
 */
import {expect, Locator, Page} from "@playwright/test";

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CreateItemFields {
    /** Item name (required). */
    name: string;
    /** Object type button on the first wizard step, e.g. "Ingredient". */
    objectType: string;
    /** "Object Sub-Type" select, e.g. "Produce". */
    subType: string;
    /** "Unit Used in BOM" select, e.g. "g". */
    unit: string;
}

export class ItemPage {
    static readonly PATH = "/ItemV2";

    constructor(private readonly page: Page) {}

    // --- locators ---------------------------------------------------------
    createNewButton(): Locator {
        return this.page.getByRole("button", {name: "Create New"});
    }
    /** The create form dialog (appears after picking the object type). */
    private dialog(): Locator {
        return this.page.getByRole("dialog");
    }
    private nameInput(): Locator {
        return this.page.getByRole("textbox", {name: /Item Name/});
    }
    private visibleDropdown(): Locator {
        return this.page.locator(".ant-select-dropdown:visible");
    }

    // --- actions ----------------------------------------------------------
    async open(): Promise<void> {
        await this.page.goto(ItemPage.PATH); // baseURL from playwright.config.ts
        // Route is code-split (async import); a cold load can exceed the default timeout.
        await expect(this.createNewButton()).toBeVisible({timeout: 20000});
    }

    /** Pick an option (exact text) from the AntD select named by `comboboxName` (regex). */
    private async selectOption(comboboxName: RegExp, optionText: string): Promise<void> {
        await this.page.getByRole("combobox", {name: comboboxName}).click();
        const dropdown = this.visibleDropdown();
        await expect(dropdown).toBeVisible();
        // AntD dropdown plays an open animation; let it settle before clicking.
        await this.page.waitForTimeout(500);
        // NOTE: the option's role=option node is zero-width (accessible-name span), so
        // getByRole("option") reads as "not visible". Match the clickable
        // `.ant-select-item-option` by exact (trimmed, case-insensitive) text so "g"
        // doesn't match "kg"/"mg" and the CSS text-transform:uppercase is irrelevant.
        const exact = new RegExp(`^\\s*${escapeRegExp(optionText)}\\s*$`, "i");
        await dropdown.locator(".ant-select-item-option").filter({hasText: exact}).first().click();
        await expect(dropdown).toBeHidden();
    }

    /**
     * Run the Ingredient create wizard's first step and submit it (Next creates
     * the item). Returns the new item's id read from the detail URL it lands on.
     */
    async createIngredient(fields: CreateItemFields): Promise<string> {
        // "Create New" opens a type chooser (menu/popover); picking the type opens the form.
        await this.createNewButton().click();
        await this.page.getByRole("button", {name: fields.objectType, exact: true}).click();

        const dialog = this.dialog();
        await expect(dialog).toBeVisible({timeout: 20000});
        await this.selectOption(/Object Sub-Type/, fields.subType);
        await this.selectOption(/Unit Used in BOM/, fields.unit);
        await this.nameInput().fill(fields.name);

        // Next both creates the item and navigates to its detail page (/ItemV2/detail/basic/<id>).
        await dialog.getByRole("button", {name: "Next"}).click();
        await this.page.waitForURL(/\/ItemV2\/detail\//, {timeout: 20000});
        return this.readIdFromUrl();
    }

    /** Extract the numeric item id from the detail URL, e.g. /ItemV2/detail/basic/50015151?version_id=... */
    private readIdFromUrl(): string {
        const url = this.page.url();
        const match = url.match(/\/ItemV2\/detail\/[^/]+\/([^/?#]+)/);
        if (!match) {
            throw new Error(`createIngredient: could not read item id from URL "${url}"`);
        }
        return match[1];
    }
}
