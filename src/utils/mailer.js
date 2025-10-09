import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  // If no Resend API key, fallback to console
  if (!process.env.RESEND_API_KEY) {
    console.log("\n[MAIL]", { to, subject, text, html });
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Email sent via Resend:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
}
