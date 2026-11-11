/**
 * Create items through the same endpoints and default values the "Create New" modals use
 * (frontend/recipe-site-frontend/src/page/item/list/components/CreateItemButton/*).
 *
 * Every create function refuses names without the e2e-auto- prefix (assertE2EName).
 * Fixed values mirror the UI's initial form values; nothing here is guessed.
 *
 * Not covered: Preparation recipes (POST /ajax/v2/item/recipe/commissary/preparation) — they need an
 * existing component item number plus preparation ids, so they are built on top of other items.
 */
import {assertE2EName, post, put} from "./client";

export interface CreatedItem {
    readonly itemNumber: string;
    readonly versionId: string;
    readonly name: string;
}

const FIRST_VERSION = "First Version";
const BENCHTOP_SUFFIX = " [BT]";

interface UuidResponse {
    uuid: string;
    item_number: string;
}
interface VersionIdResponse {
    item_number: string;
    item_version_id: string;
}

const fromUuid = (res: UuidResponse, name: string): CreatedItem => ({itemNumber: res.item_number, versionId: res.uuid, name});
const fromVersionId = (res: VersionIdResponse, name: string): CreatedItem => ({itemNumber: res.item_number, versionId: res.item_version_id, name});

/** CreateItemAJAXRequestV2 with every optional field present as null, as the modals send it. */
function itemV2Request(fields: Record<string, unknown>): Record<string, unknown> {
    return {
        name: null,
        object_type: null,
        object_sub_type: null,
        item_type_id: null,
        user_add_concept_ids: [],
        bom_line_unit: null,
        related_item_version_uuids: null,
        source_item_version_uuid: null,
        printer_route: null,
        donatable: null,
        facility_code: null,
        reason_for_change: null,
        jira_link: null,
        transfer_cost_is_exclusivity: null,
        transfer_cost: null,
        current_state_transfer_cost: null,
        landed_cost: null,
        out_of_stock_name: null,
        display_oos_to_customer: null,
        orderable: null,
        delivery_off_set_days: null,
        link_consumable_item: null,
        sync_to_vcs: null,
        base_uom: null,
        pack_size_qty_per_pk: null,
        item_state: null,
        sub_item_state: null,
        ...fields,
    };
}

export interface IngredientOptions {
    readonly subType?: string | null;
    readonly bomLineUnit?: string;
    readonly stockUom?: string | null;
}

/** POST /ajax/v2/item/ingredient */
export async function createIngredient(name: string, options: IngredientOptions = {}): Promise<CreatedItem> {
    assertE2EName(name);
    const res = await post<UuidResponse>("/ajax/v2/item/ingredient", {
        name,
        object_type: "INGREDIENT",
        object_sub_type: options.subType ?? null,
        reason_for_change: null,
        jira_link: null,
        bom_line_unit: options.bomLineUnit ?? "g",
        notes: null,
        from_component_card: null,
        unit_conversions: null,
        transfer_cost: null,
        current_state_transfer_cost: null,
        transfer_cost_is_exclusivity: null,
        orderable: null,
        estimate_price: null,
        landed_cost: null,
        user_add_concept_ids: [],
        stock_uom: options.stockUom ?? null,
    });
    return fromUuid(res, name);
}

/** POST /ajax/v2/item — Non-food */
export async function createNonFood(name: string, subType: string | null = "SMALLWARE"): Promise<CreatedItem> {
    assertE2EName(name);
    const res = await post<VersionIdResponse>("/ajax/v2/item", itemV2Request({name, object_type: "NON_FOOD", object_sub_type: subType}));
    return fromVersionId(res, name);
}

/** POST /ajax/v2/item/recipe — shared by Menu, Recipe and Benchtop. */
async function postRecipe(body: Record<string, unknown>, name: string): Promise<CreatedItem> {
    const res = await post<UuidResponse>("/ajax/v2/item/recipe", {
        object_sub_type: null,
        reason_for_change: FIRST_VERSION,
        jira_link: null,
        by_product: null,
        chefs: [],
        kitchen_location_id: null,
        kitchen_sub_location_id: null,
        kitchen_sub_location_ids: null,
        labels: [],
        notes: null,
        from_component_card: null,
        restaurant_ids: null,
        unit_conversions: null,
        estimate_price: null,
        menu_mix_percent: null,
        target_food_cost_percent: null,
        out_of_stock_name: null,
        display_oos_to_customer: null,
        user_add_concept_ids: [],
        ...body,
    });
    return fromUuid(res, name);
}

