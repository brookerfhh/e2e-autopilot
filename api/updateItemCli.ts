/**
 * Manual smoke test for updateItem. QA only; only touches items named e2e-auto-*.
 *
 *   SESSION_ID=... npm run smoke:update -- <versionId> <serviceSetting|packageSku|nutrition> [...]
 */
import {setMenuNutritionReviewed, setNutritionReviewed, setPackageSku, setServiceSettingReviewed} from "./updateItem";

const STEPS: Record<string, (versionId: string) => Promise<unknown>> = {
    serviceSetting: id => setServiceSettingReviewed(id),
    packageSku: id => setPackageSku(id),
    menuNutrition: id => setMenuNutritionReviewed(id),
    recipeNutrition: id => setNutritionReviewed(id),
};

async function main(): Promise<void> {
    process.env.APP_URL ||= "https://cookbook.foodtruck-qa.com";
    const [versionId, ...names] = process.argv.slice(2);
    const unknown = names.filter(n => !STEPS[n]);
    if (!versionId || !names.length || unknown.length) {
        throw new Error(`usage: updateItemCli.ts <versionId> <${Object.keys(STEPS).join("|")}> [...]${unknown.length ? `  (unknown: ${unknown.join(", ")})` : ""}`);
    }
    for (const name of names) {
        try {
            const result = await STEPS[name](versionId);
            console.log(JSON.stringify({step: name, ok: true, result: result ?? null}));
        } catch (error) {
            console.log(JSON.stringify({step: name, ok: false, error: error instanceof Error ? error.message : String(error)}));
            process.exitCode = 1;
        }
    }
}

main();
