function sanitizeUserId(input) {
  const raw = String(input || "").trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9._-]/g, "").slice(0, 64);
  return cleaned || "default";
}

function resolveUserId(req) {
  const headerId = req.get("x-user-id");
  const queryId = req.query?.userId;
  const bodyId = typeof req.body?.userId === "string" ? req.body.userId : "";
  return sanitizeUserId(headerId || queryId || bodyId || "default");
}

function userContext(req, _res, next) {
  req.userId = resolveUserId(req);
  next();
}

module.exports = {
  userContext,
  sanitizeUserId,
};
