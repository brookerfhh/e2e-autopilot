import {Page, expect} from "@playwright/test";

/**
 * Page Object for the Item (ItemV2) admin page — create/edit food & menu items.
 * Shared by flows and future regression specs so selectors live in one place.
 */
export class ItemPage {
    constructor(private readonly page: Page) {}

    /** Navigate to the item list / create surface. */
    async goto(): Promise<void> {
        await this.page.goto("/ItemV2");
    }

    /** Open the create dialog and pick the item category + type. */
    async startCreate(category: string, type: string): Promise<void> {
        await this.page.getByRole("button", {name: "Create New"}).click();
        await this.page.getByRole("button", {name: category}).click();
        await this.page.getByRole("button", {name: type, exact: true}).click();
    }

    /**
     * Open "Create New" and pick the object type via one or more buttons.
     * Some types are two-step (e.g. "Menu" → "Food"); others are a single button ("HDR Consumable").
     */
    async createNewOfType(...buttons: string[]): Promise<void> {
        await this.page.getByRole("button", {name: "Create New"}).click();
        for (const b of buttons) {
            await this.page.getByRole("button", {name: b, exact: true}).click();
        }
    }

    async fillName(name: string): Promise<void> {
        const field = this.page.getByRole("textbox", {name: "* Item Name"});
        await field.click();
        await field.fill(name);
    }

    /**
     * Select an option in a required combobox. `label` matches the field (its accessible name also
     * carries a trailing "info-circle" from the info icon, so pass a regex like /State/).
     * Ant Design options expose the value as a `title` attr (and as text); it also renders a hidden
     * measurement copy, so we match title-or-text and scope to the visible one.
     */
    async selectCombo(label: string | RegExp, option: string): Promise<void> {
        await this.page.getByRole("combobox", {name: label}).click();
        await this.page
            .getByTitle(option, {exact: true})
            .or(this.page.getByText(option, {exact: true}))
            .filter({visible: true})
            .first()
            .click();
    }

    /**
     * Select an option in a required combobox by clicking the actual Ant dropdown OPTION element
     * (`.ant-select-item-option[title=...]`) scoped to the open dropdown. Use this instead of
     * selectCombo when the app renders a duplicate text node (e.g. a web-ui-kit preview div) with the
     * same label — that duplicate can win a plain getByText match and sit BEHIND the real option, so
     * the click is intercepted (seen on the Packaged item's "Object Sub-Type"). Matching the option's
     * `title` attr targets the real, clickable option unambiguously.
     */
    async selectComboOption(label: string | RegExp, option: string): Promise<void> {
        await this.page.getByRole("combobox", {name: label}).click();
        await this.page
            .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
            .locator(`.ant-select-item-option[title="${option}"]`)
            .filter({visible: true})
            .first()
            .click();
    }

    async save(): Promise<void> {
        await this.page.getByRole("button", {name: "Save"}).click();
    }

    /**
     * Confirm a create dialog whose submit button is "Next" rather than "Save" (e.g. Ingredient).
     * Dialog-scoped so it doesn't match a page-level "Next".
     */
    async confirmCreateNext(): Promise<void> {
        await this.page.getByRole("dialog").getByRole("button", {name: "Next", exact: true}).click();
    }

    /** Wait until no Ant Design loading spinner is active (its overlay intercepts clicks). */
    async waitForIdle(): Promise<void> {
        await this.page
            .waitForFunction(() => !document.querySelector(".ant-spin-spinning"), null, {timeout: 20000})
            .catch(() => {});
    }

    /** Type a query into Smart Search and run the search. */
    async search(query: string): Promise<void> {
        const box = this.page.getByRole("combobox", {name: "Smart Search"});
        await box.click();
        await box.fill(query);
        await this.page.getByRole("button", {name: "Search"}).click();
        await this.waitForIdle();
    }

    /** The result row link for an exact item name. */
    resultLink(name: string) {
        return this.page.getByRole("link", {name, exact: true});
    }

    /** Open a search result by exact name (navigates to the item detail page). */
    async openResult(name: string): Promise<void> {
        await this.waitForIdle(); // the results grid spinner overlay can intercept the click
        await this.resultLink(name).click();
    }

