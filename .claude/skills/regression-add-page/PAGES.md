# Stable-Page Catalog (knowledge base for e2e generation)

Per-page facts distilled from the frontend source (and backend, where noted). The
`regression-add-page` skill reads this to know **what each page has, what to test, and the
hidden rules** — so cases can be generated WITHOUT reading code. Still recon the live page
to confirm anchors (this catalog can drift; deployed DOM is the source of truth).

**Maintenance:** regenerate when a page changes (re-read its `src/page/**` `List`/`CreateOrEdit`/
`DeleteAction`). Each entry lists: route, title (+ scope), columns, search, create flow
(trigger / modal-vs-drawer / fields / required + exact validation msg / success toast),
edit, delete (+ confirm text), capability, special rules, suggested strategy.

Legend — **Strategy**: `FULL CRUD` = idempotent create→(verify)→delete; `OPEN+VALIDATE` =
open create form + assert validation + cancel (no submit, page has no delete); `READ-ONLY`.

---

## Brand Management
- **Route**: `/brands` · **Title**: "Brand Management"
- **Columns**: BRAND NAME, LAST UPDATED BY, CREATED TIME (sortable), LAST UPDATED TIME (sortable, default desc), ACTIONS
- **Search**: Brand Name (text input)
- **Create**: button **"Create Brand"** → Drawer "Create Brand" · field **Brand Name** (required → `Brand Name is required`) · Save · toast `Successfully saved the brand.`
- **Row actions**: "…" ellipsis dropdown → **Edit** (drawer "Edit Brand") · **Delete** (→ confirm modal, OK = **Delete**, toast `Successfully deleted the brand.`)
- **Delete**: YES · **Sort**: yes · **Pagination**: none on QA (≈25 rows, one page)
- **Source testids**: `brand-create-btn` (Create), `brand-row-actions` (ellipsis) — may be undeployed; PO falls back to icon `.anticon-ellipsis`
- **Strategy**: FULL CRUD (unique `e2e-${ts}` name; create→search→find, edit→rename, delete→gone) + validation + sort

## Concept Management
- **Route**: `/concepts` · **Title**: "Concept Management"
- **Columns**: CONCEPT NAME, BRAND NAME, RESTAURANT NAME, R&D LEAD, CDT LEAD, LAST UPDATED BY, CREATED TIME (sort), LAST UPDATED TIME (sort), ACTIONS
- **Search**: Concept Name (select), Brand Name (select), Restaurant Name (select), R&D Lead (input, placeholder "Search by R&D Lead"), CDT Lead (input)
- **Create**: button **"Create"** → Drawer "Create Concept" · fields **Concept Name** (required → `Concept Name is required`), CDS Lead, R&D Lead · Save · **list does NOT auto-refresh after create** (reload to see the new row, sorted newest-first)
- **Row actions** (inline): **Edit** (drawer "Edit Concept") · **Delete** (→ confirm, OK = **Delete**) · **Map Brand** (drawer "Mapping Brand", Brand Name multi-select)
- **Delete**: YES
- **Strategy**: FULL CRUD via create → reload → verify newest row → delete (confirm "Delete"); + validation; edit/MapBrand open-and-cancel

