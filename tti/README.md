## Thai Typography Intelligence (TTI)

**Thai Typography Intelligence (TTI)** is a **rule-based** decision engine that selects Thai typography configurations (font style, weight, spacing) based on deterministic rules defined in **Google Sheets**.

This is **not** an AI model, font generator, or image generator. It is a straightforward rule engine that reads rules from a spreadsheet, keeps them in memory, and applies them predictably.

---

### Project Structure

- `loadRules.js` — Loads typography rules from Google Sheets into memory.
- `ruleEngine.js` — Pure rule-based selection logic (`selectRule`).
- `server.js` — Minimal Express API wrapper.
- `index.js` — Simple entry point for loading rules / library exports.
- `package.json` — Node project configuration and dependencies.

All core files live under the `tti` directory.

---

### Requirements

- **Runtime**: Node.js **18+**
- **Google Sheets** as the only data source
- **Service Account** credentials for Google Sheets API

---

### Google Sheets Setup

**Sheet ID**

The engine is configured with the following default Sheet ID (can be overridden via env):

- `1qqnMZmv-aLgD5khusmMQueNgNYNIUF9NsZe84m3BjMM`

You can override it with:

- `TTI_SHEET_ID` — Spreadsheet ID
- `TTI_SHEET_RANGE` — Optional range (default: `A1:J`)

**Expected schema (columns)**

First row is the header. Each subsequent row is one rule:

- `rule_id`
- `usage`
- `audience`
- `density`
- `tone`
- `font_style`
- `weight`
- `spacing`
- `priority`
- `note`

Columns must appear in this order in the first sheet, starting at column A. Additional columns are ignored.

**System fallback rule**

Define at least one row with a **priority of `100`** to serve as the system fallback rule when no specific rule matches the input.

---

### Authentication (Service Account)

This project uses a **Service Account** for accessing Google Sheets.

1. Create or obtain a Service Account JSON key file from Google Cloud Console.
2. Share the target Google Sheet with the Service Account email with **read** access.
3. Set the environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
```

On Windows (PowerShell):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
```

The `@googleapis/sheets` client will use this to authenticate.

---

### Installation

From the project root:

```bash
npm install
```

This installs:

- `@googleapis/sheets` — for Google Sheets API
- `express` — for the minimal HTTP API

---

### Phase 1 — Load Rules (no server)

Core file: `loadRules.js`

- Uses Google Sheets API (read-only).
- Reads the header row and converts each subsequent row to a JS object.
- Stores all rules in an in-memory array called `rules`.
- Exports:
  - `loadRules()` — async function to fetch and populate rules.
  - `rules` — the in-memory array (populated after `loadRules()`).

Manual run:

```bash
npm run load-rules
```

This invokes `tti/index.js`, which calls `loadRules()` and prints how many rules were loaded.

---

### Phase 2 — Rule Engine Core

Core file: `ruleEngine.js`

Exported function:

- `selectRule(input)`

Input:

```js
{
  usage,
  audience,
  density,
  tone
}
```

Logic (strict, rule-based):

1. Filter rules step-by-step:
   - match `usage`
   - match `audience`
   - match `density`
   - match `tone`
2. If multiple rules remain:
   - sort by `priority` (highest numeric value wins)
3. If no rule matches:
   - fallback to the first rule with `priority === 100`
4. Returns the selected **rule object** or `null` if no suitable rule exists.

`selectRule` assumes `loadRules()` has been called beforehand.

---

### Phase 3 — Minimal API Wrapper

Core file: `server.js`

Starts a minimal Express server with a single endpoint.

**Start the server**

```bash
npm start
```

This will:

1. Call `loadRules()` to load and cache rules in memory.
2. Start an Express server (default port: `3000`).

**Endpoint**

- `POST /tti/decide-font`

Request body:

```json
{
  "usage": "some_usage",
  "audience": "some_audience",
  "density": "some_density",
  "tone": "some_tone"
}
```

Response body:

```json
{
  "rule_id": "RULE_123",
  "font_style": "SomeFontName",
  "weight": "400",
  "spacing": "normal"
}
```

If no rule matches and no system fallback rule (priority = 100) is defined, the API returns:

```json
{
  "error": "No matching rule found and no system fallback rule (priority=100) is defined."
}
```

Status codes:

- `200` — successful decision.
- `400` — missing required input fields.
- `404` — no matching rule and no fallback rule.

---

### Design Principles

- **Rule-based only** — no machine learning or generative logic.
- **Google Sheet is the database** — no other persistent storage.
- **Deterministic** — same input + same sheet state = same output.
- **Minimal, explicit, and boring** — no unnecessary abstractions, frameworks, or optimizations.

