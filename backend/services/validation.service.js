const db = require("../config/db");

function deriveSpeedKmh(distanceKm, durationSec, explicitSpeed) {
  if (Number(explicitSpeed) > 0) return Number(explicitSpeed);
  if (Number(durationSec) <= 0) return 0;
  return (Number(distanceKm) / Number(durationSec)) * 3600;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function validateActivityFields(payload) {
  const distance = Number(payload.distance);
  const duration = Number(payload.duration);
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const speed = deriveSpeedKmh(distance, duration, payload.speed);

  const errors = [];
  if (!Number.isFinite(distance) || distance <= 0 || distance > 100) {
    errors.push("distance must be between 0 and 100 km");
  }
  if (!Number.isFinite(duration) || duration <= 0 || duration > 60 * 60 * 24) {
    errors.push("duration must be between 1 second and 24 hours");
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push("latitude is invalid");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push("longitude is invalid");
  }
  if (speed > 55) {
    errors.push("unrealistic speed detected");
  }

  return {
    errors,
    normalized: {
      distance,
      duration,
      latitude,
      longitude,
      speed,
    },
  };
}

async function detectGpsJump(studentId, latitude, longitude, activityTime = new Date()) {
  const [[last]] = await db.query(
    `SELECT latitude, longitude, created_at
     FROM activity_logs
     WHERE student_id=?
     ORDER BY created_at DESC
     LIMIT 1`,
    [studentId]
  );

  if (!last) {
    return { jumpDetected: false, jumpKm: 0, speedFromJump: 0 };
  }

  const jumpKm = haversineKm(
    Number(last.latitude),
    Number(last.longitude),
    Number(latitude),
    Number(longitude)
  );

  const elapsedHours = Math.max(
    1 / 3600,
    (new Date(activityTime).getTime() - new Date(last.created_at).getTime()) / 3600000
  );
  const speedFromJump = jumpKm / elapsedHours;
  const jumpDetected = jumpKm > 5 && speedFromJump > 90;

  return { jumpDetected, jumpKm, speedFromJump };
}

async function detectDuplicateVideo(studentId, file) {
  if (!file?.originalname) return { duplicate: false, reason: null };

  const [rows] = await db.query(
    `SELECT id, video_path
     FROM activity_logs
     WHERE student_id=? AND video_path IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 20`,
    [studentId]
  );

  const normalizedName = file.originalname.toLowerCase().trim();
  const duplicateRow = rows.find((row) =>
    String(row.video_path || "").toLowerCase().includes(normalizedName)
  );

  if (!duplicateRow) return { duplicate: false, reason: null };

  return {
    duplicate: true,
    reason: "duplicate_video_filename_detected",
  };
}

module.exports = {
  deriveSpeedKmh,
  validateActivityFields,
  detectGpsJump,
  detectDuplicateVideo,
};
