function slope(values) {
  if (!values.length) return 0;
  if (values.length === 1) return 0;
  const first = Number(values[0]);
  const last = Number(values[values.length - 1]);
  return last - first;
}

function getConsistencyScore(activitiesByDay) {
  if (!activitiesByDay.length) return 0;
  const daysWithActivity = activitiesByDay.filter((d) => d.count > 0).length;
  return Math.round((daysWithActivity / activitiesByDay.length) * 100);
}

function generateRecommendations({
  trustScore,
  weeklyFrequency,
  speedTrend,
  consistencyScore,
  completionPercent,
  pendingCoachApprovals,
}) {
  const recommendations = [];

  if (weeklyFrequency < 3) {
    recommendations.push({
      code: "increase_frequency",
      title: "Increase training frequency",
      reason: `You logged ${weeklyFrequency.toFixed(1)} sessions/week; target at least 3.`,
      priority: "high",
    });
  }

  if (consistencyScore < 60) {
    recommendations.push({
      code: "improve_consistency",
      title: "Improve consistency",
      reason: `Consistency score is ${consistencyScore}/100 based on recent daily activity pattern.`,
      priority: "high",
    });
  }

  if (speedTrend < 0) {
    recommendations.push({
      code: "speed_decline",
      title: "Focus on skill improvement",
      reason: "Average speed trend is declining over recent sessions.",
      priority: "medium",
    });
  }

  if (trustScore < 40) {
    recommendations.push({
      code: "trust_recovery",
      title: "Recover trust score before progression",
      reason: `Trust score is ${trustScore}, below progression threshold 40.`,
      priority: "critical",
    });
  }

  if (trustScore >= 70 && completionPercent >= 75 && pendingCoachApprovals === 0) {
    recommendations.push({
      code: "ready_next_milestone",
      title: "Ready for next milestone",
      reason: "Strong trust, high completion, and no pending coach approval blockers.",
      priority: "medium",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      code: "maintain_routine",
      title: "Maintain current routine",
      reason: "Recent performance and trust trends are stable.",
      priority: "low",
    });
  }

  return recommendations;
}

module.exports = {
  slope,
  getConsistencyScore,
  generateRecommendations,
};
