import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

type SendOtpEmailInput = {
  to: string;
  otp: string;
};

type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

const logger = new Logger('EmailService');

function getEnv(name: string) {
  return process.env[name];
}

/** Gmail app passwords are often pasted with spaces — strip them for auth. */
function normalizeSmtpPassword(pass: string | undefined) {
  return pass?.replace(/\s+/g, '') ?? '';
}

export async function sendOtpEmail({
  to,
  otp,
}: SendOtpEmailInput): Promise<boolean> {
  const host = getEnv('SMTP_HOST');
  const portRaw = getEnv('SMTP_PORT') ?? '587';
  const user = getEnv('SMTP_USER');
  const pass = normalizeSmtpPassword(getEnv('SMTP_PASS'));
  const from = getEnv('SMTP_FROM') ?? 'no-reply@example.com';

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — skipping OTP email');
    return false;
  }

  const port = Number(portRaw);
  const secure = port === 465;

  try {
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

    return true;
  } catch (error) {
    logger.error(
      `Failed to send OTP email to ${to}`,
      error instanceof Error ? error.stack : String(error),
    );
    return false;
  }
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<boolean> {
  const host = getEnv('SMTP_HOST');
  const portRaw = getEnv('SMTP_PORT') ?? '587';
  const user = getEnv('SMTP_USER');
  const pass = normalizeSmtpPassword(getEnv('SMTP_PASS'));
  const from = getEnv('SMTP_FROM') ?? 'no-reply@example.com';

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — skipping password reset email');
    return false;
  }

  const port = Number(portRaw);
  const secure = port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Reset your ASTRA password</h2>
      <p>Click the link below to set a new password for your account:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0891b2; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </p>
      <p style="color:#6b7280; font-size: 12px;">This link expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p>
      <p style="color:#6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    </div>
  `;

    await transporter.sendMail({
      from,
      to,
      subject: 'Reset your ASTRA password',
      html,
    });

    return true;
  } catch (error) {
    logger.error(
      `Failed to send password reset email to ${to}`,
      error instanceof Error ? error.stack : String(error),
    );
    return false;
  }
}
