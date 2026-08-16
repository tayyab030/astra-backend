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

type SendAccountDeleteEmailInput = {
  to: string;
  deleteUrl: string;
};

const logger = new Logger('EmailService');

/**
 * TEMPORARY_EMAIL_FLOW — revert marker (search: TEMPORARY_EMAIL_FLOW)
 *
 * Email is only sent when MODE=local. In all other modes, callers skip the
 * email-dependent UX (OTP verify, reset link, delete confirmation link).
 *
 * To restore permanent email everywhere:
 * 1. Delete this helper (and its early-returns in send* below).
 * 2. Remove the TEMPORARY_EMAIL_FLOW branches in auth.service.ts.
 */
export function isEmailFlowEnabled(): boolean {
  return process.env.MODE?.toLowerCase() === 'local';
}

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
  // TEMPORARY_EMAIL_FLOW — remove this block when restoring email in all modes
  if (!isEmailFlowEnabled()) {
    logger.warn('TEMPORARY_EMAIL_FLOW: MODE is not local — skipping OTP email');
    return false;
  }

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
  // TEMPORARY_EMAIL_FLOW — remove this block when restoring email in all modes
  if (!isEmailFlowEnabled()) {
    logger.warn(
      'TEMPORARY_EMAIL_FLOW: MODE is not local — skipping password reset email',
    );
    return false;
  }

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

export async function sendAccountDeleteEmail({
  to,
  deleteUrl,
}: SendAccountDeleteEmailInput): Promise<boolean> {
  // TEMPORARY_EMAIL_FLOW — remove this block when restoring email in all modes
  if (!isEmailFlowEnabled()) {
    logger.warn(
      'TEMPORARY_EMAIL_FLOW: MODE is not local — skipping account delete email',
    );
    return false;
  }

  const host = getEnv('SMTP_HOST');
  const portRaw = getEnv('SMTP_PORT') ?? '587';
  const user = getEnv('SMTP_USER');
  const pass = normalizeSmtpPassword(getEnv('SMTP_PASS'));
  const from = getEnv('SMTP_FROM') ?? 'no-reply@example.com';

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — skipping account delete email');
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
      <h2 style="color:#b91c1c;">Confirm account deletion</h2>
      <p>You requested to permanently delete your ASTRA account and all related data.</p>
      <p>This action cannot be undone. Click the button below to confirm:</p>
      <p style="margin: 24px 0;">
        <a href="${deleteUrl}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirm Delete Account</a>
      </p>
      <p style="color:#6b7280; font-size: 12px;">This link expires in 20 minutes. If you did not request this, you can ignore this email — your account will stay active.</p>
      <p style="color:#6b7280; font-size: 12px; word-break: break-all;">${deleteUrl}</p>
    </div>
  `;

    await transporter.sendMail({
      from,
      to,
      subject: 'Confirm ASTRA account deletion',
      html,
    });

    return true;
  } catch (error) {
    logger.error(
      `Failed to send account delete email to ${to}`,
      error instanceof Error ? error.stack : String(error),
    );
    return false;
  }
}
