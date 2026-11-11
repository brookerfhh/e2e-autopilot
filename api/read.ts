/**
 * Read an item the way the item detail page does (page/item/detail/utils/useGetItemDetailByItemNumber +
 * the HDR Consumable / WSKU useRefreshDetails hooks): the item number prefix picks the page, then the
 * object type picks the detail endpoint.
 *
 *   40*            -> HDR Consumable   GET /ajax/item/hdr-consumable/version/:id
 *   41*, 42*, 49*  -> WSKU             GET /ajax/item/wsku/version/:id
 *   other          -> by object type:
 *        INGREDIENT, BY_PRODUCT, BENCHTOP(by-product)     GET /ajax/v2/item/version/:id/ingredient
 *        RECIPE, MENU, BENCHTOP                           GET /ajax/v2/item/version/:id/recipe
 *        PACKAGED, NON_FOOD, HDR_RECIPE, ...              GET /ajax/v2/item/version/:id           ("generic")
 *
 * Read-only, so unlike the write functions it does NOT require the e2e-auto- name prefix.
 */
import {ApiError, get, put} from "./client";
import {getComponentRows} from "./components";
import {appUrl} from "./env";
import {searchItems} from "./item";

export type Family = "recipe" | "ingredient" | "generic" | "hdrConsumable" | "wsku";

/** Exactly one of versionId / itemNumber / name. */
export interface ItemRef {
    readonly versionId?: string;
    readonly itemNumber?: string;
    /** exact item name; must match exactly one item */
    readonly name?: string;
    /**
     * Which version to take when only an item number / name is given.
     * "published" (default): the effective (published) version — what the UI opens without ?version_id.
     * "latest": the newest version, e.g. a DRAFT created after the published one.
     */
    readonly version?: "published" | "latest";
}

export interface ResolvedItem {
    readonly versionId: string;
    readonly itemNumber: string;
    readonly name: string;
    readonly objectType: string;
    readonly objectSubType: string | null;
    readonly versionStatus: string;
    readonly family: Family;
}

const WSKU_PREFIXES = ["41", "42", "49"] as const;
const HDR_CONSUMABLE_PREFIX = "40";

export const isWskuItemNumber = (itemNumber: string): boolean => WSKU_PREFIXES.some(p => itemNumber.startsWith(p));

/** Same dispatch as the UI. */
export function familyOf(itemNumber: string, objectType: string, objectSubType: string | null): Family {
    if (isWskuItemNumber(itemNumber)) {
        return "wsku";
    }
    if (itemNumber.startsWith(HDR_CONSUMABLE_PREFIX)) {
        return "hdrConsumable";
    }
    if (objectType === "INGREDIENT" || objectType === "BY_PRODUCT" || (objectType === "BENCHTOP" && objectSubType === "BY_PRODUCT")) {
        return "ingredient";
    }
    if (["RECIPE", "MENU", "BENCHTOP", "ORIGINAL", "ORIGINAL_SUBRECIPE"].includes(objectType)) {
        return "recipe";
    }
    return "generic";
}

interface BaseView {
    item_number: string;
    version_id?: string;
    name: string;
    object_type: string;
    object_sub_type: string | null;
    version_status: string;
}

/** Fill in everything about a version we already know the id of. */
async function describeVersion(versionId: string, itemNumberHint?: string): Promise<ResolvedItem> {
    const wskuFirst = itemNumberHint !== undefined && isWskuItemNumber(itemNumberHint);
    const paths = wskuFirst ? [`/ajax/item/wsku/version/${versionId}`, `/ajax/v2/item/version/${versionId}`] : [`/ajax/v2/item/version/${versionId}`, `/ajax/item/wsku/version/${versionId}`];
    let base: BaseView | undefined;
    let lastError: unknown;
    for (const path of paths) {
        try {
            base = await get<BaseView>(path);
            break;
        } catch (error) {
            lastError = error;
            if (!(error instanceof ApiError) || error.status !== 404) {
                throw error;
            }
        }
    }
    if (!base) {
        throw lastError instanceof Error ? lastError : new Error(`version ${versionId} not found`);
    }
    return {
        versionId,
        itemNumber: base.item_number,
        name: base.name,
        objectType: base.object_type,
        objectSubType: base.object_sub_type,
        versionStatus: base.version_status,
        family: familyOf(base.item_number, base.object_type, base.object_sub_type),
    };
}

