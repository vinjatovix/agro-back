export const EventTypes = {
  WATERING: 'watering',
  FERTILIZATION: 'fertilization',
  PRUNING: 'pruning',
  HARVEST: 'harvest',
  TRANSPLANT: 'transplant',
  TREATMENT: 'treatment'
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