    /**
     * Navigate to an item's detail page by the strongest identifier available:
     *   url        → goto directly (exact version, no search, no indexing lag)  ← preferred
     *   itemNumber → Smart Search the number, open the matching result
     *   name       → Smart Search the name, open the matching result
     * A `url` is what create* flows return, so composed flows should thread that.
     */
    async openItem(target: {url?: string; itemNumber?: string; name?: string}): Promise<void> {
        if (target.url) {
            // reuse the page if we're already on this item's detail page (share the load across
            // consecutive detail-page operations); otherwise navigate.
            const vid = new URL(target.url).searchParams.get("version_id");
            const alreadyHere = !!vid && this.page.url().includes(vid) && this.page.url().includes("/ItemV2/detail/");
            if (!alreadyHere) {
                await this.page.goto(target.url);
            }
            await this.waitForIdle();
            return;
        }
        const query = target.itemNumber ?? target.name;
        if (!query) {
            throw new Error("openItem needs one of: url, itemNumber, name");
        }
        await this.search(query);
        await this.resultLink(query).click();
    }

    /**
     * Delete the item currently open on its detail page:
     * Actions menu → Delete This Item → confirm "Delete" in the dialog.
     *
     * The Action
     * s dropdown is race-prone: clicking "Delete This Item" while the menu is still
     * animating sometimes fails to open the confirm dialog. So we retry opening the menu until the
     * dialog appears, then click the dialog-scoped Delete and wait for the dialog to close (commit).
     */
    async deleteFromDetail(): Promise<void> {
        const dialog = this.page.getByRole("dialog");
        for (let attempt = 1; attempt <= 3; attempt++) {
            await this.page.getByRole("button", {name: "Actions"}).click();
            const menuItem = this.page.getByRole("button", {name: "Delete This Item"});
            await menuItem.waitFor({state: "visible", timeout: 10000});
            await menuItem.click();
            try {
                await dialog.waitFor({state: "visible", timeout: 5000});
                break; // confirm dialog opened
            } catch {
                if (attempt === 3) {
                    throw new Error("Delete confirm dialog did not appear after 3 attempts");
                }
                // menu click didn't trigger the dialog — loop and reopen Actions
            }
        }
        await dialog.getByRole("button", {name: "Delete", exact: true}).click();
        await dialog.waitFor({state: "hidden", timeout: 20000});
    }

    /**
     * Open the Components (Bill of Materials) editor on the item detail page.
     * The editor is behind an icon-only pencil button with no accessible name; it sits right after
     * the section's "Service Setting" button (which is unique to the BOM section), so we anchor to
     * that and take its following sibling.
     */
    async openBomEditor(): Promise<void> {
        const svc = this.page.getByRole("button", {name: "Service Setting"});
        await svc.waitFor({state: "visible", timeout: 20000});
        await svc.locator("xpath=following-sibling::button[1]").click();
    }

    /**
     * Add a component to the BOM: click "Add component", search the component by name, pick the
     * matching row, set its usage, and confirm with "Add". (Caller saves afterwards.)
     */
    async addComponent(componentName: string, usage: string): Promise<void> {
        await this.page.getByRole("button", {name: "Add component"}).click();
        const search = this.page.getByRole("textbox", {name: "Search by Name or Item Number"});
        await search.click();
        // fill (one shot) then click Search — the box does LIVE search on each keystroke, so typing
        // char-by-char fired a search per character (~N redundant searches + the list re-rendering /
        // scrolling each time). The explicit Search button triggers the one real search.
        await search.fill(componentName);
        await this.page.getByRole("button", {name: "Search", exact: true}).last().click();

        // The component search backend is slow (~6s) — wait for the matching result row to appear,
        // then select it via its item-number cell (a 6+ digit code). The name cell is a link that
        // navigates away, so we must not click it. Selecting the row enables "Next".
        const row = this.page.getByRole("row", {name: new RegExp(componentName)});
        await row.first().waitFor({state: "visible", timeout: 30000});
        await row.first().getByRole("cell").filter({hasText: /^\d{6,}$/}).first().click();

        // Next → the usage step (component + Version + Usage input appear).
        await this.page.getByRole("button", {name: "Next", exact: true}).click();
        const usageBox = this.page
            .getByRole("textbox", {name: "Usage"})
            .or(this.page.getByPlaceholder("enter.."))
            .first();
        await usageBox.click();
        await usageBox.fill(usage);
        await this.page.getByRole("button", {name: "Add", exact: true}).click();
    }

