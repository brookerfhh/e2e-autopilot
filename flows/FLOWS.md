# FLOWS — reusable data-setup / action flows (`flows/*.ts`)

Each `flows/*.ts` file is one **flow**: a parameterized function driving a real business flow via
Playwright. Selectors live in `flows/pages/*.ts` (Page Objects). This file is the **catalog** —
kept in sync with the `@flow` header at the top of each flow file (the header is the source of
truth; this file is its index).

Run any flow: `npx ts-node -P tsconfig.flows.json flows/_run.ts <flowName> [--headed] [--input '{...}']`
(needs `APP_URL` + `SESSION_ID` in the env).

## For the agent — read this before building or composing

- **Before recording a NEW flow**: scan this catalog to reuse Page Objects, keep naming consistent,
  and check whether part of the flow already exists.
- **To COMPOSE a longer flow** (e.g. "create → search → delete"): match one flow's **`Returns`** to
  another's **`Requires`** to order them and thread data. Write the combined flow as a new
  `flows/*.ts` with `@action composite`, give it a `@flow` header, and add it here too.

## Naming convention

- **create** flows are **entity-specific** (the create form differs per type): `createIngredientItem`,
  `createDraftMenuItem`, `createRecipeItem`.
- **search / delete / update** flows are **generic** (take an id/name, type-agnostic): `searchItem`,
  `deleteItem`, `updateItem`.

## Catalog

| Flow | Action | Target | Params (defaults) | Returns | Requires |
|------|--------|--------|-------------------|---------|----------|
| createDraftMenuItem | create | Item · Menu / Food | name?=`e2e-<ts>`, category?=`Menu`, type?=`Food` | `{ itemId, name }` | — |
| createDraftHdrConsumable | create | Item · HDR Consumable | name?=`e2e-<ts>`, state?=`Thawed`, unit?=`g` | `{ itemId, name }` | — |
| createIngredientItem | create | Item · Ingredient | name?=`e2e-<ts>`, unit?=`g` | `{ itemId, name, url }` | — |
| createRecipeItem | create | Item · Recipe | name?=`e2e-<ts>`, variant?=`Primary` | `{ itemId, name, url }` | — |
| createPackageItem | create | Item · Packaged | name?=`e2e-<ts>`, subType?=`Common Stock` | `{ itemId, name, url }` | — |
| searchItem | search | Item (generic) | query (exact name) | `{ found, itemId, name }` | name |
| deleteItem | delete | Item (Menu/Food; not HDR) | name (exact) | `{ deleted, name }` | name |
| createSearchDeleteItem | composite | Item · lifecycle | name?, category?, type? | `{ itemId, name, found, deleted }` | — |
| addComponentToItem | update | Item · BOM (add component) | itemName, componentName, usage?=`1` | `{ added, itemName, componentName }` | itemName + componentName |
| assembleMenuItemWithComponent | composite | Item · Menu + HDR Consumable assembly | usage?=`1` | `{ menu:{itemId,name,url}, component:{itemId,name,url}, added }` | — |
| setServiceSettingReviewed | update | Item · Service Setting (Reviewed switch) | url?\|itemNumber?\|name?, reviewed?=`true` | `{ reviewed }` | url OR itemNumber OR name |
| setItemConcept | update | Item · Item Information (Concept multi-select) | url?\|itemNumber?\|name?, concept | `{ set, concept }` | (url OR itemNumber OR name) + concept |
| setNutritionReviewed | update | Item · Nutrition (Nutrition Reviewed switch) | url?\|itemNumber?\|name?, reviewed?=`true` | `{ reviewed }` | url OR itemNumber OR name |
| setPackageSku | update | Item · Packaged SKUs (required selects) | url?\|itemNumber?\|name?, serviceLocation?=`N/A`, smallwareTool?=`N/A`, panSize?=`N/A` | `{ serviceLocation, smallwareTool, panSize }` | url OR itemNumber OR name (item must have a packaged SKU) |
| publishHdrConsumable | update | Item · HDR Consumable (fill Out of Stock Name + Publish) | url?\|itemNumber?\|name?, outOfStockName?=`e2e-oos` | `{ published, outOfStockName }` | url OR itemNumber OR name (a DRAFT/unpublished version) |
| assembleFullMenuItem | composite | Item · fully-configured Menu item | concept?=`2PRs Fred's`, usage?=`1` | `{ menu, component, added, conceptSet, serviceReviewed, nutritionReviewed }` | — |
| publishMenuItem | update | Item · Menu (publish version) | url?\|itemNumber?\|name? | `{ published }` | url OR itemNumber OR name (fully-configured DRAFT) |
| buildFullMenuItem | composite | Item · full DRAFT Menu around an existing component | **component** (number/name, required), concept?, usage?, verify? | `{ menu, component, added, conceptSet, serviceReviewed, nutritionReviewed, packageSku }` | an existing (published) `component` item |

