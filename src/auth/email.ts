import nodemailer from 'nodemailer';

type SendVerificationEmailInput = {
  to: string;
  verifyUrl: string;
};

function getEnv(name: string) {
  return process.env[name];
}

export async function sendVerificationEmail({
  to,
  verifyUrl,
}: SendVerificationEmailInput) {
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
      <h2>Verify your email</h2>
      <p>Click the button below to verify your email address.</p>
      <p style="margin: 24px 0;">
        <a
          href="${verifyUrl}"
          style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; text-decoration: none; border-radius: 8px;"
        >Verify email</a>
      </p>
      <p>If the button doesn’t work, open this link:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#6b7280; font-size: 12px;">This link expires in 15 minutes.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your email',
    html,
  });
}
