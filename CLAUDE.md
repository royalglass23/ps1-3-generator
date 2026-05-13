# PS1 and 3 Generator — Claude Code Project Brief
# WordPress Plugin (Internal Staff Tool)

## Context

This is a new WordPress plugin `royalglass23/ps1-3-generator` repository. It extends Royal Glass's existing WordPress setup with an internal-only PS1/PS3 producer statement generator. It lives under `/wp-admin/` and is invisible to the public — no public URL, no navigation link, login required.

The existing repo structure is:
```
cost-calculator-WP/
├── src/                    # React + Vite + TypeScript (cost calculator)
├── wordpress-plugin/       # Existing WP plugin
├── supabase/
└── .claude/
```

Add a new plugin alongside the existing one:
```
cost-calculator-WP/
├── src/
├── wordpress-plugin/
├── ps1-plugin/             # NEW — this is what we are building
│   ├── rg-ps1-generator.php
│   ├── includes/
│   │   ├── admin-page.php
│   │   ├── rest-api.php
│   │   └── db.php
│   ├── templates/          # Fillable PDF templates (gitignored)
│   │   ├── MP_PS1_Template.pdf
│   │   ├── DD_PS1_template.pdf
│   │   ├── Side_Channel_PS_jur.pdf
│   │   └── PS3_Template.pdf
│   ├── templates/.htaccess # Deny all — blocks direct URL access
│   ├── src/                # React + TypeScript source
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── steps/
│   │   │   ├── Step1DocType.tsx
│   │   │   ├── Step2System.tsx
│   │   │   ├── Step3Details.tsx
│   │   │   └── Step4Preview.tsx
│   │   ├── lib/
│   │   │   ├── pdfFiller.ts
│   │   │   ├── systemConfig.ts
│   │   │   └── api.ts
│   │   └── types.ts
│   ├── dist/               # Built output (committed)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── supabase/
```

---

## Tech Stack

Match the existing cost calculator stack:

- **React + TypeScript + Vite** (frontend wizard)
- **pdf-lib** (client-side PDF field filling — no server needed)
- **pdfjs-dist** (renders filled PDF preview in browser)
- **WordPress Plugin PHP** (registers admin page, REST endpoints, DB table)
- **WordPress database** (custom table `{prefix}_ps1_records` for logging)

No Node.js server. No Docker. No external database.

---

## Security Model

- Plugin registers a WordPress admin page under `/wp-admin/`
- Restricted to users with `edit_posts` capability (editors and above)
- Templates folder has `.htaccess` with `Deny from all`
- Templates served only through authenticated WP REST endpoint (`is_user_logged_in()`)
- Log endpoints also require authentication
- Zero public-facing surface — no shortcodes, no front-end routes, nothing on the public site

---

## Plugin Entry Point (`rg-ps1-generator.php`)

```php
<?php
/**
 * Plugin Name: RG PS1 Generator
 * Description: Internal PS1/PS3 producer statement generator for Royal Glass staff.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) exit;

define('RG_PS1_PATH', plugin_dir_path(__FILE__));
define('RG_PS1_URL', plugin_dir_url(__FILE__));
define('RG_PS1_VERSION', '1.0.0');

require_once RG_PS1_PATH . 'includes/db.php';
require_once RG_PS1_PATH . 'includes/admin-page.php';
require_once RG_PS1_PATH . 'includes/rest-api.php';

register_activation_hook(__FILE__, 'rg_ps1_create_table');
```

---

## Admin Page (`includes/admin-page.php`)

```php
add_action('admin_menu', function () {
    add_menu_page(
        'PS1 Generator',
        'PS1 Generator',
        'edit_posts',
        'rg-ps1-generator',
        'rg_ps1_render_page',
        'dashicons-media-document',
        30
    );
});

function rg_ps1_render_page() {
    wp_enqueue_script('rg-ps1-app', RG_PS1_URL . 'dist/main.js', [], RG_PS1_VERSION, true);
    wp_enqueue_style('rg-ps1-style', RG_PS1_URL . 'dist/main.css', [], RG_PS1_VERSION);
    wp_localize_script('rg-ps1-app', 'RG_PS1', [
        'nonce'   => wp_create_nonce('wp_rest'),
        'apiBase' => rest_url('rg-ps1/v1'),
        'user'    => wp_get_current_user()->display_name,
    ]);
    echo '<div id="rg-ps1-root"></div>';
}
```

