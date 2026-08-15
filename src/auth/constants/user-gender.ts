export const USER_GENDERS = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
] as const;

export type UserGender = (typeof USER_GENDERS)[number];

export const USER_GENDER_LABELS: Record<UserGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};
