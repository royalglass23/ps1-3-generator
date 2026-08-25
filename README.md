# RG PS Generator

RG PS Generator is the internal Royal Glass WordPress plugin used to create PS1 and PS3 PDF packages. Staff complete the form in the browser, and the plugin fills the relevant PDF template, flattens it, records the generation in WordPress, and downloads the finished file.

The generator is intended for internal staff use. It is not a public quote or customer-facing form.

## What it does

- Protects the generator page with a shared password.
- Collects project, system, glass, and area information.
- Supports up to five separately described areas in one job.
- Produces PS1, PS3, or both PDF documents in the browser.
- Records each successful generation in the WordPress database.
- Provides a paginated PS Database view with CSV export.
- Optionally suggests addresses through Google Places Autocomplete.

PDF templates, the PDF library, and the Unicode font are loaded by the plugin. The finished PDFs are generated in the staff member's browser; no generated PDF is stored on the web server.

## Staff workflow

1. Open the WordPress page containing `[rg_ps_generator]` and sign in with the internal generator password.
2. Complete the document details:
   - Client / Designer Name and Property Address are required.
   - BC Number and Lot Description are optional.
   - Choose the balustrade system, substrate, structure built (New or Existing), glass type, and thickness.
3. Describe the areas covered. Each area has one location (Internal or External) and one or more structure types.
4. Select **Generate PS1**, **Generate PS3**, or **Generate Both**. The record is saved first, then the PDF download starts.
5. Use **PS Database** to view prior records, change page size, or export records to CSV.

If the record cannot be saved, generation stops and the PDF is not downloaded. This prevents an unlogged document from being issued accidentally.

## Areas covered

An area is a separately described part of the balustrade work. For example, a job may include an Internal Stair and Balcony Area plus an External Deck Area.

- Start with one blank area and add up to five areas.
- Each area must have Internal or External selected.
- Each area must have at least one structure type: Deck, Balcony, Stair, Landing, or Pool Area.
- More than one non-pool structure type can be selected for an area.
- A Pool Area must be the only area, and it must be the only structure type in that area. Pool work uses the relevant pool template.
- The structure picker is the same compact height as the other controls. Its menu closes once the pointer has left both the control and the menu.

## Glass defaults

The generator applies sensible starting values, but staff can change them before generating.

| System | Default glass type | Default thickness |
| --- | --- | --- |
| Unex Ascot / aluminium systems | Not Glass | Blank |
| Unex Metropolis | Toughened | 12mm |
| Other glass balustrade systems | Toughened | 12mm |

Laminated glass defaults to 13.52mm when selected. The available thicknesses are blank, 12mm, 13.2mm, 13.52mm, and 15mm.

## WordPress installation and configuration

1. Copy `wp-plugin/rg-ps-generator` into `wp-content/plugins/` on the target WordPress site.
2. Confirm the plugin folder contains `templates/`, `assets/`, and the PHP entry file.
3. Activate **RG PS Generator** in WordPress.
4. Open **Settings → RG PS Generator** and set the internal generator password.
5. Optionally add a Google Places API key for address suggestions. Restrict the key to the site's domain(s); do not commit it to Git.
6. Add `[rg_ps_generator]` to the internal WordPress page used by staff.

On activation, the plugin creates the WordPress `{prefix}rgps_records` table. Existing installations are migrated safely when needed; the structure field supports the longer multi-area description.

## Local WordPress testing

The plugin can be tested in LocalWP by copying the current plugin folder into that site's `wp-content/plugins/rg-ps-generator` folder, then reloading the generator page.

When changing frontend assets, copy the changed files and force-refresh the page with `Ctrl+F5`. The PHP plugin file controls the cache versions used for `assets/style.css` and `assets/app.js`; bump the matching version when an asset change must be picked up immediately by browsers or caching layers.

Verify a local update by completing a small test job and checking:

- the areas card and compact Structure types control render correctly;
- moving the pointer from Structure types into its menu does not close it;
- the menu closes after the pointer leaves the whole picker;
- PS1, PS3, and Both downloads work for a normal area and a Pool Area;
- the generated record appears in PS Database.

## Development and checks

Install the Node dependencies, then run the regression suite:

```powershell
npm install
npm test
```

The automated tests cover PDF filling, WordPress glass/thickness defaults, multi-area validation and PDF text, and Unicode-font handling.

Before a release, also test the plugin on a local WordPress page with the real templates. Browser interaction and PDF downloads are outside the Node-only test suite.

## Updating a live WordPress site

Changes in this repository and LocalWP are not deployed to the live site automatically.

1. Download a backup of the live plugin folder and take the normal WordPress/site backup.
2. Commit and push the reviewed repository changes.
3. Copy the reviewed changed plugin files to the live `wp-content/plugins/rg-ps-generator/` folder using the approved hosting workflow.
4. Clear any site/cache-plugin cache and force-refresh the generator page.
5. Test sign-in, a standard PS1 generation, and the PS Database before relying on the update.

Do not replace the live `templates/` directory unless the template PDFs themselves are part of the approved change.

## Project map

| Path | Purpose |
| --- | --- |
| `wp-plugin/rg-ps-generator/rg-ps-generator.php` | WordPress plugin, settings, authentication, AJAX routes, records, and asset versions |
| `wp-plugin/rg-ps-generator/assets/app.js` | Form behaviour, validation, PDF generation, downloads, and database UI |
| `wp-plugin/rg-ps-generator/assets/style.css` | Generator layout and responsive styling |
| `wp-plugin/rg-ps-generator/templates/` | Approved PS1/PS3 PDF templates used by the plugin |
| `wp-plugin/rg-ps-generator/assets/fonts/` | Unicode font used when filling PDFs |
| `test/` | Node regression tests for PDF and WordPress behaviour |

## Security and data handling

- The page uses a shared-password gate with a WordPress nonce, rate limiting, and an eight-hour temporary session.
- Keep the page unlinked from public navigation and share the password only with authorised staff.
- Do not place API keys, passwords, generated PDFs, or customer data in Git.
- The database records job metadata for the PS Database; the downloaded PDF remains with the staff member who generated it.

## Supported systems

The current form supports Double Disc, Hidden, JH Clamp, Lugano, Mini Post, MP SP14, Side Channel, Top Channel, Unex Ascot, Unex Metropolis, Viking Aluminium, Viking Glass, and Vista systems. Each system maps to its approved normal and, where applicable, pool PDF template.
