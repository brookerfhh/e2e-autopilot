/**
 * Card edits through the same endpoints the UI saves with. Every function takes the version id
 * (CreatedItem.versionId) as the required first argument, then an options object: required values are
 * positional/mandatory in the type, optional ones fall back to the defaults documented per function.
 *
 * Safety: each function first reads the item and refuses unless its name starts with e2e-auto-
 * (assertE2EVersion), so a wrong id can never edit real QA data.
 *
 * Pattern: GET the current state -> overlay only the fields the caller asked to change -> PUT it back,
 * because these endpoints overwrite the whole object.
 */
import {assertE2EName, get, put} from "./client";

interface NamedItem {
    name: string;
}

export async function assertE2EVersion(versionId: string): Promise<void> {
    const item = await get<NamedItem>(`/ajax/v2/item/version/${versionId}`);
    assertE2EName(item.name);
}

// ---------------------------------------------------------------------------------------------
// Item Information for V2 items: Non-food / HDR Consumable / Packaged  (GET/PUT /ajax/v2/item/version/:id)
// ---------------------------------------------------------------------------------------------

interface ItemV2Get {
    name: string;
    object_type: string;
    object_sub_type: string | null;
    bom_line_unit: string;
    inventory_uom: string | null;
    donatable: boolean | null;
    restaurants: {id: string}[] | null;
    user_add_concepts: ConceptView[] | null;
    reason_for_change: string | null;
    jira_link: string | null;
    transfer_cost_is_exclusivity: boolean | null;
    transfer_cost: unknown;
    current_state_transfer_cost: unknown;
    landed_cost: unknown;
    out_of_stock_name: string | null;
    display_oos_to_customer: boolean | null;
    orderable: boolean | null;
    hide_flag: boolean | null;
    link_consumable_item: unknown;
    accounting_type: string | null;
    accounting_sub_type: string | null;
    stock_uom: string | null;
    sync_to_vcs: boolean | null;
    base_uom: string | null;
    pack_size_qty_per_pk: number | null;
    sub_item_state: string | null;
}

/** Every field is optional: only what is given changes, the rest is written back as it is. */
export interface ItemInfoChanges {
    readonly name?: string;
    readonly objectSubType?: string | null;
    readonly outOfStockName?: string | null;
    readonly displayOosToCustomer?: boolean | null;
    readonly jiraLink?: string | null;
    readonly reasonForChange?: string | null;
    readonly orderable?: boolean | null;
    readonly donatable?: boolean | null;
    readonly syncToVcs?: boolean | null;
}

/** Edit Item Information of a Non-food / HDR Consumable / Packaged version. Same save as the edit page. */
export async function updateItemInfo(versionId: string, changes: ItemInfoChanges): Promise<void> {
    await assertE2EVersion(versionId);
    const d = await get<ItemV2Get>(`/ajax/v2/item/version/${versionId}`);
    const name = changes.name ?? d.name;
    assertE2EName(name);
    await put<void>(`/ajax/v2/item/version/${versionId}`, {
        name,
        object_type: d.object_type,
        object_sub_type: changes.objectSubType === undefined ? d.object_sub_type : changes.objectSubType,
        bom_line_unit: d.bom_line_unit,
        donatable: changes.donatable === undefined ? d.donatable : changes.donatable,
        restaurant_ids: d.restaurants?.map(r => r.id) ?? null,
        user_add_concept_ids: (d.user_add_concepts ?? []).map(c => c.id),
        reason_for_change: changes.reasonForChange === undefined ? d.reason_for_change : changes.reasonForChange,
        jira_link: changes.jiraLink === undefined ? d.jira_link : changes.jiraLink,
        inventory_unit: d.inventory_uom,
        transfer_cost_is_exclusivity: d.transfer_cost_is_exclusivity,
        transfer_cost: d.transfer_cost ?? null,
        current_state_transfer_cost: d.current_state_transfer_cost ?? null,
        landed_cost: d.landed_cost ?? null,
        out_of_stock_name: changes.outOfStockName === undefined ? d.out_of_stock_name : changes.outOfStockName,
        display_oos_to_customer: changes.displayOosToCustomer === undefined ? d.display_oos_to_customer : changes.displayOosToCustomer,
        orderable: changes.orderable === undefined ? d.orderable : changes.orderable,
        hide_flag: d.hide_flag ?? null,
        link_consumable_item: d.link_consumable_item ?? null,
        skip_validate_for_update_link_consumable_item: false,
        accounting_type: d.accounting_type,
        accounting_sub_type: d.accounting_sub_type,
        stock_uom: d.stock_uom,
        sync_to_vcs: changes.syncToVcs === undefined ? d.sync_to_vcs : changes.syncToVcs,
        base_uom: d.base_uom,
        pack_size_qty_per_pk: d.pack_size_qty_per_pk,
        sub_item_state: d.sub_item_state,
    });
}

