const { google } = require('googleapis');

// Sheet configuration
// - Sheet ID is provided by the user and can be overridden via env if needed.
// - Rules are expected in the first sheet, columns A-J, with a header row.
const SHEET_ID = process.env.TTI_SHEET_ID || '1qqnMZmv-aLgD5khusmMQueNgNYNIUF9NsZe84m3BjMM';
const RANGE = process.env.TTI_SHEET_RANGE || 'A1:J';

/**
 * In‑memory cache of all rules loaded from Google Sheets.
 * This is the single source of truth for the rule engine at runtime.
 *
 * NOTE: This array is populated by calling loadRules() during application startup.
 */
let rules = [];

/**
 * Create an authenticated Google Sheets client using a Service Account.
 *
 * Authentication:
 * - GOOGLE_CREDENTIALS_JSON: JSON string of Service Account credentials (required).
 *   On Render: set this env var with the full credentials.json content.
 *   Local: $env:GOOGLE_CREDENTIALS_JSON = Get-Content credentials.json -Raw
 */
function createSheetsClient() {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_CREDENTIALS_JSON environment variable is not set.\n' +
      'Set it with the full Service Account JSON (e.g. content of credentials.json).'
    );
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (err) {
    throw new Error('GOOGLE_CREDENTIALS_JSON is invalid JSON: ' + err.message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Convert a raw Google Sheets row array into a rule object using the header row as keys.
 * @param {string[]} headers
 * @param {string[]} row
 * @returns {object}
 */
function mapRowToRule(headers, row) {
  const rule = {};

  headers.forEach((header, index) => {
    const key = String(header || '').trim();
    if (!key) return;

    const value = row[index] !== undefined ? String(row[index]).trim() : '';

    // Ensure consistent typing for known fields
    if (key === 'priority') {
      const numericPriority = Number(value);
      rule[key] = Number.isFinite(numericPriority) ? numericPriority : 0;
    } else {
      rule[key] = value;
    }
  });

  return rule;
}

/**
 * Load all rules from Google Sheets into memory.
 *
 * - Reads the header row to determine field names.
 * - Converts each subsequent row into a rule object.
 * - Populates the exported `rules` array.
 *
 * @returns {Promise<object[]>} The loaded rules array.
 */
async function loadRules() {
  const sheets = createSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    majorDimension: 'ROWS',
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    rules = [];
    return rules;
  }

  let headers = rows[0].map((h) => String(h || '').trim());
  
  // Normalize: ensure first column maps to 'rule_id' regardless of header name
  // This handles cases where the first column header is 'คอลัมน์ 1' or other names
  if (headers.length > 0 && headers[0] !== 'rule_id') {
    headers[0] = 'rule_id';
  }
  
  const dataRows = rows.slice(1);

  const loadedRules = dataRows
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) => mapRowToRule(headers, row))
    .filter((rule) => rule.rule_id); // Require rule_id for a rule to be valid

  // Update the exported rules array by mutating it (not reassigning)
  rules.length = 0;
  rules.push(...loadedRules);

  return rules;
}

module.exports = {
  loadRules,
  rules,
};