---

## REST API (`includes/rest-api.php`)

### GET `/wp-json/rg-ps1/v1/template/{system}`
Returns raw PDF bytes. Requires login.

Systems: `mini-post`, `double-disc`, `side-channel`, `ps3`

Map to files:
```php
$map = [
    'mini-post'    => 'MP_PS1_Template.pdf',
    'double-disc'  => 'DD_PS1_template.pdf',
    'side-channel' => 'Side_Channel_PS_jur.pdf',
    'ps3'          => 'PS3_Template.pdf',
];
```

Use `readfile()` to stream the PDF. Set `Content-Type: application/pdf`.

### POST `/wp-json/rg-ps1/v1/log`
Logs a generation record. Requires login. Body: JSON with all form fields.

### GET `/wp-json/rg-ps1/v1/records`
Returns last 50 records ordered by `created_at DESC`. Requires login.

All endpoints use `'permission_callback' => function() { return is_user_logged_in(); }`

---

## Database (`includes/db.php`)

```sql
CREATE TABLE {prefix}_ps1_records (
    id bigint(20) NOT NULL AUTO_INCREMENT,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    generated_by varchar(100),
    client_name varchar(255) NOT NULL,
    address text NOT NULL,
    bc_number varchar(100),
    system varchar(50) NOT NULL,
    doc_type varchar(10) NOT NULL,
    substrate varchar(20),
    structure varchar(50),
    location_type varchar(20),
    new_or_existing varchar(20),
    filename varchar(255),
    PRIMARY KEY (id)
)
```

Use `dbDelta()` in the activation hook.

---

## System Configuration (`src/lib/systemConfig.ts`)

```typescript
export const SYSTEMS = {
  'mini-post': {
    displayName: 'Mini Post',
    heights: {
      pool:    { height: '1.26', heightAboveFix: '1.05' },
      default: { height: '1.08', heightAboveFix: '0.85' },
    },
  },
  'double-disc': {
    displayName: 'Double Disc',
    heights: {
      pool:    { height: '1.30', heightAboveFix: '1.25' },
      default: { height: '1.13', heightAboveFix: '1.05' },
    },
  },
  'side-channel': {
    displayName: 'Edgetec Infinity Side Channel',
    heights: {
      pool:    { height: '1.25', heightAboveFix: '1.05' },
      default: { height: '1.20', heightAboveFix: '1.00' },
    },
  },
} as const

export const POOL_STRUCTURES = ['Pool Area', 'Pool Fence']

export const STRUCTURE_OPTIONS = [
  'Deck',
  'Balcony',
  'Pool Area',
  'Pool Fence',
  'Stair Area',
  'Landing',
  'Internal Stair Area',
  'Stair and Balcony Area',
]

export type SystemKey = keyof typeof SYSTEMS
```

---

## PDF Filler (`src/lib/pdfFiller.ts`)

Uses `pdf-lib` entirely in the browser. Returns:
- `previewBytes` — pages 2, 3, 4 only (the filled pages — skip page 1 cover/brochure)
- `fullBytes` — complete filled PDF for download

