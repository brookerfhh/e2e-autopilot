/**
 * Page Object for the Agent Configuration page (src/page/configurations/agent,
 * route /configurations/agent). A settings/form page (not a list) — load smoke only.
 */
import {expect, Locator, Page} from "@playwright/test";

export class AgentPage {
    static readonly PATH = "/configurations/agent";

    constructor(private readonly page: Page) {}

    heading(): Locator {
        return this.page.locator("#content").getByText("Agent Configuration", {exact: true});
    }
    promptLibraryTab(): Locator {
        return this.page.getByText("Prompt Library");
    }

    async open(): Promise<void> {
        await this.page.goto(AgentPage.PATH); // baseURL from playwright.config.ts
        await expect(this.heading()).toBeVisible({timeout: 20000});
    }
}
