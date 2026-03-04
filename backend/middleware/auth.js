const jwt = require("jsonwebtoken");
const { normalizeRole } = require("./rbac");
const { logTokenTampering } = require("../services/security.service");

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: token missing" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    payload.role = normalizeRole(payload.role);
    req.user = payload;
    next();
  } catch (err) {
    logTokenTampering({
      ipAddress: req.ip,
      tokenSnippet: token ? String(token).slice(0, 16) : null,
    }).catch(() => {});
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function ensureSelfOrAdmin(paramName = "studentId") {
  return (req, res, next) => {
    const requestedId = Number(req.params[paramName]);
    const requesterId = Number(req.user?.id);
    const role = normalizeRole(req.user?.role);

    if (role === "admin" || role === "coach" || requesterId === requestedId) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden: access denied" });
  };
}

module.exports = {
  requireAuth,
  ensureSelfOrAdmin,
  extractBearerToken,
};
