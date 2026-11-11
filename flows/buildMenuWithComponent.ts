/**
 * @flow         buildMenuWithComponent
 * @action       composite                       // hybrid: API creates the Menu, the browser adds the component
 * @target       Item · Menu + existing component (Edit Components → Add component → Save)
 * @summary      Create a DRAFT Menu through the API, then add an EXISTING 40* item as its component in the
 *               browser (the Edit Components frontend logic is too heavy to replicate), then verify through the API.
 * @params       component?="4001164"  usage?="1"  name?
 * @returns      { menu: {itemNumber, versionId, name, url}, component, added, bomLineCount }
 * @requires     an existing (published) 40* component — see cb-knowledge/流程.md: a 40 that can publish needs an
 *               Active 42 in SCC, so we reuse an existing one instead of creating it
 * @sideEffects  persistent · creates one DRAFT Menu named e2e-auto-<YYYYMMDD-HHmm>-menu on QA
 * @pages        ItemPage (via addComponentToItem)
 * @note         Handoff API → browser is the detail URL built from itemNumber + versionId.
 */
import {Page} from "@playwright/test";
import {e2eName, runStamp} from "../api/client";
import {createMenu} from "../api/createItem";
import {detailUrl, getBomItemNumbers} from "../api/read";
import {addComponentToItem} from "./addComponentToItem";

export interface BuildMenuWithComponentInput {
    component?: string;
    usage?: string;
    name?: string;
}

export interface MenuRef {
    itemNumber: string;
    versionId: string;
    name: string;
    url: string;
}

export async function buildMenuWithComponent(
    page: Page,
    input: BuildMenuWithComponentInput = {},
): Promise<{menu: MenuRef; component: string; added: boolean; bomBefore: string[]; bomItems: string[]}> {
    const component = input.component ?? "4001164";
    const name = input.name ?? e2eName("menu", runStamp());

    const created = await createMenu(name);
    const menu: MenuRef = {...created, url: detailUrl(created)};

    const bomBefore = await getBomItemNumbers(menu.versionId);
    const {added} = await addComponentToItem(page, {url: menu.url, componentName: component, usage: input.usage});

    // Independent check through the API, not the UI.
    const bomItems = await getBomItemNumbers(menu.versionId);
    return {menu, component, added, bomBefore, bomItems};
}