---

<!-- Add one detail section per flow below, taken from its `@flow` header. Template:

## <flowName>
- **File**: `flows/<flowName>.ts`  ·  **Pages**: `<X>Page`
- **Action / Target**: <create|search|delete|update|composite> · <entity + variant>
- **Params**: <name?, ... with defaults>
- **Returns**: <{ ...ids/objects this flow PRODUCES }>
- **Requires**: <ids/names it CONSUMES from other flows, or — for entry points>
- **Composes into**: <which longer flows can use this one>
- **Side effects**: <persistent data on the app? teardown available?>
- **Gotchas**: <anything worth carrying forward>
-->

## createDraftMenuItem
- **File**: `flows/createDraftMenuItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: create · Item (Menu / Food)
- **Params**: `name?` (default `e2e-<ts>`), `category?` (default `Menu`), `type?` (default `Food`)
- **Returns**: `{ itemId: string, name: string }` — `itemId` is the GUID read from the edit URL after Save
- **Requires**: — (entry point)
- **Composes into**: a future `searchItem` (consumes `name`) / `deleteItem` (consumes `itemId`) lifecycle
- **Side effects**: persistent — creates a real item on QA; no teardown (unique `e2e-*` name avoids collisions)
- **Gotchas**: start page is `/ItemV2` (not `/items`). Create flow = **Create New → pick category → pick type → fill `* Item Name` → Save**. The created id is parsed from the GUID in the post-save URL; if the app ever stops navigating to the edit URL, `itemId` will come back empty.

## createDraftHdrConsumable
- **File**: `flows/createDraftHdrConsumable.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: create · Item (HDR Consumable)
- **Params**: `name?` (default `e2e-<ts>`), `state?` (default `Thawed`), `unit?` (default `g`)
- **Returns**: `{ itemId: string, name: string }` — `itemId` is the `version_id` GUID from the post-save URL
- **Requires**: — (entry point)
- **Composes into**: `searchItem` can find it by name; **`deleteItem` does NOT apply** (see side effects)
- **Side effects**: persistent — creates a real item on QA. **No teardown**: HDR Consumable items have no "Delete This Item" action (their Actions menu only offers Recalculate / Generate Frozen / **Dormant Item**), so they cannot be removed the way Menu/Food items can.
- **Gotchas**: single-button object type (`Create New → HDR Consumable`, not the two-step `Menu → Food`). Two extra required comboboxes — `* State` and `* Unit Used in BOM` — selected via `ItemPage.selectCombo()`, which matches the **visible** option by `title`/text (Ant renders a hidden measurement copy that a plain `getByRole("option")` wrongly grabs). Save is below the modal fold but Playwright auto-scrolls to it. Detail URL path differs from Menu/Food: `/ItemV2/hdr-consumable/detail/<code>?version_id=<guid>`.

