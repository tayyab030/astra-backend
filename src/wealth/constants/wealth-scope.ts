export const WEALTH_SCOPES = ['personal', 'farm'] as const;

export type WealthScope = (typeof WEALTH_SCOPES)[number];

export const DEFAULT_WEALTH_SCOPE: WealthScope = 'personal';
