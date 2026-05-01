import type { PositiveNumber } from '../../../../shared/domain/valueObject/PositiveNumber.js';
import type { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';

export type WateringData = {
  amountLiters: PositiveNumber;
};
export const FertilizationMethodValues = [
  'soil',
  'foliar',
  'fertigation'
] as const;

export type FertilizationMethod = (typeof FertilizationMethodValues)[number];

export const FertilizerTypeValues = [
  'organic',
  'mineral',
  'compost',
  'liquid',
  'granular'
] as const;

export type FertilizerType = (typeof FertilizerTypeValues)[number];

export type FertilizationData = {
  fertilizerType: FertilizerType;
  method: FertilizationMethod;
  fertilizerId: Uuid;
  amount: PositiveNumber;
  concentration: PositiveNumber;
};

export type HarvestData = {
  yieldGrams: PositiveNumber;
};

export const PruningTypeValues = [
  'formation',
  'maintenance',
  'rejuvenation'
] as const;
export type PruningType = (typeof PruningTypeValues)[number];

export const PruningIntensityValues = ['low', 'moderate', 'high'] as const;

export type PruningIntensity = (typeof PruningIntensityValues)[number];

export type PruningData = {
  type: PruningType;
  intensity: PruningIntensity;
};

export type TransplantData = {
  fromBedId: Uuid;
  toBedId: Uuid;
};

export const TreatmentTargetValues = ['pest', 'fungus', 'disease'] as const;

export type TreatmentTarget = (typeof TreatmentTargetValues)[number];

export type TreatmentData = {
  target: TreatmentTarget;
  productId: Uuid;
  dosage: PositiveNumber;
};

export type EventDataMap = {
  watering: WateringData;
  fertilization: FertilizationData;
  pruning: PruningData;
  harvest: HarvestData;
  treatment: TreatmentData;
  transplant: TransplantData;
};
