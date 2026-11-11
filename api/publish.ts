/**
 * Pre-publish check through the same endpoint the UI calls before showing the publish dialog
 * (PUT /ajax/v2/item/version/:id/check-for-publish). Read-only: it only reports, it publishes nothing.
 *
 * `required` items block publishing ("Unable to Publish" in the UI); `warnings` do not
 * (the UI shows "Incomplete info" with "Publish anyway", e.g. Line Build missing).
 *
 * Only for a version that is NOT published yet: on a FINAL version the server answers 409 "this version already published".
 * To read the same required / warning split of a published item, use a search row (api/search.ts): `missingRequired` / `missing`.
 */
import {put} from "./client";

export interface PublishCheck {
    readonly required: string[];
    readonly warnings: string[];
}

interface CheckResponse {
    validation_information: {invalid_info_list: {location_card: string; details: {tip: string; required: boolean}[]}[]} | null;
}

export async function checkForPublish(versionId: string): Promise<PublishCheck> {
    const res = await put<CheckResponse>(`/ajax/v2/item/version/${versionId}/check-for-publish`, {service_start_time: null, production_start_time: null});
    const details = (res.validation_information?.invalid_info_list ?? []).flatMap(card => card.details.map(d => ({tip: d.tip, required: d.required})));
    return {required: details.filter(d => d.required).map(d => d.tip), warnings: details.filter(d => !d.required).map(d => d.tip)};
}
