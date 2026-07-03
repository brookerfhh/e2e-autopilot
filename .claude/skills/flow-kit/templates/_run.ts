/**
 * Generic flow runner. Runs any flows/<name>.ts against the target app.
 *
 *   npx ts-node -P flows/tsconfig.json flows/_run.ts <flowName> [--headed] [--input '{"k":"v"}']
 *
 * Convention: flows/<name>.ts exports `<name>(page, input)` (or a default function).
 * Prints `RESULT: <json>` on success.
 */
import {authedContext, launchBrowser} from "./_auth";

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const name = args.find(a => !a.startsWith("--"));
    if (!name) {
        throw new Error('usage: ts-node flows/_run.ts <flowName> [--headed] [--input \'{"k":"v"}\']');
    }
    const inputIdx = args.indexOf("--input");
    const input = inputIdx >= 0 && args[inputIdx + 1] ? JSON.parse(args[inputIdx + 1]) : {};

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(`./${name}`);
    const fn = typeof mod[name] === "function" ? mod[name] : mod.default;
    if (typeof fn !== "function") {
        throw new Error(`flows/${name}.ts must export a function named "${name}" or a default function`);
    }

    const browser = await launchBrowser();
    try {
        // authedContext may throw (e.g. APP_URL unset) — keep it inside so the browser still closes.
        const context = await authedContext(browser);
        const page = await context.newPage();
        const result = await fn(page, input);
        console.log("RESULT:", JSON.stringify(result ?? null));
    } finally {
        await browser.close();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
