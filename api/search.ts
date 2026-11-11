/**
 * Find items the way the Items list page does: PUT /ajax/v2/item/v4 (SearchItemAJAXRequestV2).
 * Meant for FINDING DATA to build on — e.g. an ACTIVE, published Menu / HDR Consumable to use as a component,
 * or the e2e-auto-* items left over from earlier runs. Read-only, no name restriction.
 *
 * Every criterion is optional; criteria combine with AND. Unset means "no filter" and is sent as null — so, unlike the
 * list page, nothing is pre-selected: the page defaults item status to R&D + ACTIVE, we do not (DORMANT items come back
 * unless you filter them out).
 *
 * The six criteria people reach for most are documented in detail below:
 *   itemStatus, versionStatus, types, lineBuildStatus, itemNumbers, missingInfo (+ missingInfoTeams).
 *
 * Verified on QA (see API.md): each criterion, sorting, paging, and the one-row-per-item behaviour described on versionStatus.
 */
import {get, put} from "./client";
import {SEARCH_BASE} from "./item";
import {findConceptId} from "./updateItem";

// ---------------------------------------------------------------------------------------------
// Criteria values
// ---------------------------------------------------------------------------------------------

/**
 * Where the item is in its life, as a whole (the "Status" column on the list).
 *  - "R&D"     in development, never published yet. A freshly created item is R&D.
 *  - "ACTIVE"  live: it has a published version. It turns ACTIVE when its first version is published (observed:
 *              an e2e Menu / HDR Consumable went R&D -> ACTIVE once published).
 *  - "DORMANT" retired (via "Dormant Item"); hidden by the list page by default, so pass ["R&D","ACTIVE"] to mimic the page.
 * Not the same as versionStatus, which is about one version of the item.
 */
export type ItemStatus = "R&D" | "ACTIVE" | "DORMANT";

/**
 * State of one VERSION of an item.
 *  - "DRAFT"     being edited, not published.
 *  - "FINAL"     published and in effect — the version the detail page opens without ?version_id.
 *  - "SCHEDULED" published but with a later start ("Affect Later" in the Publish dialog); the scheduled-changes page lists these.
 *                (meaning taken from the publish dialog and that page, not tested here)
 * One row per ITEM comes back, and versionStatus chooses WHICH of its versions the row describes:
 *  - unset: the effective version (FINAL when there is one, else the DRAFT);
 *  - "DRAFT": the draft version, e.g. an item that has a FINAL plus a newer DRAFT returns the DRAFT row;
 *  - "FINAL": the published version.
 * (Observed on an item with FINAL + newer DRAFT: unset -> FINAL row; "DRAFT" -> the draft row; "FINAL" -> the FINAL row.)
 */
export type VersionStatus = "DRAFT" | "SCHEDULED" | "FINAL";

/**
 * Object types (the first level of the list's "Type" cascader):
 *  MENU, RECIPE, BENCHTOP, BY_PRODUCT, INGREDIENT, PACKAGED, NON_FOOD, HDR_RECIPE, HDR_CONSUMABLE_ITEM (the 40* items), WSKU,
 * plus deprecated ORIGINAL, ORIGINAL_SUBRECIPE, COMMON_STOCK_TOTE, MOBILE_SF.
 */
export type ObjectType = "MENU" | "RECIPE" | "BENCHTOP" | "BY_PRODUCT" | "INGREDIENT" | "PACKAGED" | "NON_FOOD" | "HDR_RECIPE" | "HDR_CONSUMABLE_ITEM" | "WSKU" | "ORIGINAL" | "ORIGINAL_SUBRECIPE" | "COMMON_STOCK_TOTE" | "MOBILE_SF";

/**
 * Sub types seen in the app, by object type (the second level of the "Type" cascader):
 *  MENU: FOOD, ALCOHOLIC_BEVERAGE, NON_ALCOHOLIC_BEVERAGE
 *  RECIPE: PRIMARY, PREPARATION           BENCHTOP: PRIMARY, PREPARATION, BY_PRODUCT
 *  PACKAGED: COMMON_STOCK, KITTED, SUB_PACKAGED, BULK_KITTED
 *  NON_FOOD: INTERNAL_PACKAGING, GUEST_PACKAGING, SMALLWARE, MARKETING, EQUIPMENT, PPE, SANITATION, STORAGE, APPLIANCE, VESSEL
 *  HDR_RECIPE: ALCOHOLIC, GRAB_AND_GO, SLACKING
 *  INGREDIENT: SOLID, LIQUID, SCRAP, PRODUCE, BUYOUTS, PROTEIN_*, BAKED_GOOD, DAIRY, ... (a long food-category list)
 * Left as a string on purpose: the list is long and the backend is the source of truth.
 */
