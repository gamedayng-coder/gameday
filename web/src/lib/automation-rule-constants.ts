export const TRIGGER_TYPES = [
  { value: 'fixture_scheduled', label: 'Fixture scheduled' },
  { value: 'fixture_completed', label: 'Fixture completed' },
  { value: 'standings_updated', label: 'Standings updated' },
] as const;

export type TriggerType = (typeof TRIGGER_TYPES)[number]['value'];

export const SOURCE_TYPE_BY_TRIGGER: Record<TriggerType, string> = {
  fixture_scheduled: 'sports_fixture',
  fixture_completed: 'sports_fixture',
  standings_updated: 'sports_standing',
};

export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  fixture_scheduled: 'Fires ahead of an upcoming fixture (pre-match content)',
  fixture_completed: 'Fires when a fixture result is confirmed (post-match content)',
  standings_updated: 'Fires when league standings are refreshed',
};
