/**
 * Diff two Menu versions card by card (UI-built vs API-built). QA only, read-only.
 *
 *   npm run diff -- <versionIdA> <versionIdB>
 */
import {diffSnapshots, snapshotMenu} from "./snapshot";

async function main(): Promise<void> {
    process.env.APP_URL ||= "https://cookbook.foodtruck-qa.com";
    const [a, b] = process.argv.slice(2);
    if (!a || !b) {
        throw new Error("usage: snapshotCli.ts <versionIdA> <versionIdB>");
    }
    const [sa, sb] = await Promise.all([snapshotMenu(a), snapshotMenu(b)]);
    const differences = diffSnapshots(sa, sb);
    for (const d of differences) {
        console.log(`${d.path}\n    A: ${JSON.stringify(d.a)}\n    B: ${JSON.stringify(d.b)}`);
    }
    console.log(`DIFF: ${differences.length} difference(s)`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