    /** A Components (BOM) table row for a component name (for post-save verification). */
    componentRow(componentName: string) {
        return this.page.getByRole("row", {name: new RegExp(componentName)});
    }

    /** Open the "Edit Packaged SKUs" modal via the Packaged SKUs section's edit pencil (scoped to #PACKAGE_SKU). */
    async openPackageSkuEditor(): Promise<void> {
        await this.dismissAnyModal();
        const section = this.page.locator("#PACKAGE_SKU");
        await section.scrollIntoViewIfNeeded().catch(() => {});
        await this.waitForIdle();
        await section.getByRole("button").filter({hasText: /^$/}).first().click();
        await this.page.getByRole("dialog").waitFor({state: "visible", timeout: 15000});
    }

    /**
     * Select `value` in a Packaged-SKU column select, matched by the input id SUFFIX (e.g.
     * "service_locations" | "smallware_tool" | "pan_size"). The id prefix is dynamic and the search
     * input is covered by the selection display, so click the `.ant-select` container; then pick the
     * option by exact text in the open dropdown. Escape closes it (service_locations is multi-select).
     */
    async selectPackageSkuField(suffix: string, value: string): Promise<void> {
        // The option in the open dropdown, matched by visible text (option class varies between select
        // types; Ant also renders a hidden measurement copy, so filter to the visible one).
        const option = this.page
            .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")
            .getByText(value, {exact: true})
            .filter({visible: true})
            .first();
        // Opening these Ant selects is flaky (multi vs single differ; the search input is covered by
        // the display span). Force-click the input to open; if the option doesn't show, close & retry.
        for (let attempt = 1; attempt <= 3; attempt++) {
            await this.page.locator(`input[id$="${suffix}"]`).first().click({force: true});
            if (await option.waitFor({state: "visible", timeout: 5000}).then(() => true).catch(() => false)) {
                break;
            }
            await this.page.keyboard.press("Escape").catch(() => {});
            if (attempt === 3) throw new Error(`Package SKU option "${value}" not found for ${suffix}`);
        }
        await this.page.waitForTimeout(300); // let the dropdown animation settle
        await option.click({force: true}); // the list flickers/animates — force past the stability check
        await this.page.keyboard.press("Escape"); // close (service locations is multi-select)
    }

    /**
     * Wait until no Ant modal overlay (`.ant-modal-wrap`) is visible. A just-closed modal's overlay
     * lingers a beat and intercepts the next click — harmless when we navigate between steps (the
     * reload clears it) but a real hazard now that consecutive detail-page ops REUSE the page.
     */
    async waitForNoModal(): Promise<void> {
        await this.page
            .waitForFunction(
                () => !Array.from(document.querySelectorAll(".ant-modal-wrap")).some(
                    w => window.getComputedStyle(w as Element).display !== "none"),
                null,
                {timeout: 8000},
            )
            .catch(() => {});
    }

    /**
     * Actively dismiss any lingering/visible modal overlay by pressing Escape (Ant closes modals on
     * Escape). Call before opening a NEW modal when we've reused the page — a prior step's overlay
     * can otherwise intercept the click. Safe because it's only called when no modal should be open.
     */
    async dismissAnyModal(): Promise<void> {
        for (let i = 0; i < 3; i++) {
            if ((await this.page.locator(".ant-modal-wrap:visible").count()) === 0) return;
            await this.page.keyboard.press("Escape");
            await this.page.waitForTimeout(400);
        }
    }

    /** Fill the "Out of Stock Name" field (its accessible name carries a trailing "info-circle"). */
    async fillOutOfStockName(value: string): Promise<void> {
        await this.page.getByRole("textbox", {name: /Out of Stock Name/}).fill(value);
    }

    /** Publish the current version: click "Publish Version", then confirm "Publish". */
    async publishVersion(): Promise<void> {
        await this.dismissAnyModal();
        await this.page.getByRole("button", {name: "Publish Version"}).click();
        const confirm = this.page.getByRole("button", {name: "Publish", exact: true});
        await confirm.waitFor({state: "visible", timeout: 15000});
        await confirm.click();
    }