// ---------------------------------------------------------------------------------------------
// Ingredient Item Information  (GET/PUT /ajax/v2/item/version/:id/ingredient)
// ---------------------------------------------------------------------------------------------

interface IngredientGet {
    name: string;
    object_type: string;
    object_sub_type: string | null;
    item_type: {id: string} | null;
    notes: string | null;
    bom_line_unit: string;
    reason_for_change: string | null;
    jira_link: string | null;
    transfer_cost_is_exclusivity: boolean | null;
    transfer_cost: unknown;
    current_state_transfer_cost: unknown;
    landed_cost: unknown;
    orderable: boolean | null;
    estimate_price: number | null;
    out_of_stock_name: string | null;
    display_oos_to_customer: boolean | null;
    r_and_d_only: boolean | null;
    user_add_concepts: {id: string}[] | null;
    stock_uom: string | null;
}

export interface IngredientInfoChanges {
    readonly stockUom?: string | null;
    readonly outOfStockName?: string | null;
    readonly displayOosToCustomer?: boolean | null;
    readonly jiraLink?: string | null;
    readonly reasonForChange?: string | null;
    readonly notes?: string | null;
}

/** Edit an Ingredient's Item Information (Stock UOM, Out of Stock Name, ...). Only the given fields change. */
export async function updateIngredientInfo(versionId: string, changes: IngredientInfoChanges): Promise<void> {
    await assertE2EVersion(versionId);
    const path = `/ajax/v2/item/version/${versionId}/ingredient`;
    const d = await get<IngredientGet>(path);
    const pick = <T>(changed: T | undefined, current: T): T => (changed === undefined ? current : changed);
    await put<void>(path, {
        name: d.name,
        object_type: d.object_type,
        object_sub_type: d.object_sub_type,
        item_type_id: d.item_type?.id ?? null,
        notes: pick(changes.notes, d.notes),
        bom_line_unit: d.bom_line_unit,
        reason_for_change: pick(changes.reasonForChange, d.reason_for_change),
        jira_link: pick(changes.jiraLink, d.jira_link),
        transfer_cost_is_exclusivity: d.transfer_cost_is_exclusivity,
        transfer_cost: d.transfer_cost ?? null,
        current_state_transfer_cost: d.current_state_transfer_cost ?? null,
        landed_cost: d.landed_cost ?? null,
        orderable: d.orderable,
        estimate_price: d.estimate_price,
        out_of_stock_name: pick(changes.outOfStockName, d.out_of_stock_name),
        display_oos_to_customer: pick(changes.displayOosToCustomer, d.display_oos_to_customer),
        r_and_d_only: d.r_and_d_only,
        user_add_concept_ids: (d.user_add_concepts ?? []).map(c => c.id),
        stock_uom: pick(changes.stockUom, d.stock_uom),
    });
}

// ---------------------------------------------------------------------------------------------
// Concept (Menu / Recipe Item Information)  (GET /ajax/concept, GET/PUT /ajax/v2/item/version/:id/recipe)
// ---------------------------------------------------------------------------------------------

