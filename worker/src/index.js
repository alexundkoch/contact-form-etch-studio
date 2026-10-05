// Contact form → email. Receives the form as JSON (fetch from the Etch Studio site),
// validates it and sends it through your own SMTP server (port 587 STARTTLS or 465 TLS).
import { WorkerMailer } from "worker-mailer";

const LIMITS = { name: 120, email: 200, phone: 50, subject: 200, message: 5000 };

// ALLOWED_ORIGINS: comma-separated list of site origins that may post to this worker.
function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );
}

function corsHeaders(origin, allowed) {
  const headers = { Vary: "Origin" };
  if (allowed.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

function jsonResponse(body, status, origin, allowed) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin, allowed) },
  });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Single-line values: no line breaks, quotes or angle brackets (header injection), trimmed and capped.
function sanitizeLine(value, max = 200) {
  return String(value ?? "").replace(/[\r\n"<>]+/g, " ").trim().slice(0, max);
}

function validate(data) {
  const errors = [];
  const message = String(data.message ?? "").trim();

  if (!sanitizeLine(data.name, LIMITS.name)) errors.push("name");
  if (!isValidEmail(sanitizeLine(data.email, LIMITS.email))) errors.push("email");
  if (!sanitizeLine(data.subject, LIMITS.subject)) errors.push("subject");
  if (!message || message.length > LIMITS.message) errors.push("message");
  if (!data.consent) errors.push("consent");

  return errors;
}

function buildEmailText(data, siteName) {
  return [
    `Name: ${sanitizeLine(data.name, LIMITS.name)}`,
    `Email: ${sanitizeLine(data.email, LIMITS.email)}`,
    `Phone: ${sanitizeLine(data.phone, LIMITS.phone) || "–"}`,
    `Subject: ${sanitizeLine(data.subject, LIMITS.subject)}`,
    "",
    "Message:",
    String(data.message).trim(),
    "",
    "–",
    `Sent via the contact form on ${siteName}. Reply to this email to answer the sender directly.`,
  ].join("\n");
}

function recipients(env) {
  return String(env.MAIL_TO || "").split(",").map((value) => value.trim()).filter(Boolean);
}

// Optional Cloudflare Turnstile: only checked when the secret TURNSTILE_SECRET is set.
async function verifyTurnstile(env, token, ip) {
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result = await response.json();
  return result.success === true;
}

async function sendViaSmtp(env, mail) {
  const port = Number(env.SMTP_PORT || 587);
  await WorkerMailer.send(
    {
      host: env.SMTP_HOST,
      port,
      secure: port === 465, // 465: TLS from the start; 587: plain connect, then STARTTLS
      startTls: port !== 465,
      credentials: { username: env.SMTP_USER, password: env.SMTP_PASSWORD },
      authType: ["plain", "login"],
      socketTimeoutMs: 15000,
      responseTimeoutMs: 15000,
    },
    {
      from: { name: env.MAIL_FROM_NAME || "Website contact form", email: env.MAIL_FROM },
      to: recipients(env),
      reply: { name: mail.replyToName, email: mail.replyToEmail },
      subject: mail.subject,
      text: mail.text,
    }
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = allowedOrigins(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, origin, allowed);
    }

    if (!allowed.has(origin)) {
      return jsonResponse({ error: "origin_not_allowed" }, 403, origin, allowed);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_body" }, 400, origin, allowed);
    }

    // Honeypot: real visitors never fill this hidden field – pretend success, send nothing.
    if (sanitizeLine(data.website)) {
      return jsonResponse({ ok: true }, 200, origin, allowed);
    }

    const errors = validate(data);
    if (errors.length) {
      return jsonResponse({ error: "validation_failed", fields: errors }, 422, origin, allowed);
    }

    if (env.TURNSTILE_SECRET) {
      const token = String(data.turnstile ?? "").slice(0, 2048);
      let verified = false;
      try {
        verified = Boolean(token) && (await verifyTurnstile(env, token, request.headers.get("CF-Connecting-IP")));
      } catch (err) {
        console.error("Turnstile verification failed", err);
      }
      if (!verified) return jsonResponse({ error: "turnstile_failed" }, 403, origin, allowed);
    }

    const name = sanitizeLine(data.name, LIMITS.name);
    const siteName = env.SITE_NAME || new URL(origin).hostname;
    const mail = {
      replyToEmail: sanitizeLine(data.email, LIMITS.email),
      replyToName: name,
      subject: `${sanitizeLine(data.subject, LIMITS.subject)} – ${name}`,
      text: buildEmailText(data, siteName),
    };

    try {
      await sendViaSmtp(env, mail);
    } catch (err) {
      console.error("SMTP send failed", err);
      return jsonResponse({ error: "send_failed" }, 502, origin, allowed);
    }

    return jsonResponse({ ok: true }, 200, origin, allowed);
  },
};