export type ObjectSubType = string;

/**
 * Line Build state of a MENU item (the list's "Line Build Status" filter; only Menus carry it, other types never match).
 *  - "NONE"                no Line Build configured. A new Menu is NONE. This is the "Line Build (missing)" warning on publish,
 *                          which is NOT required: the Publish dialog offers "Publish anyway".
 *  - "LINE_BUILD_CREATED"  Line Build exists.
 *  - "PENDING_UPDATE"      a Line Build exists but needs updating (e.g. after a component change).
 * (NONE and LINE_BUILD_CREATED verified; PENDING_UPDATE taken from the enum.)
 */
export type LineBuildStatus = "NONE" | "LINE_BUILD_CREATED" | "PENDING_UPDATE";

export type SoldStatus = "FOR_SALE" | "SCHEDULED" | "NOT_SOLD" | "N/A";
export type OrderableStatus = "ORDERABLE" | "NOT_ORDERABLE" | "INVENTORY_ONLY";
export type NutritionReview = "APPROVED" | "NULL";
export type SortBy = "NAME" | "UPDATED_TIME" | "CREATED_TIME" | "ITEM_NUMBER" | "OBJECT_TYPE" | "ITEM_STATUS" | "COMPONENT_USAGES";

/**
 * One object type, optionally narrowed to a sub type. A plain string means "this type, any sub type".
 * `fulfillmentPackage` only matters for PACKAGED (true = finished fulfillment package items, false = the rest); leave it unset otherwise.
 */
export type TypeFilter = ObjectType | {readonly type: ObjectType; readonly subType?: ObjectSubType | null; readonly fulfillmentPackage?: boolean | null};

/**
 * One "missing info" kind, i.e. one thing an item can be missing, as listed on the item's publish check / validation info
 * (e.g. "NUTRITION", "LINE_BUILD", "CONCEPT", "COMPONENTS_BILL_OF_MATERIALS", "OUT_OF_STOCK_NAME", "PROCEDURE", "SERVICE_LOCATION",
 * "PAN_SIZE", "SMALLWARE_TOOL", "SERVICE_SETTING_REQUIRE_REVIEW", "ACTIVE_WSKU_IN_COMPONENT", "STANDARD_COST", "STOCK_UOM", ...).
 * The full list is ValidationInfoOptionAJAXView; each team owns a subset (see MissingInfoTeam).
 */
export type MissingInfo = string;

/**
 * The teams the "Missing Info (by team)" filter groups the kinds under. Picking a team = all of that team's kinds.
 *  - "CDT"                 ASSEMBLY_INSTRUCTION, CLASSIFICATION_TYPE, COMPONENTS_BILL_OF_MATERIALS, CONCEPT, CUSTOMIZATION, LINE_BUILD,
 *                          NET_WEIGHT, OUT_OF_STOCK_NAME, PAN_SIZE, PREP_PROCEDURE, PROCEDURE, SERVICE_LOCATION,
 *                          SERVICE_SETTING_REQUIRE_REVIEW, SMALLWARE_TOOL, UNIT_CONVERSION
 *  - "Finance"             STANDARD_COST
 *  - "Food Science"        SHELF_LIFE_PERIOD, STORAGE_TYPE
 *  - "Nutrition"           NUTRITION, WONDER_APP_NAME
 *  - "Procurement"         ACCOUNTING_SUB_TYPE, ACCOUNTING_TYPE, ACTIVE_WSKU_IN_COMPONENT, ACTIVE_WSKU_IN_CUSTOMIZATION,
 *                          INCONSISTENT_INVENTORY_UNIT, SHELF_LIFE_PERIOD(5*), STANDARD_COST_LAST_UPDATED, STOCK_UOM, TOTAL_TRANSFER_PRICE_COST,
 *                          TOTAL_TRANSFER_PRICE_COST_CURRENT_STATE, VENDOR_ITEM
 *  - "Production Planning" COMPONENT_PRODUCTION_LEAD_TIME, INDIVIDUAL_USE_STATEMENT, KITCHEN_AND_KITCHEN_SUB_LOCATION, PRINTER_ROUTE,
 *                          PRODUCTION_LEAD_TIME, PRODUCT_COVERAGE_GROUP, REGULATORY_BODY, RESOURCE_NAME, STATEMENT_OF_IDENTITY,
 *                          STORAGE_LOCATION, STORED_AS_WIP
 * (As configured on QA on 2026-11-10; the live list is GET /ajax/validation-owner-config/list and is what is used to expand a team.)
 */