/** Menu: sub type FOOD | ALCOHOLIC_BEVERAGE | NON_ALCOHOLIC_BEVERAGE. UI defaults: yield 1 ea. */
export function createMenu(name: string, subType = "FOOD"): Promise<CreatedItem> {
    assertE2EName(name);
    return postRecipe({name, object_type: "MENU", object_sub_type: subType, total_yield: 1, yield_unit: "ea", inventory_uom: "ea", bom_line_unit: "ea"}, name);
}

/** Primary recipe. UI defaults: yield 1000 g, inventory kg, BOM unit g, Display OOS on. */
export function createRecipe(name: string): Promise<CreatedItem> {
    assertE2EName(name);
    return postRecipe(
        {name, object_type: "RECIPE", object_sub_type: "PRIMARY", by_product: false, total_yield: 1000, yield_unit: "g", inventory_uom: "kg", bom_line_unit: "g", display_oos_to_customer: true},
        name
    );
}

/** Benchtop: same body as Recipe; the UI appends " [BT]" to the name. */
export function createBenchtop(name: string): Promise<CreatedItem> {
    assertE2EName(name);
    const fullName = `${name}${BENCHTOP_SUFFIX}`;
    return postRecipe(
        {name: fullName, object_type: "BENCHTOP", object_sub_type: "PRIMARY", by_product: false, total_yield: 1000, yield_unit: "g", inventory_uom: "kg", bom_line_unit: "g", display_oos_to_customer: true},
        fullName
    );
}

/** POST /ajax/v2/item — Packaged. Sub type COMMON_STOCK | KITTED | SUB_PACKAGED | BULK_KITTED. */
export async function createPackaged(name: string, subType = "COMMON_STOCK"): Promise<CreatedItem> {
    assertE2EName(name);
    const res = await post<VersionIdResponse>(
        "/ajax/v2/item",
        itemV2Request({name, object_type: "PACKAGED", object_sub_type: subType, reason_for_change: FIRST_VERSION, donatable: false, display_oos_to_customer: true, sync_to_vcs: false})
    );
    return fromVersionId(res, name);
}

export interface HdrConsumableOptions {
    readonly state?: "FROZEN" | "THAWED";
    readonly subState?: "FROZEN" | "CHILLED" | "AMBIENT";
    readonly bomLineUnit?: string;
}

/** POST /ajax/v2/item — HDR Consumable. Frozen forces sub-state FROZEN; Thawed allows CHILLED / AMBIENT. */
export async function createHdrConsumable(name: string, options: HdrConsumableOptions = {}): Promise<CreatedItem> {
    assertE2EName(name);
    const state = options.state ?? "THAWED";
    const subState = state === "FROZEN" ? "FROZEN" : options.subState && options.subState !== "FROZEN" ? options.subState : "CHILLED";
    const res = await post<VersionIdResponse>(
        "/ajax/v2/item",
        itemV2Request({name, object_type: "HDR_CONSUMABLE_ITEM", item_state: state, sub_item_state: subState, bom_line_unit: options.bomLineUnit ?? "g", display_oos_to_customer: true})
    );
    return fromVersionId(res, name);
}

/** HDR Recipe: sub type ALCOHOLIC | GRAB_AND_GO | SLACKING. The UI checks the name is free first. */
export async function createHdrRecipe(name: string, subType = "GRAB_AND_GO"): Promise<CreatedItem> {
    assertE2EName(name);
    await put<void>("/ajax/item/check-name-exist", {name});
    const res = await post<VersionIdResponse>(
        "/ajax/v2/item",
        itemV2Request({name, object_type: "HDR_RECIPE", object_sub_type: subType, reason_for_change: FIRST_VERSION, display_oos_to_customer: true})
    );
    return fromVersionId(res, name);
}

export type CreateItemType = "INGREDIENT" | "NON_FOOD" | "MENU" | "RECIPE" | "BENCHTOP" | "PACKAGED" | "HDR_CONSUMABLE_ITEM" | "HDR_RECIPE";

/** Create an item of the given type with the UI's default options. */
export function createItem(type: CreateItemType, name: string): Promise<CreatedItem> {
    switch (type) {
        case "INGREDIENT":
            return createIngredient(name);
        case "NON_FOOD":
            return createNonFood(name);
        case "MENU":
            return createMenu(name);
        case "RECIPE":
            return createRecipe(name);
        case "BENCHTOP":
            return createBenchtop(name);
        case "PACKAGED":
            return createPackaged(name);
        case "HDR_CONSUMABLE_ITEM":
            return createHdrConsumable(name);
        case "HDR_RECIPE":
            return createHdrRecipe(name);
    }
}
