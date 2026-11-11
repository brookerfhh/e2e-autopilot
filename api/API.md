# API — data-setup functions (`api/*.ts`)

API counterpart of `flows/FLOWS.md`. Same idea: each function replaces a UI flow with the direct `/ajax/...` call
the UI makes on save. Everything goes through `api/client.ts` (QA only, `SESSION_ID` from env, never in files).

Rules shared by all functions:

- **Required** params are positional / mandatory in the TS type. **Optional** params live in an options object and
  fall back to the default shown below, so callers only pass what they want to change.
- Create functions refuse names without the `e2e-auto-` prefix. Edit functions read the item first and refuse unless
  its name starts with `e2e-auto-` (`assertE2EVersion`).
- Edits are GET → overlay the changed fields → PUT, because the endpoints overwrite the whole object.
- Status: **verified** = ran against QA successfully; **written** = type-checked only, not yet run against QA.

## Create (`api/createItem.ts`) — replaces the `create*` flows

| Function | Replaces flow | Endpoint | Required | Optional (default) | Returns | Status |
|---|---|---|---|---|---|---|
| createIngredient | createIngredientItem | POST /ajax/v2/item/ingredient | name | subType, bomLineUnit (`g`), stockUom | CreatedItem | verified |
| createNonFood | createNonFoodItem | POST /ajax/v2/item | name | subType (`SMALLWARE`) | CreatedItem | verified |
| createMenu | createDraftMenuItem | POST /ajax/v2/item/recipe | name | subType (`FOOD`) | CreatedItem | verified |
| createRecipe | createRecipeItem | POST /ajax/v2/item/recipe | name | — (Primary, 1000 g) | CreatedItem | verified |
| createBenchtop | — | POST /ajax/v2/item/recipe | name (` [BT]` appended) | — | CreatedItem | verified |
| createPackaged | createPackageItem | POST /ajax/v2/item | name | subType (`COMMON_STOCK`) | CreatedItem | verified |
| createHdrConsumable | createDraftHdrConsumable | POST /ajax/v2/item | name | state (`THAWED`), subState, bomLineUnit (`g`) | CreatedItem | verified |
| createHdrRecipe | — | PUT check-name-exist, POST /ajax/v2/item | name | subType (`GRAB_AND_GO`) | CreatedItem | verified |
| createItem | (dispatcher) | by type | type, name | — | CreatedItem | verified |

`CreatedItem = {itemNumber, versionId, name}`. Smoke: `SESSION_ID=... npm run smoke:create [TYPES...]`.

## Edit (`api/updateItem.ts`) — replaces the card-edit flows

| Function | Replaces flow | Endpoint | Required | Optional (default) | Status |
|---|---|---|---|---|---|
| setConcept | setItemConcept | GET /ajax/concept (name → id), GET/PUT /ajax/v2/item/version/:id/recipe | versionId, concepts (exact names) | replace (`false` = add to existing) | verified (read back: `2PRs Fred's`, Menu published) |
| setServiceSettingReviewed | setServiceSettingReviewed | GET/PUT /ajax/item/version/:id/service-setting | versionId | reviewed (`true`) | verified (read back: reviewed, 1 bom line) |
| setPackageSku | setPackageSku | GET /ajax/item/version/:id/package-sku/list, PUT …/package-sku/update | versionId (item must already have a packaged SKU) | serviceLocations (`["N/A"]`), smallwareTool (`["N/A"]`), panSize (`"N/A"`) | verified (read back: N/A / N/A / N/A) |
| setMenuNutritionReviewed | setNutritionReviewed (for **Menu**) | GET/PUT /ajax/item/version/:id/customization/nutrition | versionId | reviewed (`true`), nutrients (calculated value, else `0`), servingsPerDish (`1`), notes (unchanged) | verified: "Nutrition (missing)" cleared in check-for-publish, Menu published |
| setNutritionReviewed | setNutritionReviewed (for **Recipe / Benchtop**) | GET/PUT /ajax/v2/item/version/:id/recipe/nutrition | versionId | reviewed (`true`), nutrients (current value, else `0`), notes (unchanged) | written (the call succeeds, but do NOT use it for a Menu — see below) |

