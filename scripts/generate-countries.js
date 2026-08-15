const fs = require('fs');
const countries = [
  ['AF','Afghanistan','AFN','Asia/Kabul'],
  ['AL','Albania','ALL','Europe/Tirane'],
  ['DZ','Algeria','DZD','Africa/Algiers'],
  ['AR','Argentina','ARS','America/Argentina/Buenos_Aires'],
  ['AM','Armenia','AMD','Asia/Yerevan'],
  ['AU','Australia','AUD','Australia/Sydney'],
  ['AT','Austria','EUR','Europe/Vienna'],
  ['AZ','Azerbaijan','AZN','Asia/Baku'],
  ['BH','Bahrain','BHD','Asia/Bahrain'],
  ['BD','Bangladesh','BDT','Asia/Dhaka'],
  ['BY','Belarus','BYN','Europe/Minsk'],
  ['BE','Belgium','EUR','Europe/Brussels'],
  ['BZ','Belize','BZD','America/Belize'],
  ['BO','Bolivia','BOB','America/La_Paz'],
  ['BA','Bosnia and Herzegovina','BAM','Europe/Sarajevo'],
  ['BW','Botswana','BWP','Africa/Gaborone'],
  ['BR','Brazil','BRL','America/Sao_Paulo'],
  ['BN','Brunei','BND','Asia/Brunei'],
  ['BG','Bulgaria','BGN','Europe/Sofia'],
  ['KH','Cambodia','KHR','Asia/Phnom_Penh'],
  ['CM','Cameroon','XAF','Africa/Douala'],
  ['CA','Canada','CAD','America/Toronto'],
  ['CL','Chile','CLP','America/Santiago'],
  ['CN','China','CNY','Asia/Shanghai'],
  ['CO','Colombia','COP','America/Bogota'],
  ['CR','Costa Rica','CRC','America/Costa_Rica'],
  ['HR','Croatia','EUR','Europe/Zagreb'],
  ['CU','Cuba','CUP','America/Havana'],
  ['CY','Cyprus','EUR','Asia/Nicosia'],
  ['CZ','Czech Republic','CZK','Europe/Prague'],
  ['DK','Denmark','DKK','Europe/Copenhagen'],
  ['DO','Dominican Republic','DOP','America/Santo_Domingo'],
  ['EC','Ecuador','USD','America/Guayaquil'],
  ['EG','Egypt','EGP','Africa/Cairo'],
  ['SV','El Salvador','USD','America/El_Salvador'],
  ['EE','Estonia','EUR','Europe/Tallinn'],
  ['ET','Ethiopia','ETB','Africa/Addis_Ababa'],
  ['FI','Finland','EUR','Europe/Helsinki'],
  ['FR','France','EUR','Europe/Paris'],
  ['GE','Georgia','GEL','Asia/Tbilisi'],
  ['DE','Germany','EUR','Europe/Berlin'],
  ['GH','Ghana','GHS','Africa/Accra'],
  ['GR','Greece','EUR','Europe/Athens'],
  ['GT','Guatemala','GTQ','America/Guatemala'],
  ['HN','Honduras','HNL','America/Tegucigalpa'],
  ['HK','Hong Kong','HKD','Asia/Hong_Kong'],
  ['HU','Hungary','HUF','Europe/Budapest'],
  ['IS','Iceland','ISK','Atlantic/Reykjavik'],
  ['IN','India','INR','Asia/Kolkata'],
  ['ID','Indonesia','IDR','Asia/Jakarta'],
  ['IR','Iran','IRR','Asia/Tehran'],
  ['IQ','Iraq','IQD','Asia/Baghdad'],
  ['IE','Ireland','EUR','Europe/Dublin'],
  ['IL','Israel','ILS','Asia/Jerusalem'],
  ['IT','Italy','EUR','Europe/Rome'],
  ['JM','Jamaica','JMD','America/Jamaica'],
  ['JP','Japan','JPY','Asia/Tokyo'],
  ['JO','Jordan','JOD','Asia/Amman'],
  ['KZ','Kazakhstan','KZT','Asia/Almaty'],
  ['KE','Kenya','KES','Africa/Nairobi'],
  ['KW','Kuwait','KWD','Asia/Kuwait'],
  ['LV','Latvia','EUR','Europe/Riga'],
  ['LB','Lebanon','LBP','Asia/Beirut'],
  ['LY','Libya','LYD','Africa/Tripoli'],
  ['LT','Lithuania','EUR','Europe/Vilnius'],
  ['LU','Luxembourg','EUR','Europe/Luxembourg'],
  ['MO','Macao','MOP','Asia/Macau'],
  ['MY','Malaysia','MYR','Asia/Kuala_Lumpur'],
  ['MV','Maldives','MVR','Indian/Maldives'],
  ['MT','Malta','EUR','Europe/Malta'],
  ['MX','Mexico','MXN','America/Mexico_City'],
  ['MD','Moldova','MDL','Europe/Chisinau'],
  ['MN','Mongolia','MNT','Asia/Ulaanbaatar'],
  ['MA','Morocco','MAD','Africa/Casablanca'],
  ['MZ','Mozambique','MZN','Africa/Maputo'],
  ['MM','Myanmar','MMK','Asia/Yangon'],
  ['NP','Nepal','NPR','Asia/Kathmandu'],
  ['NL','Netherlands','EUR','Europe/Amsterdam'],
  ['NZ','New Zealand','NZD','Pacific/Auckland'],
  ['NI','Nicaragua','NIO','America/Managua'],
  ['NG','Nigeria','NGN','Africa/Lagos'],
  ['MK','North Macedonia','MKD','Europe/Skopje'],
  ['NO','Norway','NOK','Europe/Oslo'],
  ['OM','Oman','OMR','Asia/Muscat'],
  ['PK','Pakistan','PKR','Asia/Karachi'],
  ['PA','Panama','PAB','America/Panama'],
  ['PY','Paraguay','PYG','America/Asuncion'],
  ['PE','Peru','PEN','America/Lima'],
  ['PH','Philippines','PHP','Asia/Manila'],
  ['PL','Poland','PLN','Europe/Warsaw'],
  ['PT','Portugal','EUR','Europe/Lisbon'],
  ['QA','Qatar','QAR','Asia/Qatar'],
  ['RO','Romania','RON','Europe/Bucharest'],
  ['RU','Russia','RUB','Europe/Moscow'],
  ['SA','Saudi Arabia','SAR','Asia/Riyadh'],
  ['RS','Serbia','RSD','Europe/Belgrade'],
  ['SG','Singapore','SGD','Asia/Singapore'],
  ['SK','Slovakia','EUR','Europe/Bratislava'],
  ['SI','Slovenia','EUR','Europe/Ljubljana'],
  ['ZA','South Africa','ZAR','Africa/Johannesburg'],
  ['KR','South Korea','KRW','Asia/Seoul'],
  ['ES','Spain','EUR','Europe/Madrid'],
  ['LK','Sri Lanka','LKR','Asia/Colombo'],
  ['SE','Sweden','SEK','Europe/Stockholm'],
  ['CH','Switzerland','CHF','Europe/Zurich'],
  ['SY','Syria','SYP','Asia/Damascus'],
  ['TW','Taiwan','TWD','Asia/Taipei'],
  ['TZ','Tanzania','TZS','Africa/Dar_es_Salaam'],
  ['TH','Thailand','THB','Asia/Bangkok'],
  ['TT','Trinidad and Tobago','TTD','America/Port_of_Spain'],
  ['TN','Tunisia','TND','Africa/Tunis'],
  ['TR','Turkey','TRY','Europe/Istanbul'],
  ['UG','Uganda','UGX','Africa/Kampala'],
  ['UA','Ukraine','UAH','Europe/Kyiv'],
  ['AE','United Arab Emirates','AED','Asia/Dubai'],
  ['GB','United Kingdom','GBP','Europe/London'],
  ['US','United States','USD','America/New_York'],
  ['UY','Uruguay','UYU','America/Montevideo'],
  ['UZ','Uzbekistan','UZS','Asia/Tashkent'],
  ['VE','Venezuela','VES','America/Caracas'],
  ['VN','Vietnam','VND','Asia/Ho_Chi_Minh'],
  ['YE','Yemen','YER','Asia/Aden'],
  ['ZM','Zambia','ZMW','Africa/Lusaka'],
  ['ZW','Zimbabwe','ZWL','Africa/Harare'],
];
const extras = [
  'UTC',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Brisbane',
];
const timezones = [...new Set([...countries.map((c) => c[3]), ...extras])].sort();

