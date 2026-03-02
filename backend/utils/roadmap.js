const roadmapCatalog = require("../data/roadmapCatalog");

function listDomains() {
  return Object.entries(roadmapCatalog).map(([key, value]) => ({
    key,
    label: value.label,
  }));
}

function listSpecializations(domain) {
  const domainData = roadmapCatalog[domain];
  if (!domainData) return [];

  return Object.entries(domainData.specializations).map(([key, value]) => ({
    key,
    label: value.label,
  }));
}

function getRoadmap(domain, subdomain) {
  const specialization = roadmapCatalog[domain]?.specializations?.[subdomain];
  if (!specialization) return null;

  return {
    domain,
    domainLabel: roadmapCatalog[domain].label,
    subdomain,
    subdomainLabel: specialization.label,
    sessionsPerWeek: specialization.sessionsPerWeek,
    milestones: specialization.milestones.map((title, index) => ({
      number: index + 1,
      title,
    })),
  };
}

function getTrustGate(score) {
  if (score < 40) {
    return {
      status: "locked",
      message: "Roadmap locked. Improve verified activity consistency.",
    };
  }

  if (score <= 70) {
    return {
      status: "limited",
      message: "Limited mode. Complete only the next milestone in sequence.",
    };
  }

  return {
    status: "full",
    message: "Full progression unlocked.",
  };
}

function getLevelFromPercent(percentValue) {
  if (percentValue < 25) return "Level 1";
  if (percentValue < 50) return "Level 2";
  if (percentValue < 75) return "Level 3";
  return "Advanced";
}

function getNextTargetPercent(percentValue) {
  if (percentValue < 25) return 25;
  if (percentValue < 50) return 50;
  if (percentValue < 75) return 75;
  if (percentValue < 100) return 100;
  return 100;
}

function estimateDaysToTarget({
  totalMilestones,
  completedMilestones,
  nextTargetPercent,
  sessionsPerWeek,
  trustGateStatus,
}) {
  if (!totalMilestones) return 0;

  const neededMilestones = Math.max(
    0,
    Math.ceil((nextTargetPercent / 100) * totalMilestones) - completedMilestones
  );
  if (neededMilestones === 0) return 0;

  const paceMultiplier =
    trustGateStatus === "limited" ? 1.5 : trustGateStatus === "locked" ? 2 : 1;
  const effectiveSessions = Math.max(1, sessionsPerWeek);

  return Math.ceil((neededMilestones / effectiveSessions) * 7 * paceMultiplier);
}

module.exports = {
  roadmapCatalog,
  listDomains,
  listSpecializations,
  getRoadmap,
  getTrustGate,
  getLevelFromPercent,
  getNextTargetPercent,
  estimateDaysToTarget,
};