**Menu nutrition ≠ recipe nutrition.** A Menu stores nutrition in `itemCustomizationNutrition`; the publish check ("Nutrition (missing)")
reads that. Calling `recipe/nutrition` on a Menu succeeds but does not satisfy publishing.

## Publish check (`api/publish.ts`)

| Function | Endpoint | Required | Returns | Status |
|---|---|---|---|---|
| checkForPublish | PUT /ajax/v2/item/version/:id/check-for-publish (read-only) | versionId | `{required[], warnings[]}` — `required` blocks publishing, `warnings` (e.g. Line Build) do not | verified |

Publishing itself stays in the browser (`flows/publishMenuItem.ts`): it is irreversible, so it uses the real click path
and reads the version status back through the API.

Full chain in one call: `flows/buildPublishedMenu.ts` (create → add component [browser] → Concept / Service Setting /
Packaged SKU / Menu Nutrition → pre-publish check → Publish [browser]). Verified on QA: Menu reached FINAL.

Hybrid (browser + API): `flows/buildMenuWithComponent.ts` — `createMenu` (API) → Edit Components add (browser) → BOM read-back (API).
The component must be an **existing** 40* item: a 40 that can publish needs an Active 42 in SCC, which e2e cannot create (see `cb-knowledge/流程.md`).

Smoke: `SESSION_ID=... npm run smoke:update -- <versionId> serviceSetting packageSku nutrition`.

## Find data (`api/search.ts`) — the Items list search

`PUT /ajax/v2/item/v4` (`SearchItemAJAXRequestV2`), the same call the Items list page makes. Use it to FIND items to build on
(an ACTIVE published 40* to use as a component, leftover `e2e-auto-*` items, ...). Read-only, no name restriction.
Every criterion is optional and they combine with AND; unset = no filter.

The six most-used criteria (every one is documented in detail in the TS doc comments of `api/search.ts`):

| Criterion | Meaning | Verified behaviour |
|---|---|---|
| `itemStatus` | item-level: `R&D` (never published) / `ACTIVE` (has a published version) / `DORMANT` (retired) | an item turns ACTIVE when its first version is published. **Unset = all three** (the list page pre-selects R&D+ACTIVE; we do not) |
| `versionStatus` | version-level: `DRAFT` / `FINAL` (published, in effect) / `SCHEDULED` (published, later start) | **one row per item**; this picks which version the row is: unset = the effective one (FINAL if any), `"DRAFT"` = the draft of an item that also has a FINAL |
| `types` | `"MENU"`, or `{type, subType?, fulfillmentPackage?}`; a plain string = any sub type; OR-ed | type and sub-type lists are in the doc comment (`ObjectType`) |
| `lineBuildStatus` | `NONE` / `LINE_BUILD_CREATED` / `PENDING_UPDATE`, Menus only | NONE = the non-required "Line Build (missing)" warning. NONE and LINE_BUILD_CREATED checked; PENDING_UPDATE from the enum only |
| `itemNumbers` | exact item numbers | other criteria still apply on top; unknown numbers are just absent |
| `missingInfo` | kinds an item is missing, e.g. `NUTRITION`, `LINE_BUILD`, `CONCEPT` | **OR** between kinds (NUTRITION 5, LINE_BUILD 5, both 8); matches required AND warning-only kinds; does not say which are required |
| `missingInfoTeams` | `CDT` / `Finance` / `Food Science` / `Nutrition` / `Procurement` / `Production Planning` | expands to the team's kinds like ticking "All" for a team; merged with `missingInfo`. Live list: `listMissingInfoTeams()` |

Other criteria: `text` (name or item number), `concepts` (names, resolved to ids) / `noConcept`, `soldStatus`, `orderableStatus`,
`nutritionReview`, `vendorSku`, `withWarnings` (no visible effect in our probes).

