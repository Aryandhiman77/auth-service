export const emailVerificationOtpTemplate = ({
  firstName,
  otp,
  expiryMinutes = 10,
  companyName = "Your Company",
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Email Verification</title>
</head>

<body style="margin:0;padding:40px 0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center">

<table role="presentation" width="600" cellspacing="0" cellpadding="0"
style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08);">

<tr>
<td style="background:#2563eb;padding:28px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:28px;">
${companyName}
</h1>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#111827;">
Verify Your Email
</h2>

<p style="font-size:16px;line-height:26px;color:#374151;">
Hello ${firstName},
</p>

<p style="font-size:16px;line-height:26px;color:#374151;">
Use the One-Time Password (OTP) below to verify your email address.
</p>

<div style="
margin:35px 0;
padding:20px;
background:#eff6ff;
border:1px solid #bfdbfe;
border-radius:10px;
text-align:center;
">

<div style="
font-size:36px;
font-weight:bold;
letter-spacing:10px;
font-family:monospace;
color:#2563eb;
">
${otp}
</div>

</div>

<p style="font-size:15px;color:#374151;line-height:24px;">
This OTP is valid for
<strong>${expiryMinutes} minutes</strong>.
</p>

<p style="font-size:15px;color:#374151;line-height:24px;">
Do not share this OTP with anyone. Our team will never ask for your verification code.
</p>

<p style="font-size:15px;color:#374151;line-height:24px;">
If you did not request this verification, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td style="
padding:25px;
background:#f9fafb;
text-align:center;
font-size:13px;
color:#6b7280;
">

<p style="margin:0;">
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
</p>

<p style="margin-top:8px;">
This is an automated email. Please do not reply.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};
