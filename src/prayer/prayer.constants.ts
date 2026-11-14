export type PrayerCalculationMethod = {
  id: number;
  name: string;
  region?: string;
};

/** Standard Aladhan calculation methods (method query param). */
export const PRAYER_CALCULATION_METHODS: PrayerCalculationMethod[] = [
  { id: 0, name: 'Shia Ithna-Ashari', region: 'Shia' },
  {
    id: 1,
    name: 'University of Islamic Sciences, Karachi',
    region: 'Pakistan / South Asia',
  },
  {
    id: 2,
    name: 'Islamic Society of North America (ISNA)',
    region: 'North America',
  },
  { id: 3, name: 'Muslim World League (MWL)', region: 'Worldwide' },
  { id: 4, name: 'Umm al-Qura, Makkah', region: 'Saudi Arabia' },
  {
    id: 5,
    name: 'Egyptian General Authority of Survey',
    region: 'Egypt / Africa',
  },
  {
    id: 7,
    name: 'Institute of Geophysics, University of Tehran',
    region: 'Iran',
  },
  { id: 8, name: 'Gulf Region', region: 'Gulf' },
  { id: 9, name: 'Kuwait', region: 'Kuwait' },
  { id: 10, name: 'Qatar', region: 'Qatar' },
  {
    id: 11,
    name: 'Majlis Ugama Islam Singapura, Singapore',
    region: 'Singapore',
  },
  {
    id: 12,
    name: 'Union Organization islamic de France',
    region: 'France',
  },
  {
    id: 13,
    name: 'Diyanet İşleri Başkanlığı, Turkey',
    region: 'Turkey',
  },
  {
    id: 14,
    name: 'Spiritual Administration of Muslims of Russia',
    region: 'Russia',
  },
  { id: 15, name: 'Moonsighting Committee Worldwide', region: 'Worldwide' },
  { id: 16, name: 'Dubai, UAE', region: 'UAE' },
  {
    id: 17,
    name: 'Jabatan Kemajuan Islam Malaysia (JAKIM)',
    region: 'Malaysia',
  },
  { id: 18, name: 'Tunisia', region: 'Tunisia' },
  { id: 19, name: 'Algeria', region: 'Algeria' },
  {
    id: 20,
    name: 'Kementerian Agama Republik Indonesia',
    region: 'Indonesia',
  },
  { id: 21, name: 'Morocco', region: 'Morocco' },
  { id: 22, name: 'Comunidade Islamica de Lisboa', region: 'Portugal' },
  {
    id: 23,
    name: 'Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan',
    region: 'Jordan',
  },
];

export const PRAYER_METHOD_IDS = new Set(
  PRAYER_CALCULATION_METHODS.map((method) => method.id),
);

export const ALADHAN_BASE_URL = 'https://api.aladhan.com/v1';

/** Full Aladhan timing keys shown in the Prayer page (display order before sort). */
export const PRAYER_TIMING_DEFS = [
  { key: 'Fajr', name: 'Fajr' },
  { key: 'Sunrise', name: 'Sunrise' },
  { key: 'Dhuhr', name: 'Dhuhr' },
  { key: 'Asr', name: 'Asr' },
  { key: 'Sunset', name: 'Sunset' },
  { key: 'Maghrib', name: 'Maghrib' },
  { key: 'Isha', name: 'Isha' },
  { key: 'Imsak', name: 'Imsak' },
  { key: 'Midnight', name: 'Midnight' },
  { key: 'Firstthird', name: 'First Third' },
  { key: 'Lastthird', name: 'Tahajjud' },
] as const;

/** @deprecated Prefer PRAYER_TIMING_DEFS — kept for callers expecting the 6 salah keys. */
export const PRIMARY_PRAYER_KEYS = [
  'Fajr',
  'Sunrise',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
] as const;

export type PrimaryPrayerKey = (typeof PRIMARY_PRAYER_KEYS)[number];
export type PrayerTimingKey = (typeof PRAYER_TIMING_DEFS)[number]['key'];

/** Prayers the user can mark complete / schedule Adhan for. */
export const TRACKABLE_PRAYER_KEYS = [
  'Lastthird',
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
] as const;

export type TrackablePrayerKey = (typeof TRACKABLE_PRAYER_KEYS)[number];

export const TRACKABLE_PRAYER_LABELS: Record<TrackablePrayerKey, string> = {
  Fajr: 'Fajr',
  Dhuhr: 'Dhuhr',
  Asr: 'Asr',
  Maghrib: 'Maghrib',
  Isha: 'Isha',
  Lastthird: 'Tahajjud',
};

export const DEFAULT_ADHAN_KEYS: TrackablePrayerKey[] = [
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
];
