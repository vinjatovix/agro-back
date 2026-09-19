import {
  type FertilizerType,
  type FertilizationMethod,
  type PruningType,
  type PruningIntensity,
  type TreatmentTarget
} from '../../../domain/types/EventData.js';
export type BaseEventDocument = {
  _id: string;

  plantInstanceId: string;
  bedId: string;
  userId: string;

  date: string;

  notes?: string;

  metadata: {
    createdAt: string;
  };
};

export type WateringEventDocument = BaseEventDocument & {
  type: 'watering';
  data: {
    amountLiters: number;
  };
};

export type FertilizationEventDocument = BaseEventDocument & {
  type: 'fertilization';
  data: {
    fertilizerId: string;
    fertilizerType: FertilizerType;
    method: FertilizationMethod;
    amount: number;
    concentration: number;
  };
};

export type PruningEventDocument = BaseEventDocument & {
  type: 'pruning';
  data: {
    type: PruningType;
    intensity: PruningIntensity;
  };
};

export type HarvestEventDocument = BaseEventDocument & {
  type: 'harvest';
  data: {
    yieldGrams: number;
  };
};

export type TransplantEventDocument = BaseEventDocument & {
  type: 'transplant';
  data: {
    fromBedId: string;
    toBedId: string;
  };
};

export type TreatmentEventDocument = BaseEventDocument & {
  type: 'treatment';
  data: {
    target: TreatmentTarget;
    productId: string;
    dosage: number;
  };
};

export type EventDocument =
  | WateringEventDocument
  | FertilizationEventDocument
  | PruningEventDocument
  | HarvestEventDocument
  | TransplantEventDocument
  | TreatmentEventDocument;
