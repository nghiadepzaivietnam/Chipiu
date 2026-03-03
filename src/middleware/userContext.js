const SHARED_USER_ID = "hdha-shared";

function sanitizeUserId(input) {
  const raw = String(input || "").trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9._-]/g, "").slice(0, 64);
  return cleaned || "default";
}

function resolveUserId(req) {
  const forcedShared = process.env.SHARED_USER_ID || SHARED_USER_ID;
  return sanitizeUserId(forcedShared);
}

function userContext(req, _res, next) {
  req.userId = resolveUserId(req);
  next();
}

module.exports = {
  userContext,
  sanitizeUserId,
};
