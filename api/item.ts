/**
 * Item lifecycle calls that are not "edit a card": search, create a new version, delete.
 *
 * Safety: the destructive ones (create version, delete) read the item first and refuse unless its name starts
 * with e2e-auto- (assertE2EVersion); search is read-only.
 */
import {del, get, post, put} from "./client";
import {assertE2EVersion} from "./updateItem";

export interface ItemHit {
    readonly versionId: string;
    readonly itemNumber: string;
    readonly name: string;
    readonly objectType: string;
    readonly versionStatus: string;
}

interface SmartSearchResponse {
    item_versions: {id: string; item_number: string; name: string; object_type: string; version_status: string}[];
    total: number;
}

/** Every field of SearchItemAJAXRequestV2 except limit/skip, all empty (the list page sends all keys). */
export const SEARCH_BASE = {
    item_numbers: null,
    smart_search: null,
    item_name: null,
    name_or_item_number: null,
    status: null,
    object_types: null,
    statues: null,
    item_statues: null,
    version_status: null,
    concept_id: null,
    concept_ids: null,
    no_concept: null,
    exclude_alcoholic_beverages: null,
    kitchen_location_id: null,
    kitchen_location_ids: null,
    nutrition_review_status: null,
    allergens_review_status: null,
    kitting_statues: null,
    item_line_build_status: null,
    attributes: null,
    vendor_sku: null,
    orderable_status: null,
    sorting_rule: null,
    view_with_warnings: null,
    show_wonder_create_menu_items: null,
    validation_info_options: null,
    sold_status: null,
    hdr_items: null,
    is_from_hdr_list: null,
    hdr_list_data_sources: null,
};

export interface SearchOptions {
    /** default 20 */
    readonly limit?: number;
    /** default 0 */
    readonly skip?: number;
}

/** Smart Search (name or item number), the same call the Items list uses. Read-only. */
export async function searchItems(query: string, options: SearchOptions = {}): Promise<ItemHit[]> {
    const res = await put<SmartSearchResponse>("/ajax/v2/item/smart-search", {...SEARCH_BASE, smart_search: query, limit: options.limit ?? 20, skip: options.skip ?? 0});
    return res.item_versions.map(v => ({versionId: v.id, itemNumber: v.item_number, name: v.name, objectType: v.object_type, versionStatus: v.version_status}));
}

export interface NewVersionOptions {
    /** default "e2e new version" */
    readonly reason?: string;
    /** default null */
    readonly jiraLink?: string | null;
}

/** Create a new DRAFT version from an existing (published) one. Returns the new version id. */
export async function createNewVersion(sourceVersionId: string, options: NewVersionOptions = {}): Promise<string> {
    await assertE2EVersion(sourceVersionId);
    const res = await post<{item_version_id: string}>("/ajax/v2/item/version", {
        reason_for_change: options.reason ?? "e2e new version",
        jira_link: options.jiraLink ?? null,
        source_item_version_id: sourceVersionId,
    });
    return res.item_version_id;
}

/** Delete one (draft) version. */
export async function deleteVersion(versionId: string): Promise<void> {
    await assertE2EVersion(versionId);
    await del<void>(`/ajax/v2/item/version/${versionId}`);
}

/** Delete the whole item that owns this version ("Delete This Item"). Permanent. */
export async function deleteItem(versionId: string): Promise<void> {
    await assertE2EVersion(versionId);
    const {item_number} = await get<{item_number: string}>(`/ajax/v2/item/version/${versionId}`);
    await del<void>(`/ajax/v2/item/${item_number}`);
}
