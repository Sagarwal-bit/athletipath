const crypto = require("crypto");

const requestBucket = new Map();

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:;");
  next();
}

function rateLimit({ windowMs = 60 * 1000, max = 60, keySelector } = {}) {
  return (req, res, next) => {
    const key = keySelector ? keySelector(req) : req.ip;
    const now = Date.now();
    const existing = requestBucket.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > existing.resetAt) {
      existing.count = 0;
      existing.resetAt = now + windowMs;
    }

    existing.count += 1;
    requestBucket.set(key, existing);

    const remaining = Math.max(0, max - existing.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (existing.count > max) {
      return res.status(429).json({ error: "Too many requests. Please retry later." });
    }

    return next();
  };
}

function validateJson(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const rule of schema.required || []) {
      if (req.body[rule] === undefined || req.body[rule] === null || req.body[rule] === "") {
        errors.push(`${rule} is required`);
      }
    }

    for (const [field, validator] of Object.entries(schema.validators || {})) {
      const value = req.body[field];
      if (value === undefined || value === null) continue;
      const result = validator(value);
      if (result !== true) errors.push(result || `${field} is invalid`);
    }

    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    return next();
  };
}

function signMediaToken(payload) {
  const secret = process.env.MEDIA_SIGNING_SECRET || process.env.JWT_SECRET || "media_secret";
  const exp = Date.now() + 5 * 60 * 1000;
  const body = JSON.stringify({ ...payload, exp });
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return Buffer.from(`${body}.${sig}`).toString("base64url");
}

function verifyMediaToken(token) {
  const secret = process.env.MEDIA_SIGNING_SECRET || process.env.JWT_SECRET || "media_secret";
  const decoded = Buffer.from(token, "base64url").toString("utf8");
  const idx = decoded.lastIndexOf(".");
  if (idx < 1) throw new Error("Invalid token");
  const body = decoded.slice(0, idx);
  const sig = decoded.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected !== sig) throw new Error("Invalid signature");
  const payload = JSON.parse(body);
  if (Date.now() > Number(payload.exp)) throw new Error("Token expired");
  return payload;
}

module.exports = {
  securityHeaders,
  rateLimit,
  validateJson,
  signMediaToken,
  verifyMediaToken,
};