export type MissingInfoTeam = "CDT" | "Finance" | "Food Science" | "Nutrition" | "Procurement" | "Production Planning";

// ---------------------------------------------------------------------------------------------
// Criteria
// ---------------------------------------------------------------------------------------------

export interface ItemCriteria {
    /** Free text: matches the name or the item number (the list's Smart Search box). */
    readonly text?: string;

    /**
     * Exact item numbers. Use it when you already know which items you want (e.g. ["4001164", "80146021"]); the result has
     * one row per number that exists, and the other criteria still apply on top. Numbers that do not exist are just absent.
     * The prefix tells the kind: 40* HDR Consumable, 41/42/49* WSKU, 5* Ingredient, 8* Menu / Recipe, 3* Benchtop, 7* HDR Recipe, 9* Non-food.
     */
    readonly itemNumbers?: readonly string[];

    /** Object type(s), OR-ed with each other. Unset = every type. See ObjectType / TypeFilter. */
    readonly types?: readonly TypeFilter[];

    /** Item-level status(es), OR-ed. Unset = all three, DORMANT included. See ItemStatus. */
    readonly itemStatus?: readonly ItemStatus[];

    /** Which version of each item to look at. Unset = the effective version. See VersionStatus. */
    readonly versionStatus?: VersionStatus;

    /** Line Build state; only Menus have one. See LineBuildStatus. */
    readonly lineBuildStatus?: LineBuildStatus;

    /**
     * Items that are missing ANY of these kinds (OR, verified: NUTRITION alone 5 items, LINE_BUILD alone 5, both 8).
     * It matches kinds that are required for publishing and kinds that are only warnings (LINE_BUILD matched although it is
     * not required). It does NOT tell you which are required — read that from the row's `missing` / checkForPublish.
     * Combines with missingInfoTeams (both lists are merged).
     */
    readonly missingInfo?: readonly MissingInfo[];

    /** Same as missingInfo, by team: each team expands to all of its kinds, like ticking "All" for a team on the list page. */
    readonly missingInfoTeams?: readonly MissingInfoTeam[];

    /** Concept names (exact; resolved to ids). `noConcept: true` finds items with no concept at all. */
    readonly concepts?: readonly string[];
    readonly noConcept?: boolean;
    readonly soldStatus?: readonly SoldStatus[];
    readonly orderableStatus?: readonly OrderableStatus[];
    readonly nutritionReview?: NutritionReview;
    readonly vendorSku?: string;
    /** The list's warnings toggle. No visible effect in our probes (same rows with and without). */
    readonly withWarnings?: boolean;
}

export interface SearchPaging {
    /** Rows per page; the list page uses 20. Default 20. */
    readonly limit?: number;
    /** Rows to skip. Default 0. */
    readonly skip?: number;
    /** Default: the server's order (the list page itself sorts UPDATED_TIME desc). */
    readonly sort?: {readonly by: SortBy; readonly desc?: boolean};
}

// ---------------------------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------------------------

