const { loadRules, rules } = require('./loadRules');
const { selectRule } = require('./ruleEngine');

/**
 * Simple entry point for manually loading rules and testing the rule engine
 * without running the HTTP server.
 *
 * Usage:
 *   npm run load-rules
 */
async function main() {
  try {
    await loadRules();

    // Example usage (can be adjusted or removed as needed)
    if (require.main === module) {
      console.log(`Loaded ${rules.length} rules from Google Sheets.`);
    }
  } catch (err) {
    console.error('Error loading rules:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadRules,
  rules,
  selectRule,
};

