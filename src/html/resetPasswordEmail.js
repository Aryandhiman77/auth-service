// templates/resetPasswordEmail.js

export const resetPasswordEmail = ({
  username = "User",
  resetUrl,
  expiryMinutes = 15,
}) => {
  if (!resetUrl) {
    throw new Error("Reset URL is required.");
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fb;
      font-family: Arial, sans-serif;
      color: #1f2937;
    }

    .email-container {
      width: 100%;
      padding: 40px 15px;
    }

    .email-card {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }

    .email-header {
      background-color: #0b3b75;
      padding: 28px;
      text-align: center;
      color: #ffffff;
    }

    .email-header h1 {
      margin: 0;
      font-size: 25px;
    }

    .email-body {
      padding: 35px 30px;
      line-height: 1.7;
    }

    .email-body h2 {
      margin-top: 0;
      font-size: 22px;
      color: #111827;
    }

    .reset-button {
      display: inline-block;
      margin: 20px 0;
      padding: 14px 28px;
      background-color: #1463ff;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 7px;
      font-size: 16px;
      font-weight: bold;
    }

    .warning-box {
      margin-top: 25px;
      padding: 15px;
      background-color: #fff8e6;
      border-left: 4px solid #f59e0b;
      border-radius: 5px;
      font-size: 14px;
    }

    .reset-url {
      word-break: break-all;
      font-size: 13px;
      color: #1463ff;
    }

    .email-footer {
      padding: 22px 30px;
      background-color: #f8fafc;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }

    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 25px 20px;
      }

      .reset-button {
        display: block;
        text-align: center;
      }
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="email-card">

      <div class="email-header">
        <h1>FinTech</h1>
      </div>

      <div class="email-body">
        <h2>Reset your password</h2>

        <p>Hi ${username},</p>

        <p>
          We received a request to reset the password for your FinTech account.
        </p>

        <p>Click the button below to create a new password.</p>

        <a href="${resetUrl}" class="reset-button">
          Reset Password
        </a>

        <p>
          This reset link will expire in
          <strong>${expiryMinutes} minutes</strong>.
        </p>

        <p>If the button does not work, copy this link into your browser:</p>

        <p class="reset-url">${resetUrl}</p>

        <div class="warning-box">
          <strong>Security notice:</strong>
          Never share this link, password, PIN, or OTP with anyone.
          Our team will never ask for these details.
        </div>

        <p>
          If you did not request this password reset, you can safely ignore
          this email. Your password will not change.
        </p>

        <p>
          Thanks,<br />
          <strong>FinTech Support Team</strong>
        </p>
      </div>

      <div class="email-footer">
        <p>This is an automated security email. Please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} FinTech. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
};