export interface ItemRow {
    /** Id of the version this row describes (see versionStatus on how that version is chosen). Use it for the update functions. */
    readonly versionId: string;
    /** The item's number; the same for all its versions. */
    readonly itemNumber: string;
    readonly name: string;
    readonly objectType: string;
    readonly objectSubType: string | null;
    /** Item-level: "R&D" | "ACTIVE" | "DORMANT". See ItemStatus. */
    readonly itemStatus: string;
    /** Version-level: "DRAFT" | "SCHEDULED" | "FINAL". See VersionStatus. */
    readonly versionStatus: string;
    /** Concept names tagged on / inherited by the item. */
    readonly concepts: string[];
    readonly soldStatus: string | null;
    readonly bomLineUnit: string | null;
    /**
     * Everything this version is missing (the kinds you can filter with missingInfo), required or not. Empty = nothing missing.
     * This is the quick "can it be a component / can it publish" read, but it does not say which entries are required:
     * for that call checkForPublish(versionId) (its `required` list is what blocks publishing).
     */
    readonly missing: string[];
    /**
     * The subset of `missing` that is REQUIRED for publishing (blocks the publish with "Unable to Publish"). The rest are warnings.
     * Empty = nothing blocks publishing; the usual "is this a healthy item" check.
     * Same flag as checkForPublish(versionId).required, but already in the search result, so no extra call per item.
     */
    readonly missingRequired: string[];
    readonly updatedTime: string;
}

export interface ItemPage {
    /** All matches on the server, not just this page. */
    readonly total: number;
    readonly items: ItemRow[];
}

// ---------------------------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------------------------

interface V4Item {
    id: string;
    item_number: string;
    name: string;
    object_type: string;
    object_sub_type: string | null;
    item_status: string;
    version_status: string;
    concepts: {name: string | null}[] | null;
    sold_status: string | null;
    bom_line_unit: string | null;
    validation_information: {invalid_info_list: {details: {tip: string; invalid_info_option?: string; required?: boolean}[]}[]} | null;
    updated_time: string;
}

const missingDetails = (i: V4Item) => (i.validation_information?.invalid_info_list ?? []).flatMap(c => c.details);

const toRow = (i: V4Item): ItemRow => ({
    versionId: i.id,
    itemNumber: i.item_number,
    name: i.name,
    objectType: i.object_type,
    objectSubType: i.object_sub_type,
    itemStatus: i.item_status,
    versionStatus: i.version_status,
    concepts: (i.concepts ?? []).map(c => c.name ?? "").filter(Boolean),
    soldStatus: i.sold_status,
    bomLineUnit: i.bom_line_unit,
    missing: missingDetails(i).map(d => d.invalid_info_option ?? d.tip),
    missingRequired: missingDetails(i).filter(d => d.required).map(d => d.invalid_info_option ?? d.tip),
    updatedTime: i.updated_time,
});

const toTypeQuery = (t: TypeFilter) => {
    const spec = typeof t === "string" ? {type: t} : t;
    return {object_type: spec.type, object_sub_type: ("subType" in spec ? spec.subType : null) ?? null, is_fulfillment_package_item: ("fulfillmentPackage" in spec ? spec.fulfillmentPackage : null) ?? null};
};

const orNull = <T>(list: readonly T[] | undefined): T[] | null => (list && list.length ? [...list] : null);

/** Team -> the kinds it owns, as configured right now (GET /ajax/validation-owner-config/list). */
export async function listMissingInfoTeams(): Promise<Record<string, string[]>> {
    const res = await get<{validation_owner_configs: {owner: string; validation_info_options: string[]}[]}>("/ajax/validation-owner-config/list");
    return Object.fromEntries(res.validation_owner_configs.map(o => [o.owner, o.validation_info_options]));
}

async function missingInfoList(criteria: ItemCriteria): Promise<string[] | null> {
    const kinds = new Set<string>(criteria.missingInfo ?? []);
    if (criteria.missingInfoTeams?.length) {
        const teams = await listMissingInfoTeams();
        for (const team of criteria.missingInfoTeams) {
            if (!teams[team]) {
                throw new Error(`Missing-info team "${team}" not found; known teams: ${Object.keys(teams).join(", ")}`);
            }
            teams[team].forEach(kind => kinds.add(kind));
        }
    }
    return kinds.size ? [...kinds] : null;
}

