const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: token missing" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}

function ensureSelfOrAdmin(paramName = "studentId") {
  return (req, res, next) => {
    const requestedId = Number(req.params[paramName]);
    const requesterId = Number(req.user?.id);
    const role = req.user?.role;

    if (role === "admin" || role === "teacher" || requesterId === requestedId) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden: access denied" });
  };
}

module.exports = {
  requireAuth,
  ensureSelfOrAdmin,
};