## Location Mappings
- **Route**: `/locations/location-mapping` · **Title**: "Location Mappings" — ⚠ also a breadcrumb → scope heading to `#content`
- **Columns**: FACILITY NAME, FACILITY ERP CODE, ERP ROUTE, KITCHEN LOCATION, KITCHEN SUB LOCATION, LAST UPDATED TIME, (action)
- **Search**: all SELECTs (Facility Name / Facility Code / Kitchen Location) — no text round-trip
- **Create**: button **"Create New Location +"** → **Modal** "Location Mapping" · fields: Facility Name (select, required → `Facility Name is required.`), Kitchen Location (select, required), Route (select, required — has a **"Create"** option that opens a sub-modal **"Create New Route Name"** with field **Route Name**), Kitchen Sub-Location (select, optional) · Save · toast `Successfully saved the location mapping.`
- **Row actions** (inline `<a>`): **Edit** (modal) · **Delete** (→ confirm "Are you sure?", **Yes**/No, toast `Successfully deleted the location mapping.`)
- **Delete**: YES · **Pagination**: YES (numbered, multi-page)
- ⚠ **Backend uniqueness (BOLocationMappingService)**: create rejects if `route_id` is already used, OR if `facility_id + kitchen_location_uuid` already mapped → toast `Unable to save the mapping. There is a same Location Mapping exists.`
- **Strategy**: FULL CRUD made idempotent — create a **brand-new Route** (passes route check) on a facility+kitchen freed by deleting leftover `e2e-*` rows, wait for the new route to back-fill into the form before saving, then delete the row by its unique route name. Also a duplicate-error case (first existing combo). Pagination case lives here.

## Facilities
- **Route**: `/locations/facilities` · **Title**: "Facilities" (scope `#content`) · **Search**: none
- **Columns**: FACILITY NAME, TYPE / SUBTYPE, ADDRESS LINE 1, CITY, STATE, ZIP CODE, ADDRESS LINE 2, PHONE NUMBER, ERP FACILITY CODE, OG WAREHOUSE ID, DESCRIPTION, ACTIVE, (action)
- **Create**: button **"Create New Facility +"** → **Modal** · required: Facility Name (input → `Facility Name is required.`), Type (select), **Address Line 1** (async-search select — type e.g. `abc`, wait for options, pick one → fills City/State/Zip); other fields optional · Save · success toast contains "created"
- **Row actions** (`<a>`): **Edit** (modal) · **Delete** (confirm "Are you sure?", **Yes**/No)
- **Delete**: YES
- **Strategy**: FULL CRUD — unique name + first Type + address typeahead `abc` → create → delete row by name. + validation + a dedicated "address autocomplete returns options" case

## Kitchens
- **Route**: `/locations/kitchen`  (⚠ singular "kitchen") · **Title**: "Kitchens" (scope `#content`) · **Search**: none
- **Columns**: KITCHEN NAME, ERP ROUTE, OG KITCHEN ID, ACTIVE, (action)
- **Create**: button **"Create New Kitchen +"** → **Modal** "Create Kitchen Location" · field **Kitchen Location** (the name; required → `Kitchen Location Name is required.`); others optional · Save · toast `Successfully created kitchen.`
- **Row actions** (`<a>`): **Edit** (modal) · **Delete** (confirm "Are you sure?", **Yes**/No, toast `Successfully deleted the Kitchen`)
- **Delete**: YES
- **Strategy**: FULL CRUD — only the name is required → unique `e2e-kitchen-${ts}` → create → delete by name (fully idempotent). + validation

## Filter Code
- **Route**: `/configurations/filter-code` · **Title**: "Filter Code" — ⚠ also a column header → use the **Create button + table** as load readiness, not the title
- **Columns**: Filter Code Type, Filter Code, Description, Action · **Search**: none
- **Create**: button **"Create"** → Drawer "Create Filter Code" · fields: Filter Code Type (select, optional), **Filter Code** (input, required → `Filter Code is required.`, disabled in edit), **Description** (input, required → `Description is required.`) · Save · toast `<code> successfully saved.` · ⚠ Drawer has **no Cancel button** → close via the X (`.ant-drawer-close`)
- **Row actions**: **Edit** (drawer) · **Delete** (button → confirm `Are you sure you want to delete "<code>" ?`, **Yes**/No, toast `<code> successfully deleted.`)
- **Delete**: YES
- **Strategy**: FULL CRUD — unique alphanumeric `e2e${ts}` code + description → create → delete by code. + validation + edit-opens

