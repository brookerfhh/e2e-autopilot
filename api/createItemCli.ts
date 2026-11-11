/**
 * Manual smoke test for createItem. QA only (see client.ts guards).
 *
 *   APP_URL=https://<qa-host> SESSION_ID=... npx ts-node -P tsconfig.flows.json api/createItemCli.ts MENU [RECIPE ...]
 *
 * Creates one DRAFT item per type named e2e-auto-<runId>-<TYPE> and prints the result as JSON.
 */
import {e2eName, runStamp} from "./client";
import {CreateItemType, createItem} from "./createItem";

const TYPES: readonly CreateItemType[] = ["INGREDIENT", "NON_FOOD", "MENU", "RECIPE", "BENCHTOP", "PACKAGED", "HDR_CONSUMABLE_ITEM", "HDR_RECIPE"];

function parseTypes(args: readonly string[]): CreateItemType[] {
    const unknown = args.filter(a => !TYPES.includes(a as CreateItemType));
    if (!args.length || unknown.length) {
        throw new Error(`usage: createItemCli.ts <${TYPES.join("|")}> [...]${unknown.length ? `  (unknown: ${unknown.join(", ")})` : ""}`);
    }
    return args as CreateItemType[];
}

async function main(): Promise<void> {
    process.env.APP_URL ||= "https://cookbook.foodtruck-qa.com";
    const args = process.argv.slice(2);
    const types = args.length ? parseTypes(args) : [...TYPES];
    const runId = runStamp();
    for (const type of types) {
        try {
            const created = await createItem(type, e2eName(type.toLowerCase(), runId));
            console.log(JSON.stringify({type, ok: true, ...created}));
        } catch (error) {
            console.log(JSON.stringify({type, ok: false, error: error instanceof Error ? error.message : String(error)}));
            process.exitCode = 1;
        }
    }
}

main();
