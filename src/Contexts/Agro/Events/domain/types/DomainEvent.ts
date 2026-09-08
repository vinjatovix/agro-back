import type { Event } from './Event.js';

export type DomainEvent =
  | Event<'watering'>
  | Event<'fertilization'>
  | Event<'harvest'>
  | Event<'pruning'>
  | Event<'transplant'>
  | Event<'treatment'>;
