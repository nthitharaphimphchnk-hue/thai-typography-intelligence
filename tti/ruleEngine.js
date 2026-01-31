const { rules } = require('./loadRules');

/**
 * Select the best rule based on the given input and the currently loaded rules.
 *
 * Logic (fixed, rule-based):
 * 1. Accept input: { usage, audience, density, tone }
 * 2. Filter rules step-by-step:
 *    - match usage
 *    - match audience
 *    - match density
 *    - match tone
 * 3. If multiple rules remain:
 *    - sort by priority (highest wins)
 * 4. If no rule matches:
 *    - fallback to system rule (priority === 100)
 * 5. Return selected rule object
 *
 * NOTE:
 * - This function assumes that rules have already been loaded into memory
 *   (via loadRules() in loadRules.js) before it is called.
 *
 * @param {Object} input
 * @param {string} input.usage
 * @param {string} input.audience
 * @param {string} input.density
 * @param {string} input.tone
 * @returns {Object|null} The selected rule object, or null if no suitable rule exists.
 */
function selectRule(input) {
  if (!input) {
    throw new Error('selectRule requires an input object.');
  }

  const { usage, audience, density, tone } = input;

  let candidates = Array.isArray(rules) ? rules.slice() : [];

  // Step-by-step deterministic filtering
  candidates = candidates.filter((rule) => rule.usage === usage);
  candidates = candidates.filter((rule) => rule.audience === audience);
  candidates = candidates.filter((rule) => rule.density === density);
  candidates = candidates.filter((rule) => rule.tone === tone);

  // If no rule matches, fallback to system rule with priority === 100
  if (candidates.length === 0) {
    const fallbackCandidates = (Array.isArray(rules) ? rules : []).filter(
      (rule) => Number(rule.priority) === 100
    );

    if (fallbackCandidates.length === 0) {
      // No explicit system rule found; return null to make the failure explicit.
      return null;
    }

    // If multiple fallback rules exist, choose the first one deterministically.
    return fallbackCandidates[0];
  }

  // If multiple rules remain, sort by priority (highest wins)
  candidates.sort((a, b) => {
    const pa = Number(a.priority) || 0;
    const pb = Number(b.priority) || 0;
    return pb - pa;
  });

  return candidates[0];
}

module.exports = {
  selectRule,
};

