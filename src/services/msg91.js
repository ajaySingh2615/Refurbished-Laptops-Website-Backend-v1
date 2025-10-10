// Minimal MSG91 OTP SMS sender
// Uses global fetch (Node >=18)

export async function sendMsg91OtpSms({
  apiKey,
  templateId,
  senderId,
  countryCode = "91",
  phone,
  code,
}) {
  // Fallback to console when API key not provided
  if (!apiKey) {
    console.log("[SMS:MSG91:FALLBACK]", {
      phone: `${countryCode}${phone}`,
      code,
    });
    return { success: true, fallback: true };
  }

  // MSG91 OTP API v5
  // Reference: https://control.msg91.com/apidoc/
  // Endpoint sample: https://api.msg91.com/api/v5/otp?template_id=TPL_ID&mobile=91XXXXXXXXXX&otp=123456
  const params = new URLSearchParams({
    template_id: String(templateId || ""),
    mobile: `${countryCode}${phone}`,
    otp: String(code),
    sender: String(senderId || ""),
  });

  const url = `https://api.msg91.com/api/v5/otp?${params.toString()}`;

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    authkey: apiKey,
  };

  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { success: false, error: `MSG91 error ${response.status}: ${text}` };
  }
  // MSG91 typically returns JSON
  const data = await response.json().catch(() => ({}));
  return { success: true, data };
}