interface ConceptView {
    id: string;
    name: string;
}
interface RecipeDetailGet {
    name: string;
    object_type: string;
    object_sub_type: string | null;
    by_product: boolean | null;
    chefs: unknown[] | null;
    total_yield: number | null;
    yield_unit: string | null;
    price: number | null;
    user_add_concepts: ConceptView[] | null;
    kitchen_location: {id: string} | null;
    kitchen_sub_location: {id: string} | null;
    kitchen_sub_locations: {id: string}[] | null;
    labels: {name: string; value: string | null; uuid: string | null}[] | null;
    notes: string | null;
    reason_for_change: string | null;
    jira_link: string | null;
    inventory_uom: string | null;
    bom_line_unit: string | null;
    restaurants: {id: string}[] | null;
    unit_conversions: unknown[] | null;
    estimate_price: number | null;
    menu_mix_percent: number | null;
    target_food_cost_percent: number | null;
    out_of_stock_name: string | null;
    display_oos_to_customer: boolean | null;
}

/** Concept id by exact name (GET /ajax/concept). Throws if there is no match or more than one. */
export async function findConceptId(name: string): Promise<string> {
    const {concepts} = await get<{concepts: ConceptView[]}>("/ajax/concept");
    const matches = concepts.filter(c => c.name === name);
    if (matches.length !== 1) {
        throw new Error(`Concept "${name}": expected exactly 1 match, found ${matches.length}`);
    }
    return matches[0].id;
}

export interface ConceptOptions {
    /** default false: add to the item's existing concepts. true: replace them. */
    readonly replace?: boolean;
}

/** Tag a Menu / Recipe with concepts, given by exact name. Same save the "Edit Item" modal does. */
export async function setConcept(versionId: string, concepts: readonly string[], options: ConceptOptions = {}): Promise<string[]> {
    await assertE2EVersion(versionId);
    const path = `/ajax/v2/item/version/${versionId}/recipe`;
    const d = await get<RecipeDetailGet>(path);
    const wanted = await Promise.all(concepts.map(findConceptId));
    const existing = (d.user_add_concepts ?? []).map(c => c.id);
    const ids = [...new Set(options.replace ? wanted : [...existing, ...wanted])];
    await put<unknown>(path, {
        name: d.name,
        object_type: d.object_type,
        object_sub_type: d.object_sub_type,
        by_product: d.by_product,
        chefs: d.chefs ?? [],
        total_yield: d.total_yield,
        yield_unit: d.yield_unit,
        price: d.price,
        user_add_concept_ids: ids,
        kitchen_location_id: d.kitchen_location?.id ?? null,
        kitchen_sub_location_id: d.kitchen_sub_location?.id ?? null,
        kitchen_sub_location_ids: d.kitchen_sub_locations?.map(l => l.id) ?? null,
        labels: (d.labels ?? []).map(l => ({name: l.name, value: l.value, uuid: l.uuid})),
        notes: d.notes,
        reason_for_change: d.reason_for_change,
        jira_link: d.jira_link,
        inventory_uom: d.inventory_uom,
        bom_line_unit: d.bom_line_unit,
        restaurant_ids: d.restaurants?.map(r => r.id) ?? null,
        unit_conversions: d.unit_conversions ?? [],
        estimate_price: d.estimate_price,
        menu_mix_percent: d.menu_mix_percent,
        target_food_cost_percent: d.target_food_cost_percent,
        out_of_stock_name: d.out_of_stock_name,
        display_oos_to_customer: d.display_oos_to_customer,
    });
    return ids;
}

// ---------------------------------------------------------------------------------------------
// Service Setting  (GET/PUT /ajax/item/version/:id/service-setting)
// ---------------------------------------------------------------------------------------------

interface ServiceSettingItem {
    item: {item_version_id: string; object_type: string};
    manage_inventory: boolean | null;
}
interface ServiceSettingGet {
    review_info: unknown;
    customizations: {option_id: string; option_value_id: string; items: ServiceSettingItem[] | null}[];
    bom_line_items: ServiceSettingItem[];
}

const toBomItem = (it: ServiceSettingItem) => ({item_version_id: it.item.item_version_id, manage_inventory: it.manage_inventory ?? it.item.object_type !== "NON_FOOD"});

export interface ServiceSettingOptions {
    /** default true */
    readonly reviewed?: boolean;
}

export async function setServiceSettingReviewed(versionId: string, options: ServiceSettingOptions = {}): Promise<void> {
    await assertE2EVersion(versionId);
    const current = await get<ServiceSettingGet>(`/ajax/item/version/${versionId}/service-setting`);
    await put<void>(`/ajax/item/version/${versionId}/service-setting`, {
        reviewed: options.reviewed ?? true,
        customizations: current.customizations.map(c => ({option_id: c.option_id, option_value_id: c.option_value_id, items: (c.items ?? []).map(toBomItem)})),
        bom_line_items: current.bom_line_items.map(toBomItem),
    });
}