## createIngredientItem
- **File**: `flows/createIngredientItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: create · Item (Ingredient)
- **Params**: `name?` (default `e2e-<ts>`), `unit?` (default `g`)
- **Returns**: `{ itemId: string, name: string, url: string }` — `itemId` is the `version_id` GUID from the post-save URL; `url` is the clickable detail-page link
- **Requires**: — (entry point)
- **Composes into**: `searchItem` can find it by name; can be a BOM component via `addComponentToItem`. `deleteItem` applicability is untested for this type (Menu/Food have "Delete This Item"; HDR does not).
- **Side effects**: persistent — creates a real DRAFT item on QA; no teardown (unique `e2e-*` name avoids collisions)
- **Gotchas**: single-button object type (`Create New → Ingredient`, not the two-step `Menu → Food`), so it uses `createNewOfType("Ingredient")`. One extra required combobox — `* Unit Used in BOM` — via `ItemPage.selectCombo()` (matches the **visible** option by `title`/text; Ant renders a hidden measurement copy a plain `getByRole("option")` grabs). The create dialog's submit button is **"Next"**, not "Save" — committed via `ItemPage.confirmCreateNext()` (dialog-scoped). "Next" navigates straight to the detail page whose URL carries the `version_id` GUID (`readIdFromUrl`); if the app ever stops navigating there, `itemId` comes back empty.

## createRecipeItem
- **File**: `flows/createRecipeItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: create · Item (Recipe)
- **Params**: `name?` (default `e2e-<ts>`), `variant?` (default `Primary`)
- **Returns**: `{ itemId: string, name: string, url: string }` — `itemId` is the `version_id` GUID from the post-save detail URL; `url` is the clickable detail-page link
- **Requires**: — (entry point)
- **Composes into**: `searchItem` can find it by name; can be a BOM component via `addComponentToItem`
- **Side effects**: persistent — creates a real DRAFT item on QA; no teardown (unique `e2e-*` name avoids collisions)
- **Gotchas**: **two-step** object type — `Create New → Recipe → <variant>` (recorded variant = **"Primary"**) via `createNewOfType("Recipe", variant)`, mirroring `createDraftMenuItem`'s Menu→Food. Unlike Ingredient/HDR, the create form has **no extra required combobox** — just `* Item Name` then the **"Save"** button (not "Next"). Detail URL is `/ItemV2/detail/basic/<number>?version_id=<guid>`; id read via `readIdFromUrl`. Verified 2026-07-17 (created item #80114091 on QA).

