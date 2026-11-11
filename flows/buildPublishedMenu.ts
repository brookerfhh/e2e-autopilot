/**
 * @flow         buildPublishedMenu
 * @action       composite                       // hybrid: API for data, browser for Edit Components + Publish
 * @target       Item · fully configured, published Menu
 * @summary      One call from nothing to a published Menu:
 *                 1. create the Menu                                  (API)
 *                 2. Edit Components → add an existing 40* component  (browser — frontend logic too heavy to replicate)
 *                 3. Concept, Service Setting, Packaged SKU, Menu Nutrition  (API)
 *                 4. pre-publish check                                (API, read-only)
 *                 5. Publish                                          (browser — real click path, irreversible)
 * @params       component?="4001164"  usage?="1"  concept?="2PRs Fred's"  name?  publish?=true
 * @returns      { menu, component, bomItems, concepts, check: {required, warnings}, published, status?, warnings? }
 * @requires     an existing published 40* component (see cb-knowledge/流程.md: a publishable 40 needs an Active 42 in SCC)
 * @sideEffects  persistent · creates one Menu e2e-auto-<YYYYMMDD-HHmm>-menu on QA; publish is one-way
 * @pages        ItemPage (via addComponentToItem / publishMenuItem)
 * @note         Line Build missing is only a warning; publishMenuItem continues with "Publish anyway".
 *               If the pre-publish check still reports a required item, the flow stops before clicking Publish.
 */
import {Page} from "@playwright/test";
import {checkForPublish, PublishCheck} from "../api/publish";
import {setConcept, setMenuNutritionReviewed, setPackageSku, setServiceSettingReviewed} from "../api/updateItem";
import {buildMenuWithComponent, MenuRef} from "./buildMenuWithComponent";
import {publishMenuItem} from "./publishMenuItem";

export interface BuildPublishedMenuInput {
    component?: string;
    usage?: string;
    concept?: string;
    name?: string;
    /** default true; false stops after the pre-publish check (leaves a ready-to-publish DRAFT). */
    publish?: boolean;
}

export interface BuildPublishedMenuResult {
    menu: MenuRef;
    component: string;
    bomItems: string[];
    concepts: string[];
    check: PublishCheck;
    published: boolean;
    status?: string;
    warnings?: string;
    blockers?: string;
}

export async function buildPublishedMenu(page: Page, input: BuildPublishedMenuInput = {}): Promise<BuildPublishedMenuResult> {
    const built = await buildMenuWithComponent(page, {component: input.component, usage: input.usage, name: input.name});
    const {menu} = built;
    if (!built.bomItems.length) {
        throw new Error(`Component was not saved on ${menu.name} (${menu.versionId}); stopping before the API steps`);
    }

    const concepts = await setConcept(menu.versionId, [input.concept ?? "2PRs Fred's"]);
    await setServiceSettingReviewed(menu.versionId);
    await setPackageSku(menu.versionId);
    await setMenuNutritionReviewed(menu.versionId); // last: the Menu's nutrition depends on its components

    const check = await checkForPublish(menu.versionId);
    const base = {menu, component: built.component, bomItems: built.bomItems, concepts, check};
    if (input.publish === false) {
        return {...base, published: false};
    }
    if (check.required.length) {
        return {...base, published: false, blockers: `not published, required: ${check.required.join("; ")}`};
    }
    const result = await publishMenuItem(page, {url: menu.url});
    return {...base, ...result};
}
