/**
 * @flow         publishHdrConsumable
 * @action       update                          // hybrid: API fills the field, browser clicks Publish
 * @target       Item · HDR Consumable (fill required "Out of Stock Name", then Publish)
 * @summary      Set the required "Out of Stock Name" through the API, then publish the version in the browser
 *               (publish is irreversible, so it keeps the real click path) and read the status back.
 * @params       url? | versionId?  (one required)  outOfStockName?="e2e-oos"
 * @returns      { published, status?, blockers?, warnings?, outOfStockName }
 * @requires     url OR versionId of a DRAFT HDR Consumable
 * @sideEffects  persistent · sets a field and PUBLISHES the version on QA (hard to undo)
 * @pages        ItemPage (via publishMenuItem)
 * @note         Verified on QA: an e2e-created HDR Consumable publishes (FINAL) once Out of Stock Name is set.
 *               It will NOT be a publishable Menu component though — that needs an Active 42* link in SCC
 *               (see cb-knowledge/流程.md). The result carries blockers if the app refuses.
 */
import {Page} from "@playwright/test";
import {detailUrl, resolve} from "../api/read";
import {updateItemInfo} from "../api/updateItem";
import {publishMenuItem} from "./publishMenuItem";

export interface PublishHdrConsumableInput {
    url?: string;
    versionId?: string;
    outOfStockName?: string;
}

export async function publishHdrConsumable(
    page: Page,
    input: PublishHdrConsumableInput,
): Promise<{published: boolean; status?: string; blockers?: string; warnings?: string; outOfStockName: string}> {
    const outOfStockName = input.outOfStockName ?? "e2e-oos";
    const versionId = input.versionId ?? (input.url ? new URL(input.url).searchParams.get("version_id") : null);
    if (!versionId) {
        throw new Error("publishHdrConsumable needs a url with ?version_id=… or a versionId");
    }

    await updateItemInfo(versionId, {outOfStockName});

    const url = input.url ?? detailUrl(await resolve({versionId}));
    const result = await publishMenuItem(page, {url});
    return {...result, outOfStockName};
}
