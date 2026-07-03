# FLOWS — reusable data-setup / action builders (`flows/*.ts`)

Each `flows/*.ts` file is one **flow**: a parameterized function driving a real business
flow via Playwright (recorded with `build-flow`, then refactored). This file is the
**catalog** — kept in sync with the `@flow` header at the top of each flow file (the header
is the source of truth; this file is its index).

## For the agent — read this before building or composing

- **Before recording a NEW flow**: scan this catalog to reuse existing Page Objects, keep
  naming consistent, and check whether part of the flow already exists as a builder.
- **To COMPOSE a longer flow** (e.g. "create → search → delete an item"): match one flow's
  **`Returns`** to another's **`Requires`** to order them and thread data. Write the combined
  flow as a new `flows/*.ts` with `@action composite`, give it a `@flow` header, and add it here too.

## Naming convention

- **create** flows are **entity-specific** (the create form differs per type):
  `createIngredientItem`, `createMenuItem`, `createRecipeItem`.
- **search / delete / update** flows are **generic** (they take an id or name, type-agnostic):
  `searchItem`, `deleteItem`, `updateItem`.

## Catalog

| Flow | Action | Target | Params (defaults) | Returns | Requires |
|------|--------|--------|-------------------|---------|----------|
| _(none yet — add one row per flow you build)_ | | | | | |

---

<!-- Add one detail section per flow below, taken from its `@flow` header. Template:

## <flowName>
- **File**: `flows/<flowName>.ts`
- **Action / Target**: <create|search|delete|update|composite> · <entity + variant>
- **Params**: <name?, ... with defaults>
- **Returns**: <{ ...ids/objects this flow PRODUCES }>
- **Requires**: <ids/names it CONSUMES from other flows, or — for entry points>
- **Composes into**: <which longer flows can use this one>
- **Side effects**: <persistent data on QA? teardown available?>
- **Pages**: <Page Objects used>
- **Gotchas**: <anything worth carrying forward>
-->
