# Brand Management — regression test cases

- **Route**: `/brands`
- **Capability**: full CRUD (Create Brand drawer, row Edit, row Delete with confirm) + search + column sort
- **Strategy**: full idempotent `create → verify → delete` — each mutating test uses a unique
  `e2e-${Date.now()}` name and removes its own data, so the suite leaves QA clean.
- **Recon verified (QA 2026-06-25)**: title is a `<span>` "Brand Management"; columns BRAND NAME /
  LAST UPDATED BY / CREATED TIME / LAST UPDATED TIME / ACTIONS; Create Brand button; search field
  "Brand Name"; drawer field "Brand Name" + Cancel/Save; validation "Brand Name is required";
  row "…" menu Edit/Delete; delete confirm "Are you sure you want to delete the brand? Once delete
  it cannot be undone." (Cancel/Delete); sortable columns CREATED TIME & LAST UPDATED TIME.

### loads the list page with header and at least one row
- Given: authenticated, navigating to `/brands`
- When: the page finishes loading
- Then: the "Brand Management" title, "BRAND NAME" column header, and at least one data row are visible

### search for a non-existent name yields no rows, clear restores
- Given: on the page
- When: search a random name that cannot exist (`zzz-no-such-brand-${Date.now()}`)
- Then: the table shows 0 data rows
- When: click Clear
- Then: data rows are visible again

### create a brand and find it via search
- Given: on the page
- When: open the Create Brand drawer, fill Brand Name = `e2e-${Date.now()}`, click Save
- Then: the drawer closes; searching for that name shows the row
- Cleanup: the brand is deleted in the dedicated delete test (unique names avoid collisions)

### row actions menu opens (Edit / Delete reachable)
- Given: on the page with rows present
- When: click the first row's "…" actions trigger
- Then: a menu item is visible (Edit / Delete reachable)

### create requires a name (validation)
- Given: the Create Brand drawer is open
- When: click Save with Brand Name empty
- Then: "Brand Name is required" is visible

### edit a brand: create, rename, verify
- Given: on the page
- When: create `e2e-${Date.now()}`, open its row Edit, rename to `<name>-edited`, Save
- Then: searching for the renamed value shows the row

### delete a brand: create, delete, verify gone
- Given: on the page
- When: create `e2e-${Date.now()}`, open its row Delete, confirm in the "Are you sure" modal
- Then: searching for the name shows 0 rows

### sorting a column toggles its order
- Given: on the page
- When: click the "CREATED TIME" column header twice
- Then: aria-sort is set after the first click and differs after the second (direction toggled)