// ---------------------------------------------------------------------------------------------
// Packaged SKUs  (GET/PUT /ajax/item/version/:id/package-sku/{list,update})
// ---------------------------------------------------------------------------------------------

interface PackageSkuConfigView {
    item_number: string | null;
    consumable_item_number: string | null;
    service_locations: string[] | null;
    pan_size: string | null;
    smallware_tool_first_level: string | null;
    smallware_tool_second_level: string | null;
}
interface PackageSkuView {
    consumable_item: {item_version_id: string; customization_option_value_id: string | null};
    package_sku_configs: PackageSkuConfigView[] | null;
}

export interface PackageSkuOptions {
    /** default ["N/A"] */
    readonly serviceLocations?: readonly string[];
    /** default "N/A" (first level); second level default null */
    readonly smallwareTool?: readonly [string, string?];
    /** default "N/A" */
    readonly panSize?: string;
}

/** Sets the required selects on every packaged SKU row that has a config. The item must already have a packaged SKU. */
export async function setPackageSku(versionId: string, options: PackageSkuOptions = {}): Promise<number> {
    await assertE2EVersion(versionId);
    const [firstLevel, secondLevel] = options.smallwareTool ?? ["N/A"];
    const list = await get<{package_sku_list: PackageSkuView[] | null}>(`/ajax/item/version/${versionId}/package-sku/list`);
    const package_skus = (list.package_sku_list ?? [])
        .filter(sku => sku.package_sku_configs?.length)
        .map(sku => ({
            consumable_item_version_uuid: sku.consumable_item.item_version_id,
            consumable_customization_option_value_id: sku.consumable_item.customization_option_value_id,
            package_sku_configs: (sku.package_sku_configs ?? []).map(c => ({
                item_number: c.item_number,
                consumable_item_number: c.consumable_item_number,
                service_locations: [...(options.serviceLocations ?? ["N/A"])],
                pan_size: options.panSize ?? "N/A",
                smallware_tool_first_level: firstLevel,
                smallware_tool_second_level: secondLevel ?? null,
            })),
        }));
    if (!package_skus.length) {
        throw new Error("Item has no packaged SKU rows to configure (add a component first)");
    }
    await put<void>(`/ajax/item/version/${versionId}/package-sku/update`, {package_skus});
    return package_skus.length;
}

// ---------------------------------------------------------------------------------------------
// Nutrition (Menu)  (GET/PUT /ajax/item/version/:id/customization/nutrition)
//
// A Menu keeps its nutrition in itemCustomizationNutrition, NOT in recipe.nutrition — the publish validation
// ("Nutrition (missing)") reads that one. recipe/nutrition below is for Recipe / Benchtop only.
// ---------------------------------------------------------------------------------------------

interface MenuNutritionGet {
    yield_unit: string | null;
    customization_nutrition: {serving_size_unit: string | null; dietary_flags: string[] | null; nutrition_notes: string | null; nutrition_fact: NutritionFact | null} | null;
    recommend_nutrition_fact: NutritionFact | null;
    recipe_items: {uuid: string; item_version_id: string; contribution_percent: number | null}[] | null;
}

export interface MenuNutritionOptions {
    /** default true */
    readonly reviewed?: boolean;
    /** nutrient overrides; others use the calculated (recommended) value, else 0 */
    readonly nutrients?: Partial<NutritionFact>;
    /** default 1 (UI default: servings per dish 1) */
    readonly servingsPerDish?: number;
    readonly notes?: string | null;
}