| Function | Returns | Notes |
|---|---|---|
| `findItems(criteria, {limit=20, skip=0, sort?})` | `{total, items}` — one page | `sort: {by, desc}`, by = NAME / UPDATED_TIME / CREATED_TIME / ITEM_NUMBER / OBJECT_TYPE / ITEM_STATUS / COMPONENT_USAGES |
| `findAllItems(criteria, {max=200, sort?})` | `{total, items}` — pages until `max` | the list can hold tens of thousands of rows, so `max` is always applied |
| `findOneItem(criteria)` | one row | throws unless exactly 1 match (reports how many) |

Each row: `{versionId, itemNumber, name, objectType, objectSubType, itemStatus, versionStatus, concepts[], soldStatus,
bomLineUnit, missing[], missingRequired[], updatedTime}`. `missing` holds the kind names (the same names `missingInfo`
filters on, e.g. `["LINE_BUILD"]`), required or not; `missingRequired` is the subset that blocks publishing.

**"Find an item that is not missing anything"** — the search cannot express it, so filter the rows here with `where`:

```ts
const base = {types: ["INGREDIENT"], itemStatus: ["ACTIVE"], versionStatus: "FINAL"};
// nothing REQUIRED is missing (warnings allowed) — the healthy-item check
await findAllItems(base, {max: 3, withoutMissing: "required"});
// nothing missing at all, warnings included (`missing` is empty)
await findAllItems(base, {max: 3, withoutMissing: "all", maxScan: 1500});
// any other local check, ANDed with the above
await findAllItems(base, {max: 3, withoutMissing: "all", where: r => r.name.startsWith("Web Auto")});
```

The server can only ask "has ANY of these missing kinds" (a Mongo `$in`), never "has none", so `withoutMissing` / `where` run here on
the fetched rows. Only passing rows count towards `max`; `scanned` in the result says how many server rows were looked at
(`maxScan`, default 1000), `total` is the server's count for the criteria. Observed on QA, ACTIVE + FINAL Ingredients (1189): **none has an empty `missing`** — every
one carries at least a warning (transfer cost, classification, 5* shelf life, standard cost) — but plenty have no REQUIRED missing
(3 found within the first 100 rows, e.g. `5001901` Water, `5006301` Potato, Idaho). So "no missing" in practice means `missingRequired`.
`checkForPublish` only works on an unpublished version (409 on a FINAL one); for published items read `missingRequired` from the row.

Verified on QA: by name / item numbers / type / sub type / item status / version status / concept / no concept, sorting, paging, and
the 0-match / many-match / unknown-concept errors. `searchItems` (smart-search, `api/item.ts`) stays as the light name lookup used by `resolve`.

## Read (`api/read.ts`) — mirrors the item detail page's own dispatch

The item number prefix picks the family, then the object type picks the endpoint (same as
`useGetItemDetailByItemNumber` and the HDR Consumable / WSKU `useRefreshDetails` hooks). Read-only, so no `e2e-auto-` restriction:
it can read any QA item, e.g. the existing component `4001164`.

| Family | When | Detail endpoint | Nutrition endpoint |
|---|---|---|---|
| hdrConsumable | item number `40*` | `/ajax/item/hdr-consumable/version/:id` | `/ajax/item/hdr-consumable/version/:id/nutrition` |
| wsku | `41*`, `42*`, `49*` | `/ajax/item/wsku/version/:id` | `/ajax/item/wsku/version/:id/nutrition` |
| ingredient | INGREDIENT, BY_PRODUCT, BENCHTOP(by-product) | `/ajax/v2/item/version/:id/ingredient` | `/ajax/v2/item/version/:id/ingredient/nutrition` |
| recipe | RECIPE, MENU, BENCHTOP | `/ajax/v2/item/version/:id/recipe` | MENU: `/ajax/item/version/:id/customization/nutrition`; else `/ajax/v2/item/version/:id/recipe/nutrition` |
| generic | PACKAGED, NON_FOOD, HDR_RECIPE, … | `/ajax/v2/item/version/:id` | `/ajax/v2/item/version/:id/item-nutrition` |