    /** Open the "Service Setting" modal (on the item detail page). */
    async openServiceSetting(): Promise<void> {
        await this.dismissAnyModal(); // a prior step's modal overlay can still intercept the click
        await this.page.getByRole("button", {name: "Service Setting"}).click();
        await this.page.getByRole("dialog").waitFor({state: "visible", timeout: 15000});
    }

    /** Read an Ant switch's on/off state by element id. */
    async switchIsOn(id: string): Promise<boolean> {
        const sw = this.page.locator(`#${id}`);
        await sw.waitFor({state: "visible", timeout: 15000});
        return (await sw.getAttribute("aria-checked")) === "true";
    }

    /**
     * Read a switch's SETTLED state — on a fresh page load the switch renders its default (off)
     * for ~1–2s before the loaded value hydrates, so an immediate read false-negatives. Poll until
     * it reads on (returns true), or return false after the window (a genuinely-off switch never
     * spuriously flips on). Use this for post-save verification.
     */
    async switchIsOnSettled(id: string): Promise<boolean> {
        const sw = this.page.locator(`#${id}`);
        await sw.waitFor({state: "visible", timeout: 15000});
        // hydration flips the value shortly after load; poll fine-grained (~1.6s window) so we return
        // the instant it reads on, rather than waiting out a coarse tick
        for (let i = 0; i < 8; i++) {
            if ((await sw.getAttribute("aria-checked")) === "true") return true;
            await this.page.waitForTimeout(200);
        }
        return false;
    }

    /**
     * Set an Ant switch (by id) to a desired state — idempotent (only clicks when it differs).
     * Reads the SETTLED state (the switch can render its default before the saved value hydrates),
     * so a set-to-false on an already-true switch isn't mistakenly skipped.
     */
    async setSwitch(id: string, desired: boolean): Promise<void> {
        if ((await this.switchIsOnSettled(id)) !== desired) {
            await this.page.locator(`#${id}`).click();
        }
    }

    /**
     * Fill the Edit Nutrition page's standard nutrient values with "0". Their displayed "0" is a
     * placeholder ("---") until actually entered; entering values is what lets "Nutrition Reviewed"
     * save (otherwise the app blocks the save). Idempotent, and skips any input not present.
     */
    async fillNutrientsZero(): Promise<void> {
        const ids = [
            "basic_calories_k_cal", "basic_total_fat_g", "basic_saturated_fat_g", "basic_trans_fat_g",
            "basic_cholesterol_mg", "basic_sodium_mg", "basic_carbs_g", "basic_fiber_g", "basic_sugar_g",
            "basic_add_sugar_g", "basic_protein_g", "basic_vitamin_d_mcg", "basic_calcium_mg",
            "basic_iron_mg", "basic_potassium_mg",
        ];
        for (const id of ids) {
            const inp = this.page.locator(`#${id}`);
            if ((await inp.count()) === 0) continue;
            await inp.fill("0");
        }
    }

    /**
     * Read the currently-selected value shown in an Ant combobox (by the field's accessible name).
     * The selected value renders in the `.ant-select-selection-item` inside the `.ant-select` wrapper
     * (its `title` attr holds the value; text is the fallback). Returns "" if nothing is selected.
     */
    async comboSelectedText(label: string | RegExp): Promise<string> {
        const combo = this.page.getByRole("combobox", {name: label});
        const sel = combo
            .locator("xpath=ancestor::div[contains(@class,'ant-select')][1]")
            .locator(".ant-select-selection-item")
            .first();
        if ((await sel.count()) === 0) return "";
        const title = await sel.getAttribute("title");
        if (title) return title.trim();
        return (await sel.innerText().catch(() => "")).trim();
    }

    /** Save the currently-open modal dialog and wait for it (and its overlay) to close. */
    async saveDialog(): Promise<void> {
        const dialog = this.page.getByRole("dialog");
        await dialog.getByRole("button", {name: "Save"}).click();
        await dialog.waitFor({state: "hidden", timeout: 20000});
        await this.waitForNoModal();
    }