## Units
- **Route**: `/configurations/units` · **Title**: "Units" · tabbed (Cookbook Unit / OG UOMs); units table has `showHeader=false`, single col Unit Code
- **Create**: button **"Create"** → Drawer "Create Unit" · field **Unit Code** (required; validator → `Unit Code can only include a-z and A-Z!`) · then a confirm "Are you sure ERP system also has this unit?"
- **Delete**: NO
- **Strategy**: OPEN+VALIDATE — load (≥1 row) + open create drawer + click Save empty → validation msg + cancel. Never submit.

## ERP Item Fields
- **Route**: `/configurations/erpItemFields` (redirects to `/configurations/erpItemFields/erp-item-fields`) · header is a Radio toggle (ERP Item Fields / Kitchen Sub-Location); use columnheader **Value Name** as load readiness
- **Columns**: Field Name, Value Name, Last Updated By, Last Updated Time, Actions (grouped by type)
- **Create**: **"+ New Value"** (per type) → Modal "Create New Value of <Type>" · field "<Type> Name" (required → `Name is required.`)
- **Delete**: NO
- **Strategy**: OPEN+VALIDATE — load + first "+ New Value" opens modal + Save empty → `Name is required.` + cancel

## Kitchen Sub-Location
- **Route**: `/configurations/erpItemFields/kitchen-sub-location` · readiness: columnheader **Value Name**
- **Create**: button **"+ New Value"** → Modal "Create Kitchen Sub-Location" · field **Kitchen Sub-Location Name** (required → `Kitchen Sub-Location Name is required.`)
- **Delete**: NO (row edit/delete are commented out in source)
- **Strategy**: OPEN+VALIDATE — load + create-modal-opens + validation + cancel

## ERP Sync Log
- **Route**: `/sync-job-log/erp` · **Title**: "Sync Job Log" (menu label is "ERP Sync Log") · scope `#content`
- **Columns**: Job Name, Job Start Date, Job End Date, Created Quantity, Updated Quantity, Trigger By, Status, Error Message (opens a drawer), File
- **Search**: Item Numbers (input), Job Name (select), Status (select), Start Date (range). Default time range may show few/no rows — don't assert ≥1 row.
- **Delete/Create/Edit**: none
- **Strategy**: READ-ONLY — load + columnheader "Job Name" + search/clear controls present (+ a search round-trip that keeps the table)

## Agent Configuration
- **Route**: `/configurations/agent` · **Title**: "Agent Configuration"
- A settings/FORM page (Segmented tabs: **Agents** / **Prompt Library**), not a list/table
- **Strategy**: READ-ONLY smoke — load + title + the "Prompt Library" tab visible

## Allergens
- **Route**: `/configurations/allergens` · **Title**: "Allergens" (subtitle "Manage allergens")
- **Columns**: Allergen Name, Is Visible In Wonder App, Label Name · no search, no pagination, no create/edit/delete
- **Strategy**: READ-ONLY — load + columnheader "Allergen Name" + ≥1 row

---

## Known-blocked
- **OG Sync Log** (`/sync-job-log/og`): the current QA test account lacks `SYNC_JOB_LOG_OG_SYNC_LOG_READ`, so the route redirects to `/ItemV2`. Needs an OG-permissioned account to test.

## Cross-cutting conventions (apply to every page)
- Auth: env `SESSION_ID` (+ `TARGET=qa|local`). PO `open()` uses a relative `page.goto(PATH)`.
- Code-split routes: readiness assertions use `{timeout: 20000}`.
- Data rows: `.ant-table-tbody tr.ant-table-row`. Open modal/drawer: scope `:visible`. Confirm: `.ant-modal-confirm`.
- AntD Select: click `.ant-select-selector` → wait 500ms → click `.ant-select-dropdown:visible .ant-select-item-option` (skip a "Create" option).
- Suite runs serial (`workers: 1`), 1 retry; backend-write waits use `{timeout: 20000}`.
- No junk: created entities use unique `e2e-*` names and are deleted by the same test.
