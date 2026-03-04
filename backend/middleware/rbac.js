const { ROLES, COACH_EQUIVALENT_ROLES } = require("../constants/roles");

function normalizeRole(role) {
  if (role === ROLES.TEACHER) return ROLES.COACH;
  return role;
}

function authorizeRoles(...allowedRoles) {
  const allowed = new Set(allowedRoles.map(normalizeRole));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    return next();
  };
}

function ensureSelfOrRoles(paramName = "studentId", roles = [ROLES.ADMIN, ROLES.COACH]) {
  const allowed = new Set(
    roles.flatMap((r) => (r === ROLES.COACH ? COACH_EQUIVALENT_ROLES : [r])).map(normalizeRole)
  );

  return (req, res, next) => {
    const requestedId = Number(req.params[paramName]);
    const requesterId = Number(req.user?.id);
    const role = normalizeRole(req.user?.role);

    if (requesterId === requestedId || allowed.has(role)) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden: access denied" });
  };
}

module.exports = {
  authorizeRoles,
  ensureSelfOrRoles,
  normalizeRole,
};
