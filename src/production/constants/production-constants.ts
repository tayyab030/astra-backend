export const PRODUCTION_TYPES = ['milk', 'egg', 'meat'] as const;
export const PRODUCTION_SESSIONS = ['Morning', 'Evening', 'Both'] as const;
export const PRODUCTION_GRADES = ['A+', 'A', 'B'] as const;
export const PRODUCTION_PRODUCTIVITY = ['High', 'Normal', 'Low'] as const;

export type ProductionType = (typeof PRODUCTION_TYPES)[number];
export type ProductionSession = (typeof PRODUCTION_SESSIONS)[number];
export type ProductionGrade = (typeof PRODUCTION_GRADES)[number];
export type ProductionProductivity =
  (typeof PRODUCTION_PRODUCTIVITY)[number];