| Function | Required | Optional (default) | Returns | Status |
|---|---|---|---|---|
| resolve(ref) | exactly one of `versionId` / `itemNumber` / `name` (exact, must match one item) | `version`: `"published"` (default, the effective version — what the UI opens without `?version_id`) or `"latest"` (newest, e.g. a newer DRAFT) | `{versionId, itemNumber, name, objectType, objectSubType, versionStatus, family}` | verified (all 8 types + 4001164; by number / name / version id; errors for 0 or many matches) |
| getItemDetail(ref) | ref | — | `{item, data}`, data = the family's detail response | verified for all families except wsku |
| getNutrition(ref) | ref | — | `{item, data}` | verified for all families except wsku |

Facts checked on QA: for an item with a FINAL and a newer DRAFT version, `object-type` and `effective-version` both return the
**FINAL** one; `PUT /ajax/v2/item/:n/versions/list` lists newest first (used for `"latest"`).
**WSKU is not verified** (no e2e data; WSKU items are controlled by SCC): implemented from the UI code only.
`hdr-consumable/version/:id` answers 200 for any type on the server, but it is the `40*` detail endpoint — pick by family, not by "it worked".

### Per-card flows: init → get → update

How to use the functions per card. "Init" is the data setup that makes the card non-empty, "Get" reads the card back
(for assertions), "Update" edits it through the API. Steps that stay in the browser are marked.

| Card | Init | Get | Update |
|---|---|---|---|
| Item Information | `createItem(type, name)` (any of the 8 types) | `getItemDetail(ref)` | `updateItemInfo` (V2 items), `updateIngredientInfo` (Ingredient) |
| Concept | `createMenu` | search row `concepts[]` (`findOneItem({itemNumbers:[n]})`) | `setConcept(versionId, names)` |
| Components | `buildMenuWithComponent` = `createMenu` + **Add component in the browser** | `getComponentsCard` / `getComponentRows` / `findComponentRow` | browser only (Edit Components) |
| Service Setting | a Menu with at least one component (`buildMenuWithComponent`) | `getServiceSetting` | `setServiceSettingReviewed` |
| Packaged SKUs | same: rows appear once a consumable component is in the BOM | `getPackagedSkus` / `getPackagedSkuTableRows` | `setPackageSku` |
| Nutrition (Menu) | `createMenu` | `getNutrition(ref)` | `setMenuNutritionReviewed` |
| Nutrition (Recipe / Benchtop) | `createRecipe` / `createBenchtop` | `getNutrition(ref)` | `setNutritionReviewed` |
| Publish | `buildPublishedMenu` (all of the above, then the check) | `checkForPublish` (unpublished) / search row `missing` (published) | **Publish click in the browser** (`publishMenuItem`) |
| Versions | a published version | `resolve({itemNumber, version:"latest"})` | `createNewVersion`, `deleteVersion`, `deleteItem` |

### Card reads

Each card read calls the endpoint that card loads and reshapes the answer the way the card does, keeping the columns the card shows.

| Card | Module | Endpoint | Function | Returns | Status |
|---|---|---|---|---|---|
| Components (Menu / Recipe detail, `ComponentsV2`) | `api/components.ts` | GET `/ajax/item/version/:id/component-bom/display` | `getComponentsCard(versionId)` | `{showType, objectType, versionStatus, serviceSettingReviewed, totalYield, manualYield, rows}` | verified (Menu FINAL + DRAFT; HDR gives `showType: null`, no rows) |
| | | | `getComponentRows(versionId)` | top-level `ComponentRow[]` | verified |
| | | | `findComponentRow(versionId, itemNumber)` | the top-level row or `undefined` | verified |

