const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD");
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
};

router.post("/", async (req, res) => {
  const expectedToken = process.env.ADMIN_TOKEN;
  const adminToken = req.get("x-admin-token") || req.body?.adminToken;

  if (!expectedToken) {
    return res.status(500).json({ ok: false, error: "Missing ADMIN_TOKEN" });
  }
  if (!adminToken || adminToken !== expectedToken) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const to = String(req.body?.to || process.env.MAIL_DEFAULT_TO || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();
  const sender = process.env.GMAIL_USER;
  const fromName = process.env.MAIL_FROM_NAME || "HDHA";

  if (!to || !subject || !message) {
    return res.status(400).json({ ok: false, error: "Missing to, subject, or message" });
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${fromName}" <${sender}>`,
      to,
      subject,
      text: message,
      html: message
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${line.replace(/[&<>"]/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
        }[char]))}</p>`)
        .join(""),
    });

    return res.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error.message || String(error),
    });
  }
});

module.exports = router;
