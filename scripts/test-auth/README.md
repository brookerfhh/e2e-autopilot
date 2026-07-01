# Shared E2E Authentication

Two complementary strategies, consumed by both the per-ticket test scripts under
`openspec/changes/<change-id>/scripts/` and the standing regression suite under
`scripts/regression/`.

## Strategy A — storageState (interactive)

```bash
npx ts-node -P tsconfig.scripts.json scripts/test-auth/save-auth.ts
```

Opens Chromium, you log into QA, press Enter, the script then visits Local so the
same context inherits the login. The full cookies + localStorage are written to
`scripts/test-auth/auth.json` (gitignored).

Use this when:

- First time setup on a fresh machine.
- `auth.json` has expired and you want a fresh storageState that covers both QA and Local.

## Strategy B — SessionId injection (fast)

```bash
# Either an env var
SESSION_ID=xxxxxxxx npx ts-node -P tsconfig.scripts.json scripts/regression/brand-management.spec.ts

# Or a CLI flag
npx ts-node -P tsconfig.scripts.json scripts/regression/brand-management.spec.ts --session=xxxxxxxx
```

Copy `SessionId` from DevTools → Application → Cookies and pass it in. No browser
window opens for login, no `auth.json` needed.

Use this when:

- You already have a valid SessionId.
- CI / scripted runs where opening a real login flow is not desirable.

## Inside a test script

```ts
import {chromium} from "@playwright/test";
import {createAuthenticatedContext, BASE_URL, parseAuthArgs} from "<relative>/scripts/test-auth/inject-session";

const auth = parseAuthArgs(process.argv);

(async () => {
    const browser = await chromium.launch({headless: true});
    const context = await createAuthenticatedContext(browser, auth);
    const page = await context.newPage();

    await page.goto(`${BASE_URL[auth.target]}/your/route`);
    // ... assertions
    await browser.close();
})();
```

`createAuthenticatedContext` automatically picks Strategy B if `sessionId` is set,
falls back to Strategy A otherwise.

## Security

- **`auth.json` is gitignored and must never be committed** — it contains live
  session cookies. See `.gitignore` (`scripts/test-auth/auth.json`).
