/**
 * Snapshot + diff of a Menu's cards, to compare a UI-built item with an API-built one ("the UI flow is the oracle").
 *
 * snapshotMenu reads the same endpoints the detail page cards use (detail, customization nutrition, Components,
 * Service Setting, Packaged SKUs, plus check-for-publish) and normalizes the answer: the item's own number /
 * version id / name become placeholders and volatile keys (ids, hashes, timestamps, who-did-it) are dropped,
 * so two different items built the same way snapshot identical. diffSnapshots lists what still differs.
 */
import {get} from "./client";
import {checkForPublish} from "./publish";
import {detailPath, nutritionPath, resolve} from "./read";

export type Snapshot = Record<string, unknown>;

export interface Difference {
    readonly path: string;
    readonly a: unknown;
    readonly b: unknown;
}

const VOLATILE_KEY = /^(id|uuid|hash|frontend_uuid|parent_ids_chain|item_version_id|version_id|.*_time|.*_at|.*_by|.*_user_id|updated_by|created_by|reviewed_user_id|version|cost|item_cost_sources|cost_source)$/;

function scrub(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(scrub);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([key]) => !VOLATILE_KEY.test(key))
                .map(([key, v]) => [key, scrub(v)]),
        );
    }
    return value;
}

function withPlaceholders(value: unknown, replacements: readonly (readonly [string, string])[]): unknown {
    const text = replacements.reduce((acc, [from, to]) => acc.split(from).join(to), JSON.stringify(value));
    return JSON.parse(text);
}

export async function snapshotMenu(versionId: string): Promise<Snapshot> {
    const item = await resolve({versionId});
    const replacements = [
        [item.versionId, "<VERSION_ID>"],
        [item.itemNumber, "<ITEM_NUMBER>"],
        [item.name, "<NAME>"],
    ] as const;
    const [detail, nutrition, components, serviceSetting, packagedSkus, publishCheck] = await Promise.all([
        get<unknown>(detailPath(item)),
        get<unknown>(nutritionPath(item)),
        get<unknown>(`/ajax/item/version/${versionId}/component-bom/display`),
        get<unknown>(`/ajax/item/version/${versionId}/service-setting`),
        get<unknown>(`/ajax/item/version/${versionId}/package-sku/list`),
        checkForPublish(versionId).catch(error => ({error: error instanceof Error ? error.message : String(error)})),
    ]);
    const raw = {detail, nutrition, components, serviceSetting, packagedSkus, publishCheck};
    return scrub(withPlaceholders(raw, replacements)) as Snapshot;
}

export function diffSnapshots(a: unknown, b: unknown, path = ""): Difference[] {
    if (Array.isArray(a) && Array.isArray(b)) {
        const length = Math.max(a.length, b.length);
        return Array.from({length}, (_, i) => diffSnapshots(a[i], b[i], `${path}[${i}]`)).flat();
    }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        return [...keys].flatMap(key => diffSnapshots((a as Snapshot)[key], (b as Snapshot)[key], path ? `${path}.${key}` : key));
    }
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [{path, a, b}];
}
