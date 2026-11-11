/**
 * Read the Service Setting of a version: what the "Set require for service" modal under the Components card
 * loads (ComponentsV2/SetRequireForService/page.ts -> GET /ajax/item/version/:id/service-setting), and whose
 * `review_info` the Components card header shows as "Service Setting Reviewed".
 *
 * Read-only: no e2e-auto- name restriction. The write side is `setServiceSettingReviewed` in updateItem.ts.
 */
import {get} from "./client";

export interface ServiceSettingItemView {
    item_version_id: string;
    item_number: string;
    name: string;
    object_type: string;
    object_sub_type: string | null;
}

export interface ServiceSettingLineView {
    item: ServiceSettingItemView;
    package_items: ServiceSettingItemView[] | null;
    quantity: number | null;
    unit: string | null;
    manage_inventory: boolean | null;
    no_requires_packaging: boolean | null;
    is_pack_size_consumable: boolean | null;
}

export interface ServiceSettingResponse {
    review_info: {has_reviewed: boolean; reviewed_by: string | null; reviewed_time: string | null} | null;
    customizations: {option_id: string; option_name: string | null; type: string; option_value_id: string; option_value_name: string; items: ServiceSettingLineView[] | null}[];
    bom_line_items: ServiceSettingLineView[];
}

/** One line of the Service Setting modal. */
export interface ServiceSettingLine {
    readonly itemNumber: string;
    readonly versionId: string;
    readonly name: string;
    readonly objectType: string;
    readonly objectSubType: string | null;
    readonly quantity: number | null;
    readonly unit: string | null;
    /** "Required for service" (manage_inventory) */
    readonly required: boolean | null;
    readonly noRequiresPackaging: boolean | null;
}

export interface ServiceSettingCustomization {
    readonly optionId: string;
    readonly optionName: string | null;
    readonly optionValueId: string;
    readonly optionValueName: string;
    readonly lines: ServiceSettingLine[];
}

export interface ServiceSettingCard {
    readonly reviewed: boolean;
    readonly reviewedBy: string | null;
    readonly reviewedTime: string | null;
    /** the item's own BOM lines */
    readonly lines: ServiceSettingLine[];
    /** per customization option value, the lines it adds */
    readonly customizations: ServiceSettingCustomization[];
}

const PATH = (versionId: string) => `/ajax/item/version/${versionId}/service-setting`;

/** Raw response, as the UI receives it (used by the write side too). */
export async function fetchServiceSetting(versionId: string): Promise<ServiceSettingResponse> {
    return get<ServiceSettingResponse>(PATH(versionId));
}

const toLine = (line: ServiceSettingLineView): ServiceSettingLine => ({
    itemNumber: line.item.item_number,
    versionId: line.item.item_version_id,
    name: line.item.name,
    objectType: line.item.object_type,
    objectSubType: line.item.object_sub_type,
    quantity: line.quantity,
    unit: line.unit,
    required: line.manage_inventory,
    noRequiresPackaging: line.no_requires_packaging,
});

export async function getServiceSetting(versionId: string): Promise<ServiceSettingCard> {
    const res = await fetchServiceSetting(versionId);
    return {
        reviewed: res.review_info?.has_reviewed ?? false,
        reviewedBy: res.review_info?.reviewed_by ?? null,
        reviewedTime: res.review_info?.reviewed_time ?? null,
        lines: res.bom_line_items.map(toLine),
        customizations: res.customizations.map(c => ({
            optionId: c.option_id,
            optionName: c.option_name,
            optionValueId: c.option_value_id,
            optionValueName: c.option_value_name,
            lines: (c.items ?? []).map(toLine),
        })),
    };
}