async function buildRequest(criteria: ItemCriteria, paging: SearchPaging): Promise<Record<string, unknown>> {
    const conceptIds = criteria.concepts?.length ? await Promise.all(criteria.concepts.map(findConceptId)) : null;
    return {
        ...SEARCH_BASE,
        smart_search: criteria.text ?? null,
        item_numbers: orNull(criteria.itemNumbers),
        object_types: criteria.types?.length ? criteria.types.map(toTypeQuery) : null,
        item_statues: orNull(criteria.itemStatus),
        version_status: criteria.versionStatus ?? null,
        item_line_build_status: criteria.lineBuildStatus ?? null,
        validation_info_options: await missingInfoList(criteria),
        concept_ids: conceptIds,
        no_concept: criteria.noConcept ?? null,
        sold_status: orNull(criteria.soldStatus),
        orderable_status: orNull(criteria.orderableStatus),
        nutrition_review_status: criteria.nutritionReview ?? null,
        vendor_sku: criteria.vendorSku ?? null,
        view_with_warnings: criteria.withWarnings ?? null,
        limit: paging.limit ?? 20,
        skip: paging.skip ?? 0,
        sorting_rule: paging.sort ? {sort_by: paging.sort.by, is_desc: paging.sort.desc ?? false} : null,
    };
}

/** One page of matches. */
export async function findItems(criteria: ItemCriteria = {}, paging: SearchPaging = {}): Promise<ItemPage> {
    const res = await put<{items: V4Item[]; total: number}>("/ajax/v2/item/v4", await buildRequest(criteria, paging));
    return {total: res.total, items: res.items.map(toRow)};
}

export interface FindAllOptions {
    /** Stop after this many MATCHING rows (default 200); the list can hold tens of thousands. */
    readonly max?: number;
    readonly sort?: SearchPaging["sort"];
    /**
     * Keep only items that are not missing anything. The server cannot ask for this (its missing-info filter is "has ANY of
     * these"), so it is checked here on the fetched rows:
     *  - "all":      `missing` is empty — nothing missing at all, warnings included (rare: no QA Ingredient / Non-food / Packaged
     *                in the first 400 ACTIVE+FINAL rows qualified; HDR Consumable, HDR Recipe, Recipe, Benchtop and Menu have some)
     *  - "required": `missingRequired` is empty — nothing blocks publishing; warnings are allowed (the healthy-item check)
     */
    readonly withoutMissing?: "all" | "required";
    /**
     * Any other check done here, after the server search, for what the search cannot express (ANDed with withoutMissing).
     * Only rows passing count towards `max`.
     */
    readonly where?: (row: ItemRow) => boolean;
    /** With `withoutMissing` / `where`, stop after scanning this many server rows even if fewer than `max` matched (default 1000). */
    readonly maxScan?: number;
}

/**
 * Walk the pages until `max` matching rows, the end of the results, or (with `where`) `maxScan` rows scanned.
 * `total` is the server's count of the criteria, NOT the number of rows that passed `where`; `scanned` says how far we looked.
 */
export async function findAllItems(criteria: ItemCriteria = {}, options: FindAllOptions = {}): Promise<ItemPage & {readonly scanned: number}> {
    const max = options.max ?? 200;
    const keep = (row: ItemRow): boolean => {
        if (options.withoutMissing === "all" && row.missing.length) {
            return false;
        }
        if (options.withoutMissing === "required" && row.missingRequired.length) {
            return false;
        }
        return options.where ? options.where(row) : true;
    };
    const filtering = options.withoutMissing !== undefined || options.where !== undefined;
    const maxScan = filtering ? (options.maxScan ?? 1000) : max;
    const pageSize = Math.min(100, maxScan);
    const items: ItemRow[] = [];
    let total = 0;
    let scanned = 0;
    while (items.length < max && scanned < maxScan) {
        const page = await findItems(criteria, {limit: Math.min(pageSize, maxScan - scanned), skip: scanned, sort: options.sort});
        total = page.total;
        scanned += page.items.length;
        items.push(...(filtering ? page.items.filter(keep) : page.items));
        if (!page.items.length || scanned >= total) {
            break;
        }
    }
    return {total, items: items.slice(0, max), scanned};
}

/** Exactly one match, else throws (with how many were found). */
export async function findOneItem(criteria: ItemCriteria): Promise<ItemRow> {
    const {total, items} = await findItems(criteria, {limit: 2});
    if (total !== 1 || items.length !== 1) {
        throw new Error(`findOneItem: expected exactly 1 match, found ${total}`);
    }
    return items[0];
}