`ComponentRow` = `{uuid, itemNumber, versionId, name, objectType, objectSubType, itemStatus, version, versionStatus, quantity, unit, required, cost, scrapYield, leadTimeDay, children}`
(`required` is the card's "Required" column, `manage_inventory` in the API). The response is flat (nodes keyed by `hash`, the root has `hash: null`);
the card picks `expanded_bom_lines` when `show_type` is `BOM` and `components` when it is `COMPONENT`, then rebuilds the tree exactly like `ComponentsV2/utils/transToTree.tsx`.
`getBomItemNumbers` in `api/read.ts` is now a thin wrapper over `getComponentRows`. HDR Consumable (`40*`) has its own Production BOM card and is not covered.

| Card | Module | Endpoint | Function | Returns | Status |
|---|---|---|---|---|---|
| Service Setting ("Set require for service" modal under Components; its `review_info` is the "Service Setting Reviewed" shown in the Components header) | `api/serviceSetting.ts` | GET `/ajax/item/version/:id/service-setting` | `getServiceSetting(versionId)` | `{reviewed, reviewedBy, reviewedTime, lines, customizations}`; line = `{itemNumber, versionId, name, objectType, objectSubType, quantity, unit, required, noRequiresPackaging}`; customization = `{optionId, optionName, optionValueId, optionValueName, lines}` | verified (Menu FINAL + DRAFT) |
| Packaged SKUs (`ComponentsV2/PackagedSKU`) | `api/packagedSku.ts` | GET `/ajax/item/version/:id/package-sku/list` | `getPackagedSkus(versionId)` | one entry per consumable component: `{consumable: {itemNumber, versionId, name, objectType, objectSubType, itemStatus, customizationOptionValueName}, configs: [{itemNumber, name, objectType, objectSubType, serviceLocations, smallwareTool: [first, second], panSize}], showWhenEmpty}` | verified (Menu FINAL + DRAFT) |
| | | | `getPackagedSkuTableRows(versionId)` | the card table rows in UI order (`flatSKUList`): consumable parent row then one `stockable` row per config, or a single `consumableAndStockable` row when a config is the consumable itself; entries without configs only when `showWhenEmpty` | verified |

Both modules also export the raw fetch (`fetchServiceSetting`, `fetchPackageSkuList`); the write side in `updateItem.ts` (`setServiceSettingReviewed`, `setPackageSku`) reads through them.

Other cards are added the same way when a test needs to assert on them.

## Item Information edits (`api/updateItem.ts`)

All fields are optional; only the ones given change, the rest is read (GET) and written back (PUT).

| Function | Replaces flow | Endpoint | Required | Optional (default = unchanged) | Status |
|---|---|---|---|---|---|
| updateItemInfo | updateNonFoodItem; "Out of Stock Name" step of publishHdrConsumable | GET/PUT /ajax/v2/item/version/:id (Non-food, HDR Consumable, Packaged) | versionId | name, objectSubType, outOfStockName, displayOosToCustomer, jiraLink, reasonForChange, orderable, donatable, syncToVcs | verified (HDR: Out of Stock Name; Non-food: Jira link + reason, read back) |
| updateIngredientInfo | setIngredientStockFields | GET/PUT /ajax/v2/item/version/:id/ingredient | versionId | stockUom, outOfStockName, displayOosToCustomer, jiraLink, reasonForChange, notes | verified (stock UOM + Out of Stock Name, read back) |

## Item lifecycle (`api/item.ts`)

| Function | Replaces flow | Endpoint | Required | Optional (default) | Status |
|---|---|---|---|---|---|
| searchItems | searchItem | PUT /ajax/v2/item/smart-search | query (name or item number) | limit (`20`), skip (`0`) | verified |
| createNewVersion | createNewVersion | POST /ajax/v2/item/version | sourceVersionId (a published version) | reason (`"e2e new version"`), jiraLink (`null`) | verified (new version is DRAFT) |
| deleteVersion | — | DELETE /ajax/v2/item/version/:id | versionId | — | verified |
| deleteItem | deleteItem | DELETE /ajax/v2/item/:itemNumber (item number read from the version) | versionId | — | verified on Non-food; not tried on HDR (the UI has no "Delete This Item" for HDR) |

`searchItems` is index-backed, like the UI search: a just-created item can take a moment to show up.

## UI as oracle: recorded call sequence and card diff

Frontend-only rules and "check" calls are easy to skip in an API version, and skipping them is how data got corrupted
before. Two tools keep the API versions honest; the kept UI flows are the reference.

- `npm run flow -- <flow> --trace` records every `/ajax/` call the browser makes during a UI flow
  (`flows/.recorded/<flow>-<stamp>.trace.json`, gitignored) and prints the write / check sequence.
- `npm run diff -- <versionIdA> <versionIdB>` snapshots both versions' cards (detail, nutrition, Components,
  Service Setting, Packaged SKUs, check-for-publish), replaces the item's own number / version id / name with
  placeholders, drops volatile keys (ids, hashes, times, who) and prints every remaining difference.

