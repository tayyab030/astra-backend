export const ANIMAL_SPECIES = ['Cows', 'Goats', 'Hens', 'Rabbits'] as const;
export const ANIMAL_SEX = ['Male', 'Female'] as const;
export const ANIMAL_HEALTH_STATUSES = [
  'Healthy',
  'Sick',
  'Recovering',
  'Vaccination Due',
] as const;
export const ANIMAL_VACCINATION_STATUSES = [
  'Not Vaccinated',
  'Partially Vaccinated',
  'Fully Vaccinated',
] as const;
export const GROUP_SPECIES = ['Hens', 'Rabbits'] as const;
export const GROUP_PURPOSES = ['Eggs', 'Meat', 'Breeding'] as const;

export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number];
export type AnimalSex = (typeof ANIMAL_SEX)[number];
export type AnimalHealthStatus = (typeof ANIMAL_HEALTH_STATUSES)[number];
export type AnimalVaccinationStatus =
  (typeof ANIMAL_VACCINATION_STATUSES)[number];
export type GroupSpecies = (typeof GROUP_SPECIES)[number];
export type GroupPurpose = (typeof GROUP_PURPOSES)[number];

export function groupTypeFromSpecies(species: string): string {
  if (species === 'Hens') return 'group-hen';
  if (species === 'Rabbits') return 'group-rabbit';
  return `group-${species.toLowerCase()}`;
}

export function ageYearsFromDob(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}
