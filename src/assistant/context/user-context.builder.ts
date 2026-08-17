import { formatWealthAmount } from '../constants/currency';

/** Never send these to Groq even if present on a user-like object. */
const GROQ_USER_CONTEXT_BLOCKLIST = new Set([
  'password',
  'otp_code',
  'otp_token',
  'otp_expires_at',
  'otp_attempts',
  'password_reset_token',
  'password_reset_expires_at',
]);

const FIELD_LABELS: Record<string, string> = {
  id: 'User id',
  username: 'Username',
  email: 'Email',
  first_name: 'First name',
  last_name: 'Last name',
  gender: 'Gender',
  currency: 'Currency',
  country: 'Country',
  timezone: 'Timezone',
  theme: 'Theme preference',
  ai_voice: 'AI speaker voice',
  ai_voice_mode: 'AI voice mode',
  ai_personality: 'AI personality',
  ai_insights: 'AI smart insights',
  ai_data_scope: 'AI data analysis scope',
  ai_language: 'AI language',
  is_verified: 'Email verified',
  created_at: 'Account created at',
};

function honorificForGender(gender: string | null | undefined) {
  const value = (gender || '').toLowerCase().trim();
  if (value === 'male') return 'sir';
  if (value === 'female') return 'madam';
  return null;
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'unknown';
  }
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function labelForField(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}

/**
 * Builds Groq USER CONTEXT from the signed-in user's public profile.
 * Every non-secret field on `user` is included automatically — when new
 * profile fields are added to AuthService.serializeUser, they appear here.
 */
export function buildUserContextBlock(
  user: Record<string, unknown>,
): string {
  const first = String(user.first_name ?? '').trim();
  const last = String(user.last_name ?? '').trim();
  const username = String(user.username ?? '').trim();
  const fullName = [first, last].filter(Boolean).join(' ') || username || 'unknown';
  const honorific = honorificForGender(
    user.gender == null ? null : String(user.gender),
  );
  const currency =
    String(user.currency ?? 'USD').trim().toUpperCase() || 'USD';
  const example = formatWealthAmount(21, currency);

  const lines: string[] = [
    'USER CONTEXT (complete live profile for the signed-in user only).',
    'This block is private to the authenticated user of this session.',
    'Do not use it to answer questions about any other person or account.',
    'Treat every field below as authoritative for this user.',
    `Full name: ${fullName}`,
  ];

  for (const [key, value] of Object.entries(user)) {
    if (GROQ_USER_CONTEXT_BLOCKLIST.has(key)) {
      continue;
    }
    if (key === 'currency') {
      lines.push(
        `Currency: ${currency} (format amounts like "${example}")`,
      );
      continue;
    }
    lines.push(`${labelForField(key)}: ${formatFieldValue(value)}`);
  }

  const firstName = first || username || fullName;

  lines.push(
    honorific
      ? `Preferred address: Gender is ${honorific === 'sir' ? 'male' : 'female'}, so the correct form is "${honorific}". Their first name "${firstName}" also works occasionally.`
      : `Preferred address: Gender is not male or female, so do not use sir/madam/ma'am. Use their first name "${firstName}" only.`,
    `Never address them as "${fullName}" in a reply. The full name is for records, not for speech.`,
    'Address them sparingly: greet them by name or honorific in the first reply, then mostly answer with no form of address at all. Do not prefix every reply with it.',
  );

  return lines.join('\n');
}
