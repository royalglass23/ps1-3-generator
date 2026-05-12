# PS1 Generator — Claude Code Project Brief

## What this is

A web-based tool for Royal Glass Limited that replaces an Excel/VBA macro. Staff fill a form, click Generate, and receive a completed PS1 (Producer Statement) PDF package ready to submit to Auckland Council for building consent.

The PDF templates already exist as fillable AcroForm PDFs. We are not recreating them — we are filling their form fields programmatically using `pdf-lib`.

---

## Tech Stack

- **Runtime:** Node.js (LTS)
- **Framework:** Express
- **PDF filling:** `pdf-lib`
- **Database:** Supabase (PostgreSQL) — logs every generated PS1
- **Frontend:** Plain HTML + vanilla JS (single page, no framework)
- **Auth:** Single shared password via env variable (internal use only, Phase 1)

No React. No build step. Keep it simple.

---

## Project Structure

```
ps1-generator/
├── CLAUDE.md
├── .env.example
├── .gitignore
├── package.json
├── src/
│   ├── server.js           # Express app, routes
│   ├── pdfFiller.js        # pdf-lib logic — fills AcroForm fields
│   ├── systemConfig.js     # system definitions, field mappings, height lookup
│   └── supabaseClient.js   # Supabase logging
├── templates/              # Fillable PDF templates (NOT committed to git — see below)
│   ├── MP_PS1_Template.pdf
│   ├── DD_PS1_Template.pdf
│   ├── Side_Channel_PS_jur.pdf
│   └── PS3_Template.pdf
├── public/
│   └── index.html          # The form UI
└── generated/              # Output folder — gitignored
```

> **Note on templates:** The PDF templates contain engineering drawings and signed producer statements from PNP Engineering and Lautrec. Do NOT commit them to the git repo. Add `/templates/` to `.gitignore`. They are copied manually to each machine.

---

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```
PORT=3000
ACCESS_PASSWORD=royalglass2025
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

---

## PDF Templates — AcroForm Fields

Each template has these fillable fields. `pdf-lib` fills them by name.

### Mini Post (`MP_PS1_Template.pdf`) — 22 fields
### Double Disc (`DD_PS1_template.pdf`) — 22 fields

Both share the same field names:

| Field | Type | Value |
|---|---|---|
| `Name` | Text | Client name |
| `Address` | Text | Property address |
| `Description` | Text | Auto-generated (see below) |
| `Date0` | Text | Today's date dd/mm/yyyy |
| `Date01` | Text | Today's date dd/mm/yyyy |
| `Date-4` | Text | Today's date dd/mm/yyyy |
| `Name-2` | Text | Client name (repeated on PS1 page) |
| `Address-2` | Text | Property address (repeated) |
| `Address-4` | Text | Property address (repeated) |
| `Thickness` | Text | `12` (hardcoded) |
| `Height` | Text | From height lookup table |
| `HeightAboveFix` | Text | From height lookup table |
| `TimberTB` | Checkbox | Tick if substrate = Timber |
| `ConcreteTB` | Checkbox | Tick if substrate = Concrete |
| `SteelTB` | Checkbox | Tick if substrate = Steel |
| `InternalTB` | Checkbox | Tick if location = Internal |
| `ExternalTB` | Checkbox | Tick if location = External |
| `NewTB` | Checkbox | Tick if new/existing = New |
| `ExistingTB` | Checkbox | Tick if new/existing = Existing |
| `ToughenedTB` | Checkbox | Always tick |
| `Direct` | Checkbox | Always tick (direct fixed cladding) |
| `Cont` | Checkbox | Leave unticked |

### Side Channel / Juralco (`Side_Channel_PS_jur.pdf`) — 20 fields

Same as above except:
- No `Address-4` or `Date-4` fields
- Has `Address02` instead of `Address-2` for the PS1 page address

| Field | Type | Value |
|---|---|---|
| `Name` | Text | Client name |
| `Address` | Text | Property address |
| `Description` | Text | Auto-generated |
| `Date0` | Text | Today's date |
| `Date01` | Text | Today's date |
| `Name-2` | Text | Client name |
| `Address02` | Text | Property address |
| `Thickness` | Text | `12` |
| `Height` | Text | From height lookup |
| `HeightAboveFix` | Text | From height lookup |
| `TimberTB` | Checkbox | substrate = Timber |
| `ConcreteTB` | Checkbox | substrate = Concrete |
| `SteelTB` | Checkbox | substrate = Steel |
| `InternalTB` | Checkbox | location = Internal |
| `ExternalTB` | Checkbox | location = External |
| `NewTB` | Checkbox | new/existing = New |
| `ExistingTB` | Checkbox | new/existing = Existing |
| `ToughenedTB` | Checkbox | Always tick |
| `Direct` | Checkbox | Always tick |
| `Cont` | Checkbox | Leave unticked |

### PS3 (`PS3_Template.pdf`) — 11 fields

| Field | Type | Value |
|---|---|---|
| `BC` | Text | Building consent number |
| `Address02` | Text | Property address |
| `Description3` | Text | Location/structure (e.g. `Internal Stair Area`) |
| `Description2` | Text | Auto-generated description (see below) |
| `Date03` | Text | Today's date dd/mm/yyyy |
| `Legal` | Text | Leave blank |
| `B1TB` | Checkbox | Always tick |
| `B2TB` | Checkbox | Leave unticked |
| `F4TB` | Checkbox | Always tick |
| `GlassTB` | Checkbox | Always tick |
| `PS1TB` | Checkbox | Always tick |

---

## Auto-Generated Description

The `Description` field on AC2343 and `Description2` on PS3 are built from inputs:

```
`${thickness}mm thick Glass Balustrade installation for ${structure} area using ${systemDisplayName} System`
```

Example: `12mm thick Glass Balustrade installation for Internal Stair Area using Mini Post System`

The `Description` field on the AC2343 cover sheet uses a shorter version:
```
`New ${structure} ${systemDisplayName} Glass Balustrade`
```

---

## System Configuration (`systemConfig.js`)

```javascript
const SYSTEMS = {
  'mini-post': {
    displayName: 'Mini Post',
    templateFile: 'MP_PS1_Template.pdf',
    heights: {
      'pool': { height: '1.26', heightAboveFix: '1.05' },
      'default': { height: '1.08', heightAboveFix: '0.85' }
    }
  },
  'double-disc': {
    displayName: 'Double Disc',
    templateFile: 'DD_PS1_template.pdf',
    heights: {
      'pool': { height: '1.30', heightAboveFix: '1.25' },
      'default': { height: '1.13', heightAboveFix: '1.05' }
    }
  },
  'side-channel': {
    displayName: 'Edgetec Infinity Side Channel',
    templateFile: 'Side_Channel_PS_jur.pdf',
    heights: {
      'pool': { height: '1.25', heightAboveFix: '1.05' },
      'default': { height: '1.20', heightAboveFix: '1.00' }
    }
  }
}

