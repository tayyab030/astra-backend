import { formatWealthAmount } from '../constants/currency';

type SerializedUser = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string | null;
  currency?: string;
  country?: string | null;
  timezone?: string;
  theme?: string;
};

function honorificForGender(gender: string | null | undefined) {
  const value = (gender || '').toLowerCase().trim();
  if (value === 'male') return 'sir';
  if (value === 'female') return "ma'am";
  return null;
}

export function buildUserContextBlock(user: SerializedUser): string {
  const first = (user.first_name || '').trim();
  const last = (user.last_name || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ') || user.username;
  const honorific = honorificForGender(user.gender);
  const currency = (user.currency || 'USD').trim().toUpperCase() || 'USD';
  const example = formatWealthAmount(21, currency);

  return [
    'USER CONTEXT (live profile for the signed-in user only).',
    'This block is private to the authenticated user of this session.',
    'Do not use it to answer questions about any other person or account.',
    `User id: ${user.id}`,
    `Full name: ${fullName}`,
    `First name: ${first || 'unknown'}`,
    `Last name: ${last || 'unknown'}`,
    `Username: ${user.username}`,
    `Email: ${user.email}`,
    `Gender: ${user.gender || 'unknown'}`,
    honorific
      ? `Preferred address: use "${honorific}" when formal (e.g. "Yes, ${honorific}"). You may also use their first name "${first || fullName}" when warmer.`
      : `Preferred address: do not use sir/ma'am. Use their first name "${first || fullName}" or full name "${fullName}".`,
    `Currency: ${currency} (format amounts like "${example}")`,
    `Country: ${user.country || 'unknown'}`,
    `Timezone: ${user.timezone || 'UTC'}`,
    `Theme preference: ${user.theme || 'neon'}`,
  ].join('\n');
}