```typescript
import { PDFDocument } from 'pdf-lib'

// Silent helpers — not every template has every field
function setText(doc: PDFDocument, field: string, value: string) {
  try { doc.getForm().getTextField(field).setText(value) } catch {}
}
function setCheck(doc: PDFDocument, field: string, on: boolean) {
  try {
    const cb = doc.getForm().getCheckBox(field)
    on ? cb.check() : cb.uncheck()
  } catch {}
}

export async function fillPS1(templateBytes: ArrayBuffer, data: FormData) {
  const doc = await PDFDocument.load(templateBytes)

  setText(doc, 'Name',           data.clientName)
  setText(doc, 'Name-2',         data.clientName)
  setText(doc, 'Address',        data.address)
  setText(doc, 'Address-2',      data.address)
  setText(doc, 'Address02',      data.address)   // Juralco variant
  setText(doc, 'Address-4',      data.address)
  setText(doc, 'Description',    `New ${data.structure} ${data.systemDisplayName} Glass Balustrade`)
  setText(doc, 'Thickness',      '12')
  setText(doc, 'Height',         data.height)
  setText(doc, 'HeightAboveFix', data.heightAboveFix)
  setText(doc, 'Date0',          data.date)
  setText(doc, 'Date01',         data.date)
  setText(doc, 'Date-4',         data.date)

  setCheck(doc, 'TimberTB',   data.substrate === 'Timber')
  setCheck(doc, 'ConcreteTB', data.substrate === 'Concrete')
  setCheck(doc, 'SteelTB',    data.substrate === 'Steel')
  setCheck(doc, 'InternalTB', data.locationType === 'Internal')
  setCheck(doc, 'ExternalTB', data.locationType === 'External')
  setCheck(doc, 'NewTB',      data.newOrExisting === 'New')
  setCheck(doc, 'ExistingTB', data.newOrExisting === 'Existing')
  setCheck(doc, 'ToughenedTB', true)
  setCheck(doc, 'Direct',      true)

  doc.getForm().flatten()
  const fullBytes = await doc.save()

  // Preview: pages 1, 2, 3 (0-indexed) — AC2343 + PS1 header
  // Skip page 0 (cover brochure)
  const previewDoc = await PDFDocument.create()
  const indexes = [1, 2, 3].filter(i => i < doc.getPageCount())
  const copied = await previewDoc.copyPages(doc, indexes)
  copied.forEach(p => previewDoc.addPage(p))
  const previewBytes = await previewDoc.save()

  return { fullBytes, previewBytes }
}

export async function fillPS3(templateBytes: ArrayBuffer, data: FormData) {
  const doc = await PDFDocument.load(templateBytes)

  setText(doc, 'BC',           data.bcNumber)
  setText(doc, 'Address02',    data.address)
  setText(doc, 'Description3', data.structure)
  setText(doc, 'Description2', `12mm thick Glass Balustrade installation for ${data.structure} area using ${data.systemDisplayName} System`)
  setText(doc, 'Date03',       data.date)
  setText(doc, 'Legal',        '')

  setCheck(doc, 'B1TB',    true)
  setCheck(doc, 'F4TB',    true)
  setCheck(doc, 'GlassTB', true)
  setCheck(doc, 'PS1TB',   true)

  doc.getForm().flatten()
  const fullBytes = await doc.save()
  return { fullBytes, previewBytes: fullBytes }  // PS3 is 1 page, preview = full
}
```

---

## Wizard Flow

### State

```typescript
interface WizardState {
  step: 1 | 2 | 3 | 4
  docType: 'ps1' | 'ps3' | 'both' | null
  system: SystemKey | null
  formData: Partial<FormInputs>
  previewBytes: { ps1?: Uint8Array; ps3?: Uint8Array } | null
  fullBytes:    { ps1?: Uint8Array; ps3?: Uint8Array } | null
  generating: boolean
}
```

All state lives in `App.tsx`. Steps receive state and dispatch functions as props.

### Step 1 — Document Type

Three large selectable cards: PS1 only / PS3 only / PS1 + PS3

PS3-only skips Step 2 (no system selection needed for PS3 alone — wait, PS3 still needs a system for the description. Keep Step 2 for all flows).

### Step 2 — System

Cards for each system. Back returns to Step 1. Selected system highlighted.

### Step 3 — Details

Fields:
- Client / Designer Name (text, required)
- Property Address (text, required)
- BC Number (text — optional for PS1, required for PS3, show note)
- Substrate: Timber / Concrete / Steel (radio)
- Structure Type (select from STRUCTURE_OPTIONS)
- Location: Internal / External (radio)
- New or Existing (radio)

On submit:
1. Validate required fields
2. Determine if pool structure (`POOL_STRUCTURES.includes(structure)`)
3. Get heights from `SYSTEMS[system].heights[isPool ? 'pool' : 'default']`
4. Format today's date as `dd/mm/yyyy`
5. Fetch template bytes from `GET /wp-json/rg-ps1/v1/template/{system}` with WP nonce
6. Call `fillPS1` and/or `fillPS3`
7. Store bytes in state, advance to Step 4