// Structure types that count as pool fence for height lookup
const POOL_STRUCTURES = ['Pool Area', 'Pool Fence']
```

---

## API Routes

### `POST /api/generate`

Accepts JSON body:

```json
{
  "clientName": "Michael and Penelope",
  "address": "65 Alberton Avenue Mount Albert, Auckland 1025",
  "bcNumber": "BCO10363615",
  "system": "mini-post",
  "substrate": "Timber",
  "structure": "Pool Area",
  "location": "External",
  "newOrExisting": "New",
  "generatePS3": true,
  "consentAuthority": "Auckland Council"
}
```

Returns a downloadable PDF blob, or JSON error.

### `GET /api/records`

Returns last 50 generated records from Supabase for the admin log table.

### `GET /health`

Returns `{ ok: true }`.

---

## Supabase Table

Create this table in your Supabase project:

```sql
create table ps1_records (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  client_name text not null,
  address text not null,
  bc_number text,
  system text not null,
  substrate text not null,
  structure text not null,
  location text not null,
  new_or_existing text not null,
  ps3_generated boolean default false,
  generated_by text default 'internal',
  filename text
);
```

---

## Form UI (`public/index.html`)

Single page. Fields:

- **Client / Designer Name** — text input
- **Property Address** — text input
- **BC Number** — text input (optional)
- **Consent Authority** — dropdown, default Auckland Council, editable
- **System** — dropdown: Mini Post, Double Disc, Edgetec Infinity Side Channel
- **Substrate** — dropdown: Timber, Concrete, Steel
- **Structure / Location Type** — dropdown: Deck, Balcony, Pool Area, Stair Area, Landing, Stair and Balcony Area
- **Location** — radio: Internal / External
- **New or Existing** — radio: New / Existing
- **Also generate PS3?** — checkbox

Two buttons:
- **Generate PS1** — calls `/api/generate` and downloads the PDF
- **Generate PS1 + PS3** — same but with PS3 flag

Below the form: a table showing the last 20 generated records pulled from `/api/records`.

Password gate: on page load, if no valid session, show a simple password prompt. Check against `ACCESS_PASSWORD` env var via a `POST /api/auth` route that sets a session cookie.

---

## Transferring to Another Machine

1. Copy the entire project folder (USB or network)
2. Copy the `/templates/` PDFs into the templates folder on the new machine
3. Copy `.env` (or recreate it)
4. Run `npm install` then `node src/server.js`
5. Access at `http://localhost:3000`

The `templates/` folder and `.env` are gitignored so they travel separately from the code.

---

## Git Setup

```
.gitignore should include:
/templates/
/generated/
.env
node_modules/
```

Push to a private GitHub repo under the Royal Glass account. This is the master copy — any machine can pull from it and run.

---

## Build Order for Claude Code

1. Scaffold `package.json` with dependencies: `express`, `pdf-lib`, `cookie-parser`, `dotenv`, `helmet`, `mysql2`
2. Build `systemConfig.js` with the system definitions and height lookup
3. Build `pdfFiller.js` — the core logic that takes form inputs, selects template, fills all fields, returns PDF bytes
4. Build `supabaseClient.js` — initialise MySQL pool, export `logGeneration(record)` and `getRecords(limit)` functions
5. Build `server.js` — Express app with all routes, session auth middleware
6. Build `public/index.html` — form UI with record log table at bottom
7. Build `.env.example`
8. Test with the actual PDF templates — verify all fields fill correctly and output downloads

---

## Notes for Claude Code

- Use `pdf-lib` not `pdfkit`. `pdfkit` creates new PDFs; `pdf-lib` fills existing ones.
- Checkbox fields use `PDFCheckBox` — tick with `.check()`, untick with `.uncheck()`
- Text fields use `PDFTextField` — set with `.setText(value)`
- Load the template with `PDFDocument.load(templateBytes)` then `form.getTextField('Name').setText(value)`
- After filling, flatten the form before saving: `form.flatten()` — this embeds the values so they can't be edited
- The `generated/` folder is where completed PDFs are written temporarily before being sent to the browser. Clean up files older than 1 hour with a simple interval.
- Keep `pdfFiller.js` and `systemConfig.js` decoupled — the filler should just receive a config object and form data, not know about which system is which.
- Do not hardcode any Royal Glass-specific values in `server.js`. They all belong in `systemConfig.js` or `.env`.