## createPackageItem
- **File**: `flows/createPackageItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: create · Item (Packaged)
- **Params**: `name?` (default `e2e-<ts>`), `subType?` (default `Common Stock`)
- **Returns**: `{ itemId: string, name: string, url: string }` — `itemId` is the `version_id` GUID from the post-save detail URL; `url` is the clickable detail-page link
- **Requires**: — (entry point)
- **Composes into**: `searchItem` can find it by name; can be a BOM component via `addComponentToItem`
- **Side effects**: persistent — creates a real DRAFT item on QA; no teardown (unique `e2e-*` name avoids collisions)
- **Gotchas**: **single-button** object type — the menu label is **"Packaged"** (not "Package"), so `createNewOfType("Packaged")`, one step (like Ingredient/HDR). One extra required combobox — **`* Object Sub-Type`** (recorded value **"Common Stock"**). Selected via **`ItemPage.selectComboOption`**, NOT `selectCombo`: the app renders a duplicate `web-ui-kit` text node with the same label that wins a plain getByText match and sits *behind* the real Ant option, so the click is intercepted — matching the option's `title` attr targets the real clickable option. Submits with **"Save"** (not "Next"). Detail URL `/ItemV2/detail/basic/<number>?version_id=<guid>`. Verified 2026-07-17 (created item #88047921 on QA).

## addComponentToItem
- **File**: `flows/addComponentToItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · Item BOM (add a component to another item's Bill of Materials)
- **Params**: `itemName` (required — target item), `componentName` (required — item to add), `usage?` (default `1`)
- **Returns**: `{ added: boolean, itemName, componentName }` — `added` = the component row is present after save
- **Requires**: `itemName` + `componentName` — composes **two** producers: a name from a `create*` flow (target) AND a name from another `create*` flow (component, e.g. `createDraftHdrConsumable`)
- **Composes into**: a create→create→assemble→verify pipeline (e.g. `createDraftMenuItem` + `createDraftHdrConsumable` → `addComponentToItem`)
- **Side effects**: persistent — mutates the target item's BOM on QA; no teardown
- **Gotchas** (this flow was fiddly — several non-obvious steps):
  - Reach the target via search-by-name; the **detail page body loads after navigation**, so wait before editing.
  - The **BOM editor** is behind an **icon-only pencil** with no accessible name — anchored via the section's unique **"Service Setting"** button (`openBomEditor`), taking its following-sibling button.
  - "Add component" opens a dialog with a **slow (~6s) backend search**; type with `pressSequentially` (a plain `fill` doesn't fire the live-search events), click **Search**, then **wait for the result row** to appear.
  - **Select** the result by clicking its **item-number cell** (6+ digit code), NOT the name cell (a link that navigates away). Selecting enables **"Next"**.
  - After **Next**, a **Usage** input (placeholder `enter..`) appears; fill it, then click **"Add"** (`exact` — else it matches "Add component"), then the page-level **Save**.
  - **Verification**: the BOM row renders a beat after Save, so the post-save check uses `waitFor({state:"visible"})`, NOT `isVisible()` (which returns the instantaneous state and does not wait → false-negative `added:false`).

## assembleMenuItemWithComponent
- **File**: `flows/assembleMenuItemWithComponent.ts`  ·  **Pages**: `ItemPage` (via the base flows)
- **Action / Target**: composite · create a Menu item + an HDR Consumable, then link them as a BOM component
- **Params**: `usage?` (default `1`, forwarded to `addComponentToItem`)
- **Returns**: `{ menu: {itemId,name,url}, component: {itemId,name,url}, added }` — each `url` is the item's full detail-page link (clickable)
- **Requires**: — (entry point)
- **Composes**: `createDraftMenuItem` + `createDraftHdrConsumable` → `addComponentToItem`
- **Side effects**: persistent — creates a menu item + an HDR consumable and links them; no teardown (HDR can't be deleted; the menu item can via `deleteItem`)
- **Gotchas**: absorbs the fresh menu item's Smart Search **indexing lag** by polling `searchItem` (up to 6× / 3s) before assembling. `createDraftMenuItem` / `createDraftHdrConsumable` now also return `url` (captured from the post-save detail page) so callers get clickable links.

## setServiceSettingReviewed
- **File**: `flows/setServiceSettingReviewed.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · Item's "Service Setting" modal → the "Service Setting Reviewed" switch
- **Params**: one of `url` / `itemNumber` / `name` (how to reach the item), `reviewed?` (default `true`)
- **Returns**: `{ reviewed: boolean }` — the switch state read back after save (verifies persistence)
- **Requires**: `url` OR `itemNumber` OR `name` — prefer a `url` from a `create*` flow (direct, exact version)
- **Composes into**: create→configure pipelines (e.g. `createDraftMenuItem` → set its Service Setting)
- **Side effects**: persistent — flips the item's Service Setting Reviewed flag on QA
- **Gotchas**: reaches the item via **`ItemPage.openItem`** (url→goto / number→search / name→search — the shared, url-first entry for update flows). The switch is the Ant `#basic_reviewed` toggle **inside the "Service Setting" modal**; use **`setSwitch(id, desired)`** which is **idempotent** (reads `aria-checked`, clicks only if it differs — a blind click would flip a already-correct value). Save is **dialog-scoped** (`saveDialog`) to avoid the page-level Save. Verification reopens the modal and reads the persisted state. The recording's leading "unordered-list" nav click was incidental — Service Setting is directly clickable, so it was dropped.

## setItemConcept
- **File**: `flows/setItemConcept.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · Item Information card ("Edit Item" modal) → the **Concept** multi-select
- **Params**: one of `url` / `itemNumber` / `name`, plus `concept` (required — the concept option's visible label)
- **Returns**: `{ set: boolean, concept }` — whether the concept tag is present (read in-editor)
- **Requires**: `(url OR itemNumber OR name)` + `concept`
- **Composes into**: create→configure pipelines (e.g. `createDraftMenuItem` → set its Concept)
- **Side effects**: persistent — adds a Concept to the item on QA
- **Gotchas** (shared card-edit machinery lives in `ItemPage`):
  - `openCardEditor(/Item Information/)` opens the card's **icon-only edit pencil** by anchoring to the card heading and clicking the **left-most icon button to its right on the same row** (viewport-independent — no fragile global `nth()`).
  - Concept is an **Ant multi-select**: selected values are custom **`.wonder-tag-text` tags** (NOT inside `.ant-select-selection-overflow`), so `conceptHas` checks those; options live in the **open dropdown** (`.ant-select-dropdown:not(.ant-select-dropdown-hidden)`) and are matched by **visible text** (their `title` is an opaque key). `setConcept` is **idempotent** and returns whether it changed anything.
  - **No-op Save doesn't close the modal** → the flow **Saves only when something changed, else Cancels**. Both `saveDialog`/`cancelDialog` **wait for the dialog to be hidden** (else the lingering `.ant-modal-wrap` overlay intercepts the next click). Verification reads the tag **in-editor before closing** (a reopen-to-verify is fragile against the closing overlay).

## setNutritionReviewed
- **File**: `flows/setNutritionReviewed.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · Item's **Edit Nutrition page** → the "Nutrition Reviewed" switch
- **Params**: one of `url` / `itemNumber` / `name`, `reviewed?` (default `true`)
- **Returns**: `{ reviewed: boolean }` — the **real** persisted switch state (reopened after save)
- **Requires**: `url` OR `itemNumber` OR `name`
- **Composes into**: create→configure pipelines
- **Side effects**: persistent — sets the item's Nutrition Reviewed flag on QA
- **`reviewed=true` WORKS** — but the app requires the **Item Nutrients to be entered** first (their shown "0" is only a placeholder → `fillNutrientsZero`; a no-component item otherwise errors `"Unable to calculate item nutrition. Item has no components."`). Editing a nutrient **auto-un-reviews**, so the switch is toggled **LAST, right before Save**. ⚠️ This **overwrites nutrient values with 0** (fine for test data, destructive for real nutrition).
- **`reviewed=false` limitation**: un-reviewing an *already-reviewed* item does **not** reliably persist via this flow. The flow **never fakes success** — it reopens and returns the real state.
- **Gotchas**: reaches the editor by the **direct URL** `/ItemV2/nutrition_allergen/<number>/<versionId>` (derived from the detail URL) — robust vs the recorded left-rail "heart" nav + a fragile card pencil (Nutrition edits are a full PAGE, not a modal). The switch **renders its default (off) then hydrates the saved value ~1-2s after load**, so all switch reads use **`switchIsOnSettled`** (poll) — a plain read false-negatives (this caused a long red-herring where saves actually succeeded but verification reported false). `saveNutrition` retries past the transient `"Calculating nutrition data, please save later."` toast.

## assembleFullMenuItem
- **File**: `flows/assembleFullMenuItem.ts`  ·  **Pages**: `ItemPage` (via the base flows)
- **Action / Target**: composite · seed a **fully-configured Menu item** end-to-end
- **Params**: `concept?` (default `2PRs Fred's`), `usage?` (default `1`)
- **Returns**: `{ menu, component, added, conceptSet, serviceReviewed, nutritionReviewed }` (each item has `{itemId,name,url}`)
- **Requires**: — (entry point)
- **Composes**: `assembleMenuItemWithComponent` (createDraftMenuItem + createDraftHdrConsumable + addComponentToItem) → `setItemConcept` → `setServiceSettingReviewed` → `setNutritionReviewed`. The three update steps reach the item directly via `menu.url` (exact version, no search lag).
- **Side effects**: persistent — creates 2 items, links them, flips concept + 2 review flags on QA.
- **Gotchas**: verified all-green end-to-end. NOTE the shared **late-hydration** lesson — several switches/tags render their default before the saved value loads (~1-2s), so verification reads MUST poll (`switchIsOnSettled`, polling `conceptHas`) and concept verifies via a fresh reopen; earlier in-editor/immediate reads caused persistent false-negatives even though the data had saved.

## setPackageSku
- **File**: `flows/setPackageSku.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · "Edit Packaged SKUs" modal → the per-SKU required selects
- **Params**: one of `url`/`itemNumber`/`name`; `serviceLocation?`, `smallwareTool?`, `panSize?` (each default `N/A`)
- **Returns**: `{ serviceLocation, smallwareTool, panSize }` (the values set)
- **Requires**: a reachable item that **already has a packaged SKU** (i.e. a component) — else there's no SKU row to configure
- **Composes into**: the full menu-item setup pipeline (after `addComponentToItem`)
- **Side effects**: persistent — sets the packaged-SKU required fields on QA
- **Gotchas** (this Ant table of selects was finicky):
  - Packaged SKUs section has a stable id **`#PACKAGE_SKU`**; its edit pencil is scoped there (`openPackageSkuEditor`).
  - The 3 column selects are matched by input **id SUFFIX** (`service_locations` / `smallware_tool` / `pan_size`) — the prefix is dynamic per SKU.
  - Open each by **force-clicking the search input** (`click({force:true})`) — the input is visually covered by the "No Selection" display span, and the container/selector click doesn't reliably open the multi-select. Pick the option by **visible text** in the open dropdown, filtered to **`:visible`** (Ant renders a hidden measurement copy that a plain match grabs). `N/A` is a valid non-empty value for all three.
  - Opening is **flaky** (multi vs single differ): `selectPackageSkuField` **retries the open** (up to 3×) until the option shows, then **force-clicks the option** (the multi-select list animates/flickers, so a normal click fails the stability check).

## publishHdrConsumable
- **File**: `flows/publishHdrConsumable.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · fill the required "Out of Stock Name" on an HDR Consumable, then Publish the version
- **Params**: one of `url`/`itemNumber`/`name`; `outOfStockName?` (default `e2e-oos`)
- **Returns**: `{ published: boolean, outOfStockName }`
- **Requires**: a **DRAFT/unpublished** version — once published, the "Publish Version" button is gone (running it again times out looking for the button).
- **Composes into**: end-of-pipeline finalize step for an HDR consumable
- **Side effects**: **persistent + hard to undo** — sets a field and PUBLISHES the version on QA.
- **Gotchas**: "Out of Stock Name" is a required ("missing field") text input in the Item Information (Edit Item) modal — publish is blocked until it's filled; its accessible name carries a trailing "info-circle" so match by `/Out of Stock Name/`. Edit via the shared `openCardEditor(/Item Information/)`; publish = **"Publish Version"** then confirm **"Publish"** (exact). Test on a FRESH item each time (publish is one-way).

## publishMenuItem
- **File**: `flows/publishMenuItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: update · publish a menu item's version ("Publish Version" → confirm "Publish")
- **Params**: one of `url`/`itemNumber`/`name`
- **Returns**: `{ published: boolean }`
- **Requires**: a **DRAFT** version complete enough to publish (fully configured); button disappears once published.
- **Side effects**: persistent + hard to undo. **Gotchas**: reuses `ItemPage.publishVersion()` (same control as HDR). No fields to fill for a fully-configured menu; an under-configured one is blocked by app validation.

## buildFullMenuItem
- **File**: `flows/buildFullMenuItem.ts`  ·  **Pages**: `ItemPage` (via the base flows)
- **Action / Target**: composite · build a fully-configured **DRAFT** menu around an **existing** (published) component
- **Params**: **`component`** (required — the existing item's NUMBER or NAME to add as the BOM component), `concept?`, `usage?`, `verify?`
- **Returns**: `{ menu, component, added, conceptSet, serviceReviewed, nutritionReviewed, packageSku }`
- **Requires**: a pre-existing (ideally published) `component` item
- **Composes**: `createDraftMenuItem` → `addComponentToItem({component})` → `setItemConcept` → `setServiceSettingReviewed` → `setNutritionReviewed` → `setPackageSku`
- **Side effects**: persistent — creates + configures a DRAFT menu. Does **NOT** create/publish the component (must already exist) and does **NOT** publish the menu.
- **Usage / NL**: drive from "create a menu item, add `<X>` as its component" → `--input '{"component":"<X>"}'`. `component` is searched by Name OR Item Number in the Add-component dialog, so either works.
- **Gotchas**: to also CREATE the component, use `assembleFullMenuItem` (creates its own HDR) instead; to publish the menu, run `publishMenuItem` after. Each run makes a fresh draft menu (repeatable).

## searchItem
- **File**: `flows/searchItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: search · Item (generic — any type, matched by exact name)
- **Params**: `query` (required — the exact item name)
- **Returns**: `{ found: boolean, itemId: string, name: string }` — `itemId` is `""` when not found; when found, it's the GUID read from the opened item's detail URL
- **Requires**: `name` — consumes a name produced by a `create*` flow (e.g. `createDraftMenuItem`'s `name`)
- **Composes into**: create→search→delete lifecycle (produces `itemId` for a `deleteItem`)
- **Side effects**: read-only — searches and opens the result, mutates nothing
- **Gotchas**: uses the **Smart Search** combobox → **Search** button. `query` is matched as the **exact** item name against the result-row link; a partial/ambiguous query won't resolve to a single row. Opening the result navigates to the item detail page (which is also where delete lives). The results grid shows an **Ant Design loading spinner** (`.ant-spin-spinning`, `aria-busy`) whose overlay **intercepts clicks** — `ItemPage.waitForIdle()` waits it out after Search and before clicking a result, else the click times out.

## deleteItem
- **File**: `flows/deleteItem.ts`  ·  **Pages**: `ItemPage` (`flows/pages/ItemPage.ts`)
- **Action / Target**: delete · Item — types that expose a **"Delete This Item"** action (Menu/Food). **Not HDR Consumable** (that type only has "Dormant Item", so delete times out waiting for the missing menu entry).
- **Params**: `name` (required — the exact item name)
- **Returns**: `{ deleted: boolean, name: string }` — `deleted=false` when the item wasn't found to begin with
- **Requires**: `name` — consumes a name produced by a create or search flow
- **Composes into**: create→search→delete lifecycle (the terminal step)
- **Side effects**: **destructive** — permanently deletes a real item on QA, no undo
- **Gotchas**: reaches the detail page by **search-by-name** (the detail URL needs the item's numeric code, which is *not* the returned `version_id`, so deep-linking by the returned id isn't viable). Delete sequence on the detail page = **Actions → Delete This Item → confirm dialog ("This action is permanent") → Delete**. The **Actions dropdown is race-prone** — clicking "Delete This Item" while the menu is still animating sometimes fails to open the confirm dialog, so `ItemPage.deleteFromDetail()` retries opening the menu (up to 3×) until the dialog appears, clicks the **dialog-scoped** Delete, and waits for the dialog to close as the commit signal. Smart Search is index-backed with **lag** — a re-search immediately after delete may still show the item briefly even though the delete committed; `deleted` reflects that the delete action completed, not a re-query.

## createSearchDeleteItem
- **File**: `flows/createSearchDeleteItem.ts`  ·  **Pages**: `ItemPage` (via the base flows)
- **Action / Target**: composite · Item · full create→search→delete lifecycle
- **Params**: `name?`, `category?`, `type?` — forwarded to `createDraftMenuItem`
- **Returns**: `{ itemId, name, found, deleted }`
- **Requires**: — (entry point; composes the three base flows)
- **Composes**: `createDraftMenuItem` → `searchItem` → `deleteItem`
- **Side effects**: self-cleaning — creates then deletes the same item; on success nothing persists on QA
- **Gotchas**: absorbs **create→search indexing lag** by polling `searchItem` up to 6× (3s apart) before deleting; if the item never becomes searchable, it returns `found:false, deleted:false` and leaves the created item on QA (its `itemId` is still in the result for manual cleanup).