### Menu up to publish — recorded 2026-11-11 on QA

UI-built Menu `80146491` vs API-built `80146481` (`buildPublishedMenu` with `publish:false`): **0 differences**.

| Step | Frontend-only rules (before any request) | Check call | Write call | API version |
|---|---|---|---|---|
| Create Menu | form: name required | — | `POST /ajax/v2/item/recipe` | `createMenu` — same |
| Add component (Edit Components) | body built by `getComponents` / `getBOMLines` / `getUncreatedItems` (pack qty, units…) | `PUT …/component-bom/check-for-update` (warnings → confirm dialogs) | `PUT …/component-bom` | **browser only** (`addComponentToItem`) |
| Concept (Edit Item modal) | form validation | — | `PUT /ajax/v2/item/version/:id/recipe` (whole object, `user_add_concept_ids`) | `setConcept` — same |
| Service Setting | MENU: each customization option value with food items needs one Required; HDR_RECIPE: BOM needs one food Required | `PUT …/service-setting/update-check` (same body) | `PUT …/service-setting` | `setServiceSettingReviewed` — rules + check + write |
| Nutrition (Edit Nutrition page) | Nutrition Reviewed must be on to save at all; nutrients must not be blank | `PUT …/recipe/check-nutrition-all-reviewed` → "Some components' nutrition status is not approved… Continue?" | `PUT …/customization/nutrition` | `setMenuNutritionReviewed` — check + write, `allowUnreviewedComponents` (default true) answers the confirm |
| Packaged SKUs | the three selects are required | — | `PUT …/package-sku/update` | `setPackageSku` — same |
| Publish | — | `PUT …/check-for-publish` → "Unable to Publish" / "Incomplete info" | publish | **browser only** (`publishMenuItem`) |

Lesson from the recording: the old `addComponentToItem` reported `added:true` without waiting for the save; the next
flow's navigation aborted the pending `check-for-update` and nothing was saved. It now waits for the `PUT …/component-bom`
response. "The UI flow is the oracle" only holds when the UI flow itself is verified by a read-back.

## Flows that now use the API for their data steps

| Flow | How |
|---|---|
| setIngredientStockFields | API only (`updateIngredientInfo`); params `url` or `versionId`, `stockUom` (`g`), `outOfStockName` (`e2e-oos`) |
| publishHdrConsumable | Out of Stock Name via API, Publish in the browser; params `url` or `versionId`, `outOfStockName` (`e2e-oos`) |
| buildMenuWithComponent / buildPublishedMenu | see above |

## Not done yet

| Flow | Plan |
|---|---|
| addComponentToItem (Menu Edit Components) | stays in the browser; hands over via `itemNumber` / `versionId` |
| composites (assembleMenuItemWithComponent, assembleFullMenuItem, buildFullMenuItem, createSearchDeleteItem) | still the UI versions; `buildPublishedMenu` is the API-based replacement for the Menu chain |
| the UI search/delete/new-version flows | kept as UI flows; their API counterparts above are what data-setup code should use |
