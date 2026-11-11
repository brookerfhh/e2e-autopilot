/**
 * Read the Components card of the item detail page (page/item/detail/components/ComponentsV2) through the
 * endpoint the card loads: GET /ajax/item/version/:id/component-bom/display.
 *
 * The response is flat: one node per distinct item keyed by `hash` (the root item has hash null), and the
 * root's `components` / `bom_lines` entries point at those nodes by hash while carrying the line-level fields
 * (quantity, unit, Required = manage_inventory, ...). The card picks the list by `show_type`
 *   COMPONENT -> root.components             (component-only, no saved BOM)
 *   BOM       -> expanded_bom_lines root.bom_lines   (Menu / Recipe with a saved BOM)
 * and rebuilds a tree (ComponentsV2/utils/transToTree.tsx). This module does the same and keeps the columns
 * the card shows. HDR Consumable (40*) uses its own Production BOM card and answers show_type null here.
 *
 * Read-only: no e2e-auto- name restriction.
 */
import {get} from "./client";

type ShowType = "COMPONENT" | "BOM";

interface LineFields {
    uuid: string | null;
    quantity: number | null;
    unit: string | null;
    manage_inventory: boolean | null;
}

interface Node extends Partial<LineFields> {
    hash: string | null;
    item_version_id: string;
    item_number: string;
    name: string;
    object_type: string;
    object_sub_type: string | null;
    version_status: string;
    version: number;
    item_status: string | null;
    cost: number | null;
    scrap_yield: number | null;
    lead_time_day: number | null;
    components?: Node[] | null;
    bom_lines?: Node[] | null;
}

interface DisplayResponse {
    show_type: ShowType | null;
    object_type: string;
    version_status: string;
    components: Node[] | null;
    expanded_bom_lines: Node[] | null;
    service_setting_review_info: {has_reviewed: boolean; reviewed_by: string | null; reviewed_time: string | null} | null;
    total_yield: number | null;
    manual_yield: boolean | null;
}

/** One row of the Components card (the columns the card shows), with nested rows in `children`. */
export interface ComponentRow {
    readonly uuid: string | null;
    readonly itemNumber: string;
    readonly versionId: string;
    readonly name: string;
    readonly objectType: string;
    readonly objectSubType: string | null;
    readonly itemStatus: string | null;
    readonly version: number;
    readonly versionStatus: string;
    readonly quantity: number | null;
    readonly unit: string | null;
    /** the "Required" column (require for service) */
    readonly required: boolean | null;
    readonly cost: number | null;
    readonly scrapYield: number | null;
    readonly leadTimeDay: number | null;
    readonly children: ComponentRow[];
}

export interface ComponentsCard {
    readonly showType: ShowType | null;
    readonly objectType: string;
    readonly versionStatus: string;
    /** Service Setting "reviewed" flag the card header shows */
    readonly serviceSettingReviewed: boolean;
    readonly totalYield: number | null;
    readonly manualYield: boolean | null;
    /** top-level rows, in card order */
    readonly rows: ComponentRow[];
}

const DISPLAY_PATH = (versionId: string) => `/ajax/item/version/${versionId}/component-bom/display`;

function toRow(line: Node, byHash: ReadonlyMap<string, Node>, key: "components" | "bom_lines"): ComponentRow {
    const merged: Node = {...(line.hash ? byHash.get(line.hash) : undefined), ...line};
    return {
        uuid: merged.uuid ?? null,
        itemNumber: merged.item_number,
        versionId: merged.item_version_id,
        name: merged.name,
        objectType: merged.object_type,
        objectSubType: merged.object_sub_type,
        itemStatus: merged.item_status,
        version: merged.version,
        versionStatus: merged.version_status,
        quantity: merged.quantity ?? null,
        unit: merged.unit ?? null,
        required: merged.manage_inventory ?? null,
        cost: merged.cost,
        scrapYield: merged.scrap_yield,
        leadTimeDay: merged.lead_time_day,
        children: (merged[key] ?? []).map(child => toRow(child, byHash, key)),
    };
}

function treeOf(list: Node[] | null, key: "components" | "bom_lines"): ComponentRow[] {
    if (!list) {
        return [];
    }
    const root = list.find(n => !n.hash);
    const byHash = new Map(list.filter(n => n.hash).map(n => [n.hash as string, n]));
    return (root?.[key] ?? []).map(line => toRow(line, byHash, key));
}

/** The whole Components card of a version, rows picked by show_type exactly like the UI. */
export async function getComponentsCard(versionId: string): Promise<ComponentsCard> {
    const res = await get<DisplayResponse>(DISPLAY_PATH(versionId));
    const rows = res.show_type === "BOM" ? treeOf(res.expanded_bom_lines, "bom_lines") : res.show_type === "COMPONENT" ? treeOf(res.components, "components") : [];
    return {
        showType: res.show_type,
        objectType: res.object_type,
        versionStatus: res.version_status,
        serviceSettingReviewed: res.service_setting_review_info?.has_reviewed ?? false,
        totalYield: res.total_yield,
        manualYield: res.manual_yield,
        rows,
    };
}

/** Top-level rows of the Components card. */
export async function getComponentRows(versionId: string): Promise<ComponentRow[]> {
    return (await getComponentsCard(versionId)).rows;
}

/** The top-level row for an item number, or undefined when the card does not list it. */
export async function findComponentRow(versionId: string, itemNumber: string): Promise<ComponentRow | undefined> {
    return (await getComponentRows(versionId)).find(row => row.itemNumber === itemNumber);
}