export async function setMenuNutritionReviewed(versionId: string, options: MenuNutritionOptions = {}): Promise<void> {
    await assertE2EVersion(versionId);
    const path = `/ajax/item/version/${versionId}/customization/nutrition`;
    const current = await get<MenuNutritionGet>(path);
    const servingsPerDish = options.servingsPerDish ?? 1;
    const saved = current.customization_nutrition?.nutrition_fact;

    const nutrition_fact: Record<string, number> = {};
    for (const key of NUTRIENT_KEYS) {
        nutrition_fact[key] = options.nutrients?.[key] ?? saved?.[key] ?? current.recommend_nutrition_fact?.[key] ?? 0;
    }
    await put<void>(path, {
        serving_size: +(1 / servingsPerDish).toFixed(3),
        serving_size_unit: current.customization_nutrition?.serving_size_unit ?? current.yield_unit,
        nutrition_fact,
        customization_config: {discrete_unit: false, servings_size_quantity: "1", servings_size_unit: "Dish", servings_per_dish: servingsPerDish},
        dietary_flags: (current.customization_nutrition?.dietary_flags ?? []).filter(f => f !== "GLUTEN_FREE"),
        recipe_items: (current.recipe_items ?? []).map(it => ({uuid: it.uuid, item_version_id: it.item_version_id, nutrients_contribution_percent: it.contribution_percent ?? 1})),
        nutrition_reviewed: options.reviewed ?? true,
        nutrition_notes: options.notes === undefined ? (current.customization_nutrition?.nutrition_notes ?? null) : options.notes,
        sugar_warning: null,
        hide_gf_and_gfo_from_wonder_app: null,
    });
}

// ---------------------------------------------------------------------------------------------
// Nutrition (Recipe / Benchtop)  (GET/PUT /ajax/v2/item/version/:id/recipe/nutrition)
// ---------------------------------------------------------------------------------------------

const NUTRIENT_KEYS = [
    "calories_k_cal",
    "total_fat_g",
    "saturated_fat_g",
    "trans_fat_g",
    "cholesterol_mg",
    "sodium_mg",
    "carbs_g",
    "fiber_g",
    "sugar_g",
    "protein_g",
    "add_sugar_g",
    "vitamin_d_mcg",
    "calcium_mg",
    "iron_mg",
    "potassium_mg",
] as const;
type NutrientKey = (typeof NUTRIENT_KEYS)[number];
type NutritionFact = Record<NutrientKey, number | null>;

interface RecipeNutritionGet {
    serving_size: number | null;
    serving_size_unit: string | null;
    dietary_flags: string[] | null;
    nutrition_fact: NutritionFact | null;
    origin_nutrition_fact: NutritionFact | null;
    recipe_items: {uuid: string; contribution_percent: number | null}[] | null;
    nutrition_reviewed_info: {has_reviewed: boolean};
    nutrition_notes: string | null;
}

export interface NutritionOptions {
    /** default true. Editing nutrients un-reviews, so the flag is sent in the same request. */
    readonly reviewed?: boolean;
    /** nutrient overrides; any key not given keeps its current value, or 0 when empty (the UI requires all to be filled) */
    readonly nutrients?: Partial<NutritionFact>;
    readonly notes?: string | null;
}

export async function setNutritionReviewed(versionId: string, options: NutritionOptions = {}): Promise<void> {
    await assertE2EVersion(versionId);
    const path = `/ajax/v2/item/version/${versionId}/recipe/nutrition`;
    const current = await get<RecipeNutritionGet>(path);
    const origin = current.origin_nutrition_fact;

    const body: Record<string, unknown> = {};
    for (const key of NUTRIENT_KEYS) {
        const value = options.nutrients?.[key] ?? current.nutrition_fact?.[key] ?? 0;
        body[key] = value;
        // The UI sends <key>_input only for values the user changed away from the calculated one.
        const originalValue = origin?.[key] ?? null;
        if (value !== 0 && Number(value) !== Number(originalValue)) {
            body[`${key}_input`] = value;
        } else if (value === 0 && originalValue !== 0) {
            body[`${key}_input`] = value;
        }
    }
    await put<void>(path, {
        ...body,
        quantity: current.serving_size,
        unit: current.serving_size_unit,
        dietary_flags: (current.dietary_flags ?? []).filter(f => f !== "GLUTEN_FREE"),
        recipe_items: (current.recipe_items ?? []).map(it => ({uuid: it.uuid, nutrients_contribution_percent: it.contribution_percent ?? 1})),
        nutrition_reviewed: options.reviewed ?? true,
        nutrition_notes: options.notes === undefined ? current.nutrition_notes : options.notes,
    });
}
