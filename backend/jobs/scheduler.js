const { runAutomationCycle } = require("../services/automation.service");

function startScheduler() {
  const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS || 1000 * 60 * 60 * 24);

  // initial warm-up run
  runAutomationCycle().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("automation warm-up failed", err);
  });

  setInterval(() => {
    runAutomationCycle().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("automation cycle failed", err);
    });
  }, intervalMs);
}

module.exports = {
  startScheduler,
};