/** Version id of an item number: the effective (published) one, or the newest (versions/list is newest first). */
async function versionIdOf(itemNumber: string, which: "published" | "latest"): Promise<string> {
    if (which === "latest") {
        const list = await put<{item_versions: {id: string}[]}>(`/ajax/v2/item/${itemNumber}/versions/list`, {limit: 1, skip: 0});
        if (!list.item_versions.length) {
            throw new Error(`Item ${itemNumber}: no versions`);
        }
        return list.item_versions[0].id;
    }
    if (isWskuItemNumber(itemNumber)) {
        return (await get<{version_id: string}>(`/ajax/item/wsku/${itemNumber}/effective-version`)).version_id;
    }
    return (await get<{item_version_id: string}>(`/ajax/v2/item/${itemNumber}/object-type`)).item_version_id;
}

/** Exactly one item with this exact name, else throws. Returns its item number. */
async function itemNumberOfName(name: string): Promise<string> {
    const hits = (await searchItems(name, {limit: 50})).filter(h => h.name === name);
    const numbers = [...new Set(hits.map(h => h.itemNumber))];
    if (numbers.length !== 1) {
        throw new Error(`Name "${name}": expected exactly 1 item, found ${numbers.length}${numbers.length ? ` (${numbers.join(", ")})` : ""}`);
    }
    return numbers[0];
}

export async function resolve(ref: ItemRef): Promise<ResolvedItem> {
    const given = [ref.versionId, ref.itemNumber, ref.name].filter(v => v !== undefined);
    if (given.length !== 1) {
        throw new Error("resolve needs exactly one of versionId / itemNumber / name");
    }
    if (ref.versionId) {
        return describeVersion(ref.versionId);
    }
    const itemNumber = ref.itemNumber ?? (await itemNumberOfName(ref.name as string));
    const versionId = await versionIdOf(itemNumber, ref.version ?? "published");
    return describeVersion(versionId, itemNumber);
}

/** The detail endpoint the UI uses for this item. */
export function detailPath(item: Pick<ResolvedItem, "versionId" | "family">): string {
    const id = item.versionId;
    switch (item.family) {
        case "hdrConsumable":
            return `/ajax/item/hdr-consumable/version/${id}`;
        case "wsku":
            return `/ajax/item/wsku/version/${id}`;
        case "ingredient":
            return `/ajax/v2/item/version/${id}/ingredient`;
        case "recipe":
            return `/ajax/v2/item/version/${id}/recipe`;
        case "generic":
            return `/ajax/v2/item/version/${id}`;
    }
}

/** The nutrition endpoint the UI uses for this item. A Menu keeps its nutrition apart from Recipe/Benchtop. */
export function nutritionPath(item: Pick<ResolvedItem, "versionId" | "family" | "objectType">): string {
    const id = item.versionId;
    switch (item.family) {
        case "hdrConsumable":
            return `/ajax/item/hdr-consumable/version/${id}/nutrition`;
        case "wsku":
            return `/ajax/item/wsku/version/${id}/nutrition`;
        case "ingredient":
            return `/ajax/v2/item/version/${id}/ingredient/nutrition`;
        case "recipe":
            return item.objectType === "MENU" ? `/ajax/item/version/${id}/customization/nutrition` : `/ajax/v2/item/version/${id}/recipe/nutrition`;
        case "generic":
            return `/ajax/v2/item/version/${id}/item-nutrition`;
    }
}

/**
 * Detail page URL of an item version, by the same routing the app uses: `40*` opens the HDR Consumable page, anything
 * else the common item page. WSKU (41/42/49) has its own page whose route is not known here, so it throws.
 */
export function detailUrl(item: {itemNumber: string; versionId: string}): string {
    if (isWskuItemNumber(item.itemNumber)) {
        throw new Error(`detailUrl: WSKU item ${item.itemNumber} is not supported`);
    }
    const page = item.itemNumber.startsWith(HDR_CONSUMABLE_PREFIX) ? "hdr-consumable/detail" : "detail/basic";
    return `${appUrl()}/ItemV2/${page}/${item.itemNumber}?version_id=${item.versionId}`;
}

/** Item numbers of the top-level rows of the Components card (see api/components.ts for the full rows). */
export async function getBomItemNumbers(versionId: string): Promise<string[]> {
    return (await getComponentRows(versionId)).map(row => row.itemNumber);
}

export interface ItemRead<T> {
    readonly item: ResolvedItem;
    readonly data: T;
}

/** Item detail through the endpoint the detail page uses for this item's family. */
export async function getItemDetail<T extends object = Record<string, unknown>>(ref: ItemRef): Promise<ItemRead<T>> {
    const item = await resolve(ref);
    return {item, data: await get<T>(detailPath(item))};
}

/** Nutrition through the endpoint the nutrition card uses for this item's family / type. */
export async function getNutrition<T extends object = Record<string, unknown>>(ref: ItemRef): Promise<ItemRead<T>> {
    const item = await resolve(ref);
    return {item, data: await get<T>(nutritionPath(item))};
}