const beRows = countries
  .map(
    ([code, name, currency, timezone]) =>
      `  { code: '${code}', name: '${name.replace(/'/g, "\\'")}', currency: '${currency}', timezone: '${timezone}' },`,
  )
  .join('\n');

const feRows = countries
  .map(
    ([code, name, currency, timezone]) =>
      `  { code: "${code}", name: "${name.replace(/"/g, '\\"')}", currency: "${currency}", timezone: "${timezone}" },`,
  )
  .join('\n');

const backend = `export type CountryOption = {
  code: string;
  name: string;
  currency: string;
  timezone: string;
};

/** ISO country code → local currency + primary IANA timezone. */
export const COUNTRIES: CountryOption[] = [
${beRows}
];

export const TIMEZONES = [
${timezones.map((tz) => `  '${tz}',`).join('\n')}
] as const;

export type TimezoneValue = (typeof TIMEZONES)[number];

const COUNTRY_BY_CODE = new Map(
  COUNTRIES.map((country) => [country.code, country]),
);

export function getCountryByCode(code: string) {
  return COUNTRY_BY_CODE.get(code.toUpperCase());
}

export function getCurrencyForCountry(countryCode: string): string {
  return getCountryByCode(countryCode)?.currency ?? 'USD';
}

export function getTimezoneForCountry(countryCode: string): string {
  return getCountryByCode(countryCode)?.timezone ?? 'UTC';
}

export const COUNTRY_CODES = COUNTRIES.map((country) => country.code);
export const TIMEZONE_VALUES = [...TIMEZONES];
`;

const frontend = `export type CountryOption = {
  code: string
  name: string
  currency: string
  timezone: string
}

/** ISO country code → local currency + primary IANA timezone. */
export const COUNTRIES: CountryOption[] = [
${feRows}
]

export const TIMEZONES = [
${timezones.map((tz) => `  "${tz}",`).join('\n')}
] as const

export type TimezoneValue = (typeof TIMEZONES)[number]

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]))

export function getCountryByCode(code: string) {
  return COUNTRY_BY_CODE.get(code.toUpperCase())
}

export function getCurrencyForCountry(countryCode: string): string {
  return getCountryByCode(countryCode)?.currency ?? "USD"
}

export function getTimezoneForCountry(countryCode: string): string {
  return getCountryByCode(countryCode)?.timezone ?? "UTC"
}

export const COUNTRY_CODES = COUNTRIES.map((country) => country.code)
export const TIMEZONE_VALUES = [...TIMEZONES]
`;

fs.writeFileSync(
  'd:/Development/Personal/astra-backend/src/auth/constants/country-currency.ts',
  backend,
);
fs.writeFileSync('d:/Development/Personal/astra-frontend/lib/countries.ts', frontend);
console.log('ok', countries.length, timezones.length);
