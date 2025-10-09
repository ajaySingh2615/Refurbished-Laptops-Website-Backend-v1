import nodemailer from "nodemailer";

export function createTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null; // fallback to console
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || "noreply@example.com";
  const t = createTransport();
  if (!t) {
    console.log("\n[MAIL]", { to, subject, text, html });
    return;
  }
  await t.sendMail({ from, to, subject, html, text });
}