Show spinner during generation.

### Step 4 — Preview

Render preview using PDF.js:

```typescript
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
```

Render each page to a `<canvas>` element in a scrollable container.

If both PS1 + PS3: show tabs to switch between previews.

Three action buttons below preview:

```
[ Download ]  [ Edit ▾ ]  [ Start Over ]
                  ↓
          Change System  →  Step 2
          Change Details →  Step 3
```

**Download:**
1. Trigger browser download using a temporary object URL
2. POST log to `/wp-json/rg-ps1/v1/log`
3. Show success toast "Saved to records"
4. Buttons stay visible

**Edit → Change System:** go to Step 2, preserve Step 3 form values, clear preview/bytes

**Edit → Change Details:** go to Step 3, preserve system, clear preview/bytes

**Start Over:** reset entire state to initial, go to Step 1

---

## File Naming

```
{ClientName} - {SystemDisplayName} - PS1.pdf
{ClientName} - {SystemDisplayName} - PS3.pdf
```

Spaces in client name are fine. No sanitisation needed for internal use.

---

## Records Table

Collapsible section below the wizard. Fetched on page load from `GET /wp-json/rg-ps1/v1/records`.

Columns: Date | Client Name | Address | System | Type | Generated By

---

## Vite Config

Output must be flat `main.js` + `main.css` in `dist/` for WordPress to enqueue:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
```

The React app mounts at `document.getElementById('rg-ps1-root')`.

---

## Templates `.htaccess`

Create `ps1-plugin/templates/.htaccess`:
```apache
Order deny,allow
Deny from all
```

---

## `.gitignore` additions

```
ps1-plugin/templates/*.pdf
ps1-plugin/dist/
ps1-plugin/node_modules/
```

PDF templates are NOT committed. They are copied manually to each environment.

---

## Build Order for Claude Code

1. Create full `ps1-plugin/` folder structure with all files as empty stubs
2. Write `rg-ps1-generator.php`
3. Write `includes/db.php`
4. Write `includes/admin-page.php`
5. Write `includes/rest-api.php`
6. Write `package.json` — deps: `react`, `react-dom`, `pdf-lib`, `pdfjs-dist`, dev: `vite`, `@vitejs/plugin-react`, `typescript`
7. Write `vite.config.ts` and `tsconfig.json`
8. Write `src/lib/systemConfig.ts`
9. Write `src/lib/pdfFiller.ts`
10. Write `src/lib/api.ts` — fetch template, post log, get records (always send `X-WP-Nonce` header from `window.RG_PS1.nonce`)
11. Write `src/types.ts`
12. Write `src/steps/Step1DocType.tsx`
13. Write `src/steps/Step2System.tsx`
14. Write `src/steps/Step3Details.tsx`
15. Write `src/steps/Step4Preview.tsx` (PDF.js rendering + action buttons)
16. Write `src/App.tsx` — wizard state machine
17. Write `src/main.tsx` — React root mounted at `#rg-ps1-root`
18. Create `templates/.htaccess`
19. Run `npm install && npm run build`

---

## Critical Notes for Claude Code

- Use `pdf-lib` NOT `pdfkit`. `pdf-lib` fills existing AcroForm fields. `pdfkit` creates new PDFs from scratch.
- `setText()` and `setCheck()` helpers must silently catch errors — not every template has every field. Wrap each in try/catch.
- Call `doc.getForm().flatten()` before `doc.save()`. This embeds values and prevents editing.
- PDF.js worker must be loaded from CDN to avoid bundling issues with Vite.
- WP nonce (`window.RG_PS1.nonce`) must be sent as `X-WP-Nonce` header on all REST requests or they return 403.
- Height values come from `systemConfig.ts` lookup only — never from direct user input.
- All wizard state persists in `App.tsx` — going back to a previous step must restore field values.
- The Edit button on Step 4 clears `previewBytes` and `fullBytes` but preserves `formData` and `system`.
- The `dist/` folder should be committed so the plugin works without a build step on the server.
- The React app must handle `window.RG_PS1` being undefined gracefully (for local dev, use fallback values).


