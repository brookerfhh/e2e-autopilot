import {authedContext, launchBrowser} from "./_auth";

async function main() {
    const url = process.env.RECON_URL!;
    const browser = await launchBrowser();
    const context = await authedContext(browser);
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForTimeout(4000);

    // Dump all card/section headings on the detail page.
    const headings = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll("h1,h2,h3,h4,h5,[class*='title'],[class*='Title'],[class*='header'],[class*='Header']").forEach(el => {
            const t = (el.textContent || "").trim();
            if (t && t.length < 60) out.push(el.tagName + ": " + t);
        });
        return Array.from(new Set(out));
    });
    console.log("=== HEADINGS ===");
    console.log(headings.join("\n"));

    const allButtons = () => Array.from(document.querySelectorAll("button"));

    // For each label, find the enclosing Ant card, print its title + the global index of the
    // edit button(s) in that card's header (the recording used a global button.nth(5)).
    for (const label of ["Stock UOM", "Out of Stock Name"]) {
        console.log(`\n=== "${label}" context ===`);
        const info = await page.evaluate((lbl) => {
            const btnIndex = (b: Element) => Array.from(document.querySelectorAll("button")).indexOf(b as HTMLButtonElement);
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if ((node.textContent || "").includes(lbl)) {
                    let card: Element | null = node.parentElement;
                    while (card && !card.classList.contains("ant-card")) card = card.parentElement;
                    if (!card) return `(no .ant-card ancestor)`;
                    const title = card.querySelector(".ant-card-head-title, .ant-card-head")?.textContent?.trim() || "(no card title)";
                    const cardId = card.id || card.closest("[id]")?.id || "";
                    const headBtns = Array.from(card.querySelectorAll(".ant-card-head button, .ant-card-extra button"));
                    const idxs = headBtns.map(btnIndex).join(",");
                    return `cardTitle="${title}"  cardId="${cardId}"  headerButtonGlobalIndexes=[${idxs}]`;
                }
            }
            return "(label not found)";
        }, label);
        console.log(info);
    }

    // Map global button index → hint (recording used button.nth(5)).
    const btns = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("button")).map((b, i) => {
            const t = (b.textContent || "").trim();
            const aria = b.getAttribute("aria-label") || "";
            const icon = b.querySelector("svg")?.getAttribute("data-icon") || "";
            const card = b.closest(".ant-card");
            const cardTitle = card?.querySelector(".ant-card-head-title")?.textContent?.trim() || "";
            return `#${i} text="${t.slice(0, 24)}" aria="${aria}" icon="${icon}" card="${cardTitle}"`;
        });
    });
    console.log("\n=== BUTTONS (index → hint) ===");
    console.log(btns.slice(0, 20).join("\n"));

    // Click the edit pencil (recording used global button.nth(5)) and see what appears.
    console.log("\n=== AFTER clicking edit (button.nth(5)) ===");
    await page.getByRole("button").nth(5).click();
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => {
        const oosBox = document.querySelector('textbox, [role="textbox"]');
        return {
            roleDialog: document.querySelectorAll('[role="dialog"]').length,
            antModal: document.querySelectorAll(".ant-modal:not([style*='display: none'])").length,
            antModalWrapVisible: Array.from(document.querySelectorAll(".ant-modal-wrap")).filter(w => getComputedStyle(w as Element).display !== "none").length,
            antDrawer: document.querySelectorAll(".ant-drawer-open, .ant-drawer:not(.ant-drawer-hidden)").length,
            saveButtons: Array.from(document.querySelectorAll("button")).filter(b => (b.textContent || "").trim() === "Save").map(b => {
                const inModal = !!b.closest(".ant-modal");
                const inDrawer = !!b.closest(".ant-drawer");
                const inCard = b.closest(".ant-card")?.id || "";
                return `Save(inModal=${inModal},inDrawer=${inDrawer},card=${inCard})`;
            }),
        };
    });
    console.log(JSON.stringify(after, null, 2));

    // Where are the two fields NOW (after entering edit)?
    for (const [role, name] of [["combobox", "Stock UOM"], ["textbox", "Out of Stock Name"]] as const) {
        const loc = page.getByRole(role, {name: new RegExp(name)});
        const cnt = await loc.count();
        let container = "";
        if (cnt > 0) {
            container = await loc.first().evaluate(el => {
                const modal = el.closest(".ant-modal") ? "modal" : "";
                const drawer = el.closest(".ant-drawer") ? "drawer" : "";
                const card = el.closest(".ant-card")?.id || "";
                return `modal=${modal} drawer=${drawer} card=${card}`;
            }).catch(() => "(eval failed)");
        }
        console.log(`${role} /${name}/ → count=${cnt} ${container}`);
    }

    await browser.close();
}
main().catch(e => { console.error(e); process.exit(1); });