    /** Cancel/close the currently-open modal dialog and wait for it (and its overlay) to close. */
    async cancelDialog(): Promise<void> {
        const dialog = this.page.getByRole("dialog");
        await dialog.getByRole("button", {name: "Cancel"}).click().catch(() => {});
        await dialog.waitFor({state: "hidden", timeout: 15000}).catch(() => {});
        await this.waitForNoModal();
    }

    /**
     * Open a detail-page card's edit modal via its header edit pencil. The pencils are icon-only
     * (no accessible name), so we anchor to the card heading and click the left-most icon button on
     * the heading's row that sits to its right (viewport-independent — works headed or headless).
     */
    /** Jump to a detail-page section via its left-rail icon (accessible name, e.g. "info-circle", "heart"). */
    async gotoSection(railIcon: string): Promise<void> {
        await this.page.getByRole("link", {name: railIcon}).click();
        await this.waitForIdle();
    }

    /**
     * Click a card's header edit pencil (icon-only, no accessible name) by anchoring to the card
     * heading and clicking the left-most icon button on the heading's row to its right
     * (viewport-independent). Does NOT wait for any editor — some cards open a modal, others an
     * inline/full-page editor.
     */
    async clickCardEditPencil(headingRe: RegExp): Promise<void> {
        await this.dismissAnyModal(); // a prior step's modal overlay can still intercept the pencil click
        const heading = this.page.getByText(headingRe).first();
        await heading.scrollIntoViewIfNeeded();
        await this.waitForIdle();
        const hb = await heading.boundingBox();
        if (!hb) throw new Error(`card heading not found: ${headingRe}`);
        const btns = this.page.getByRole("button").filter({hasText: /^$/});
        const n = await btns.count();
        let idx = -1;
        let minX = Infinity;
        for (let i = 0; i < n; i++) {
            const b = await btns.nth(i).boundingBox();
            if (b && Math.abs(b.y - hb.y) < 40 && b.x > hb.x + hb.width && b.x < minX) {
                minX = b.x;
                idx = i;
            }
        }
        if (idx < 0) throw new Error(`edit pencil not found for card: ${headingRe}`);
        await btns.nth(idx).click();
    }

    /** Open a card whose editor is a MODAL: click its edit pencil and wait for the dialog. */
    async openCardEditor(headingRe: RegExp): Promise<void> {
        await this.clickCardEditPencil(headingRe);
        await this.page.getByRole("dialog").waitFor({state: "visible", timeout: 15000});
    }

    /**
     * Whether the Concept multi-select has `value` as a selected tag. Selected values render as
     * custom tags (`.wonder-tag-text`) that hydrate a beat after the modal opens / after selecting,
     * so poll briefly — an immediate read false-negatives (both for the idempotency check and the
     * post-set verification).
     */
    async conceptHas(value: string): Promise<boolean> {
        const tag = this.page.locator(".wonder-tag-text", {hasText: value});
        // fine-grained poll (~1.2s window) — returns the instant the tag hydrates
        for (let i = 0; i < 8; i++) {
            if ((await tag.count()) > 0) return true;
            await this.page.waitForTimeout(150);
        }
        return false;
    }

    /**
     * Ensure `value` is selected in the Concept multi-select (idempotent — adds it if missing,
     * no-op if already a tag). Options live in the open dropdown (.ant-select-item-option-content);
     * we scope to the open dropdown so we match the option, not the already-selected tag.
     */
    async setConcept(value: string): Promise<boolean> {
        if (await this.conceptHas(value)) return false; // already selected — nothing to change
        await this.page.locator(".ant-select-selection-overflow").click();
        const dropdown = this.page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
        await dropdown.getByText(value, {exact: true}).first().click();
        await this.page.keyboard.press("Escape"); // close the dropdown
        return true;
    }

    /**
     * Read the created item's id from the URL after a save.
     * Item edit URLs carry a GUID (e.g. /ItemV2/<guid> or ?id=<guid>).
     * Returns "" if no GUID is present in the URL yet.
     */
    async readIdFromUrl(): Promise<string> {
        const guid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        await this.page.waitForURL(guid, {timeout: 20000}).catch(() => {});
        const m = this.page.url().match(guid);
        return m ? m[0] : "";
    }
}
