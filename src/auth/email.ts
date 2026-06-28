import nodemailer from 'nodemailer';

type SendOtpEmailInput = {
  to: string;
  otp: string;
};

function getEnv(name: string) {
  return process.env[name];
}

export async function sendOtpEmail({ to, otp }: SendOtpEmailInput) {
  const host = getEnv('SMTP_HOST');
  const portRaw = getEnv('SMTP_PORT') ?? '587';
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');
  const from = getEnv('SMTP_FROM') ?? 'no-reply@example.com';

  if (!host || !user || !pass) {
    return;
  }

  const port = Number(portRaw);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Verify your neural profile</h2>
      <p>Enter this 6-digit verification code in ASTRA:</p>
      <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0;">${otp}</p>
      <p style="color:#6b7280; font-size: 12px;">This code expires in 5 minutes.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: 'Your ASTRA verification code',
    html,
  });
}
