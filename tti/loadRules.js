const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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
 * - Uses GOOGLE_APPLICATION_CREDENTIALS env var pointing to the Service Account JSON file.
 * - See README.md for setup instructions.
 */
function createSheetsClient() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.\n' +
      'Please set it in PowerShell using:\n' +
      '  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"\n' +
      'Replace "C:\\path\\to\\service-account.json" with the actual path to your Service Account JSON file.'
    );
  }

  // Resolve the path (handles relative paths and ~ expansion)
  const resolvedPath = path.resolve(credentialsPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Service Account credentials file not found: ${resolvedPath}\n` +
      'Please verify the file path and set GOOGLE_APPLICATION_CREDENTIALS in PowerShell:\n' +
      `  $env:GOOGLE_APPLICATION_CREDENTIALS="${resolvedPath}"\n` +
      'Make sure the file exists at the specified location.'
    );
  }

  // Check if file is readable
  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch (err) {
    throw new Error(
      `Service Account credentials file is not readable: ${resolvedPath}\n` +
      'Please check file permissions and ensure the file is readable.\n' +
      'Set GOOGLE_APPLICATION_CREDENTIALS in PowerShell:\n' +
      `  $env:GOOGLE_APPLICATION_CREDENTIALS="${resolvedPath}"`
    );
  }

  const auth = new google.auth.GoogleAuth({
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

