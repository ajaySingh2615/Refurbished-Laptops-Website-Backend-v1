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

export async function sendVerificationEmail(email, link) {
  const subject = "Verify your email address";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Our Platform!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">Let's verify your email address</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>
          <p style="color: #6b7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">
            Thank you for registering with us! To complete your account setup and start using our platform, 
            please verify your email address by clicking the button below.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);">
              Verify Email Address
            </a>
          </div>

          <!-- Security Info -->
          <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #1f2937; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🔒 Security Information</h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>This verification link will expire in 24 hours</li>
              <li>If you didn't create an account, you can safely ignore this email</li>
              <li>For security reasons, please don't share this link with anyone</li>
            </ul>
          </div>

          <!-- Alternative Link -->
          <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #3b82f6; margin: 0; font-size: 12px; word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">${link}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            This email was sent by our automated system. Please do not reply to this email.
          </p>
          <p style="color: #9ca3af; margin: 10px 0 0; font-size: 12px;">
            © 2024 Your Company. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: email, subject, html });
}

export async function sendPasswordResetEmail(email, link) {
  const subject = "Reset your password";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
          <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Password Reset Request</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">Secure your account with a new password</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
          <p style="color: #6b7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. If you made this request, click the button below 
            to set a new password for your account.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.4);">
              Reset My Password
            </a>
          </div>

          <!-- Security Warning -->
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px; font-size: 16px; font-weight: 600;">⚠️ Important Security Notice</h3>
            <ul style="color: #991b1b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>This reset link will expire in 1 hour for security</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your current password remains unchanged until you complete this process</li>
              <li>For your security, don't share this link with anyone</li>
            </ul>
          </div>

          <!-- Alternative Link -->
          <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #3b82f6; margin: 0; font-size: 12px; word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">${link}</p>
          </div>

          <!-- Help Section -->
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #0369a1; margin: 0 0 10px; font-size: 16px; font-weight: 600;">Need Help?</h3>
            <p style="color: #0c4a6e; margin: 0; font-size: 14px; line-height: 1.6;">
              If you're having trouble resetting your password or didn't request this change, 
              please contact our support team immediately.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            This email was sent by our automated security system. Please do not reply to this email.
          </p>
          <p style="color: #9ca3af; margin: 10px 0 0; font-size: 12px;">
            © 2024 Your Company. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: email, subject, html });
}

export async function sendPasswordResetSuccessEmail(email) {
  const subject = "Password reset successful";
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
          <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Password Reset Complete!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">Your account is now secure</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Password Successfully Reset</h2>
          <p style="color: #6b7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">
            Great news! Your password has been successfully updated. Your account is now secure 
            with your new password and you can continue using our platform safely.
          </p>

          <!-- Success Info -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #065f46; margin: 0 0 10px; font-size: 16px; font-weight: 600;">✅ What Happened</h3>
            <ul style="color: #047857; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>Your password has been successfully updated</li>
              <li>All your existing sessions have been logged out for security</li>
              <li>You'll need to sign in again with your new password</li>
              <li>Your account is now protected with the new password</li>
            </ul>
          </div>

          <!-- Security Notice -->
          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🔒 Important Security Information</h3>
            <ul style="color: #b45309; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li>All devices and browsers have been automatically logged out</li>
              <li>You'll need to sign in again on each device you use</li>
              <li>If you didn't make this change, contact support immediately</li>
              <li>Consider enabling two-factor authentication for extra security</li>
            </ul>
          </div>

          <!-- Next Steps -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px; font-size: 16px; font-weight: 600;">🚀 Next Steps</h3>
            <p style="color: #1e3a8a; margin: 0; font-size: 14px; line-height: 1.6;">
              You can now sign in to your account using your new password. 
              We recommend keeping your password secure and unique.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">
              Sign In to Your Account
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            This confirmation was sent by our automated security system. Please do not reply to this email.
          </p>
          <p style="color: #9ca3af; margin: 10px 0 0; font-size: 12px;">
            © 2024 Your Company. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: email, subject, html });
}
