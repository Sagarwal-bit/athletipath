function computeTrustScore(activityRows) {
  let score = 50;

  for (const row of activityRows) {
    const distance = Number(row.distance || 0);
    const duration = Number(row.duration || 0);
    const speed =
      Number(row.speed) > 0
        ? Number(row.speed)
        : duration > 0
          ? (distance / duration) * 3600
          : 0;
    const hasVideo = Boolean(row.video_path);

    const plausibleDistance = distance >= 0.1 && distance <= 12;
    const plausibleSpeed = speed >= 1 && speed <= 40;

    if (plausibleDistance && plausibleSpeed) score += 3;
    else score -= 4;

    if (hasVideo) score += 2;
    else score -= 1;
  }

  if (activityRows.length >= 12) score += 8;
  else if (activityRows.length >= 6) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = {
  computeTrustScore,
};
