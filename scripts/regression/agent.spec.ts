/**
 * Regression suite for the Agent Configuration page (settings/form page).
 * Run: SESSION_ID=xxx npx playwright test agent
 */
import {test, expect} from "./fixtures";
import {AgentPage} from "./pages/AgentPage";

test.describe("Agent Configuration", () => {
    test("loads with the title and the Agents / Prompt Library tabs", async ({page}) => {
        const agent = new AgentPage(page);
        await agent.open();
        await expect(agent.promptLibraryTab().first()).toBeVisible();
    });
});
