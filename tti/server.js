const express = require('express');
const { loadRules } = require('./loadRules');
const { selectRule } = require('./ruleEngine');

const app = express();
app.use(express.json());

// Minimal health endpoint (not required for rule logic, but useful operationally)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * POST /tti/decide-font
 *
 * Request body:
 * {
 *   usage,
 *   audience,
 *   density,
 *   tone
 * }
 *
 * Response body:
 * {
 *   rule_id,
 *   font_style,
 *   weight,
 *   spacing
 * }
 */
app.post('/tti/decide-font', (req, res) => {
  const { usage, audience, density, tone } = req.body || {};

  if (!usage || !audience || !density || !tone) {
    return res.status(400).json({
      error: 'Missing required fields: usage, audience, density, tone',
    });
  }

  const rule = selectRule({ usage, audience, density, tone });

  if (!rule) {
    return res.status(404).json({
      error: 'No matching rule found and no system fallback rule (priority=100) is defined.',
    });
  }

  const { rule_id, font_style, weight, spacing } = rule;

  return res.json({
    rule_id,
    font_style,
    weight,
    spacing,
  });
});

// Initialize rules, then start the server.
async function start() {
  try {
    await loadRules();
    console.log('Rules loaded on startup');

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      // Intentional: no logging framework, just a simple console.log.
      console.log(`TTI API listening on port ${port}`);

      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      setInterval(() => {
        loadRules()
          .then(() => {
            console.log('Rules reloaded automatically at', new Date().toISOString());
          })
          .catch((err) => {
            console.error('Rules reload failed:', err.message);
          });
      }, FIVE_MINUTES_MS);
    });
  } catch (err) {
    console.error('Failed to start TTI server:', err.message);
    process.exit(1);
  }
}

// Start only when this file is executed directly.
if (require.main === module) {
  start();
}

module.exports = {
  app,
  start,
};

