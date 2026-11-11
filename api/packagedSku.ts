/**
 * Read the Packaged SKUs card (ComponentsV2/PackagedSKU) through the endpoint it loads:
 * GET /ajax/item/version/:id/package-sku/list (ComponentsV2/page.ts getDisplayDetailById).
 *
 * One entry per consumable component (`consumable_item`), each with its stockable rows (`package_sku_configs`,
 * the item info merged from `stockable_item_info`). The card table (PackagedSKU/util.tsx formatSKUList + flatSKUList)
 * shows, per entry, the consumable as a parent row followed by one row per config — except when a config IS the
 * consumable itself (same item number), which then becomes the parent row. Entries without configs show only when
 * `show_when_package_sku_configs_is_empty`. `getPackagedSkuTableRows` reproduces that order.
 *
 * Read-only: no e2e-auto- name restriction. The write side is `setPackageSku` in updateItem.ts.
 */
import {get} from "./client";

export interface PackageSkuConfigView {
    stockable_item_info: {item_version_id?: string; item_number: string; name: string; object_type: string; object_sub_type: string | null} | null;
    consumable_item_number: string | null;
    item_number: string | null;
    service_locations: string[] | null;
    pan_size: string | null;
    smallware_tool_first_level: string | null;
    smallware_tool_second_level: string | null;
}

export interface PackageSkuView {
    consumable_item: {
        item_version_id: string;
        item_number: string;
        name: string;
        object_type: string;
        object_sub_type: string | null;
        item_status: string | null;
        version_status: string | null;
        customization_option_value_id: string | null;
        customization_option_value_name: string | null;
        usage_quantity: number | null;
        usage_unit: string | null;
    };
    package_sku_configs: PackageSkuConfigView[] | null;
    show_when_package_sku_configs_is_empty: boolean | null;
}

export interface PackageSkuListResponse {
    package_sku_list: PackageSkuView[] | null;
}

/** The three editable selects of a stockable row (the card's Service location / smallware tool / pan size columns). */
export interface PackagedSkuConfig {
    readonly itemNumber: string | null;
    readonly name: string | null;
    readonly objectType: string | null;
    readonly objectSubType: string | null;
    readonly serviceLocations: string[];
    /** [first level, second level] */
    readonly smallwareTool: readonly [string | null, string | null];
    readonly panSize: string | null;
}

export interface PackagedSku {
    readonly consumable: {
        readonly itemNumber: string;
        readonly versionId: string;
        readonly name: string;
        readonly objectType: string;
        readonly objectSubType: string | null;
        readonly itemStatus: string | null;
        /** set when the consumable comes from a customization option value */
        readonly customizationOptionValueName: string | null;
    };
    readonly configs: PackagedSkuConfig[];
    readonly showWhenEmpty: boolean;
}

/** One row of the card table, in card order. */
export interface PackagedSkuTableRow {
    readonly kind: "consumable" | "stockable" | "consumableAndStockable";
    readonly consumableItemNumber: string;
    readonly itemNumber: string | null;
    readonly name: string | null;
    readonly objectType: string | null;
    readonly objectSubType: string | null;
    readonly serviceLocations: string[];
    readonly smallwareTool: readonly [string | null, string | null];
    readonly panSize: string | null;
}

const PATH = (versionId: string) => `/ajax/item/version/${versionId}/package-sku/list`;

/** Raw response, as the UI receives it (used by the write side too). */
export async function fetchPackageSkuList(versionId: string): Promise<PackageSkuListResponse> {
    return get<PackageSkuListResponse>(PATH(versionId));
}

const toConfig = (c: PackageSkuConfigView): PackagedSkuConfig => ({
    itemNumber: c.item_number ?? c.stockable_item_info?.item_number ?? null,
    name: c.stockable_item_info?.name ?? null,
    objectType: c.stockable_item_info?.object_type ?? null,
    objectSubType: c.stockable_item_info?.object_sub_type ?? null,
    serviceLocations: c.service_locations ?? [],
    smallwareTool: [c.smallware_tool_first_level, c.smallware_tool_second_level],
    panSize: c.pan_size,
});

export async function getPackagedSkus(versionId: string): Promise<PackagedSku[]> {
    const res = await fetchPackageSkuList(versionId);
    return (res.package_sku_list ?? []).map(sku => ({
        consumable: {
            itemNumber: sku.consumable_item.item_number,
            versionId: sku.consumable_item.item_version_id,
            name: sku.consumable_item.name,
            objectType: sku.consumable_item.object_type,
            objectSubType: sku.consumable_item.object_sub_type,
            itemStatus: sku.consumable_item.item_status,
            customizationOptionValueName: sku.consumable_item.customization_option_value_name,
        },
        configs: (sku.package_sku_configs ?? []).map(toConfig),
        showWhenEmpty: sku.show_when_package_sku_configs_is_empty ?? false,
    }));
}

const EMPTY_CONFIG = {serviceLocations: [] as string[], smallwareTool: [null, null] as const, panSize: null};

const stockableRow = (sku: PackagedSku, c: PackagedSkuConfig, kind: PackagedSkuTableRow["kind"]): PackagedSkuTableRow => ({
    kind,
    consumableItemNumber: sku.consumable.itemNumber,
    itemNumber: c.itemNumber,
    name: c.name,
    objectType: c.objectType,
    objectSubType: c.objectSubType,
    serviceLocations: c.serviceLocations,
    smallwareTool: c.smallwareTool,
    panSize: c.panSize,
});

const consumableRow = (sku: PackagedSku): PackagedSkuTableRow => ({
    kind: "consumable",
    consumableItemNumber: sku.consumable.itemNumber,
    itemNumber: sku.consumable.itemNumber,
    name: sku.consumable.name,
    objectType: sku.consumable.objectType,
    objectSubType: sku.consumable.objectSubType,
    ...EMPTY_CONFIG,
});

/** The card table rows in the order the UI shows them (flatSKUList). */
export function toPackagedSkuTableRows(skus: readonly PackagedSku[]): PackagedSkuTableRow[] {
    return skus.flatMap(sku => {
        if (!sku.configs.length) {
            return sku.showWhenEmpty ? [consumableRow(sku)] : [];
        }
        const self = sku.configs.find(c => c.itemNumber === sku.consumable.itemNumber);
        if (self) {
            return [stockableRow(sku, self, "consumableAndStockable"), ...sku.configs.filter(c => c !== self).map(c => stockableRow(sku, c, "stockable"))];
        }
        return [consumableRow(sku), ...sku.configs.map(c => stockableRow(sku, c, "stockable"))];
    });
}

export async function getPackagedSkuTableRows(versionId: string): Promise<PackagedSkuTableRow[]> {
    return toPackagedSkuTableRows(await getPackagedSkus(versionId));
}
