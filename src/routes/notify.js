const express = require("express");
const https = require("https");

const router = express.Router();

const sendOneSignal = (payload, restApiKey) =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "onesignal.com",
        path: "/api/v1/notifications",
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(data),
          Authorization: `Basic ${restApiKey}`,
        },
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = body ? JSON.parse(body) : null;
          } catch {
            json = { raw: body };
          }
          resolve({ statusCode: res.statusCode || 500, body: json });
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("OneSignal request timeout"));
    });

    req.write(data);
    req.end();
  });

router.post("/", async (req, res) => {
  const adminToken = req.get("x-admin-token") || req.body?.adminToken;
  const expectedToken = process.env.ADMIN_TOKEN;
  if (!expectedToken) {
    return res.status(500).json({ ok: false, error: "Missing ADMIN_TOKEN" });
  }
  if (!adminToken || adminToken !== expectedToken) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !restApiKey) {
    return res.status(500).json({ ok: false, error: "Missing OneSignal keys" });
  }

  const title = String(req.body?.title || "").trim();
  const message = String(req.body?.message || "").trim();
  const url = String(req.body?.url || "").trim();

  if (!title || !message) {
    return res.status(400).json({ ok: false, error: "Missing title or message" });
  }

  const payload = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["Subscribed Users"],
  };
  if (url) payload.url = url;

  try {
    const response = await sendOneSignal(payload, restApiKey);
    if (response.statusCode >= 400) {
      return res
        .status(response.statusCode)
        .json({ ok: false, error: response.body });
    }
    return res.json({
      ok: true,
      id: response.body?.id || null,
      recipients: response.body?.recipients ?? null,
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message || String(err) });
  }
});

module.exports = router;
