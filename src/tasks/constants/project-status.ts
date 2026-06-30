export const PROJECT_STATUSES = [
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'off_track', label: 'Off Track' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On Hold' },
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number]['value'];

export const PROJECT_STATUS_VALUES = PROJECT_STATUSES.map(
  (status) => status.value,
);

export function getProjectStatusLabel(value: string) {
  return (
    PROJECT_STATUSES.find((status) => status.value === value)?.label ?? value
  );
}
