import type { DomainEvent } from '../../../../../../src/Contexts/Agro/Events/domain/types/DomainEvent.js';
import type {
  WateringEventDocument,
  FertilizationEventDocument,
  PruningEventDocument,
  HarvestEventDocument,
  TransplantEventDocument,
  TreatmentEventDocument
} from '../../../../../../src/Contexts/Agro/Events/infrastructure/persistence/types/EventDocument.js';

import {
  FertilizationMethodValues,
  FertilizerTypeValues,
  PruningIntensityValues,
  PruningTypeValues,
  TreatmentTargetValues
} from '../../../../../../src/Contexts/Agro/Events/domain/types/EventData.js';

import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { random } from '../../../../shared/fixtures/random.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';

const DomainEventFactoryBase = {
  base() {
    return {
      id: UuidMother.random(),
      plantInstanceId: UuidMother.random(),
      bedId: UuidMother.random(),
      userId: UuidMother.random(),
      date: new Date(),
      metadata: {
        createdAt: new Date()
      }
    };
  }
};

const toEventDocumentPrimitives = (
  base: ReturnType<typeof DomainEventFactoryBase.base>
) => ({
  _id: base.id.value,
  plantInstanceId: base.plantInstanceId.value,
  bedId: base.bedId.value,
  userId: base.userId.value,
  date: base.date.toISOString(),
  metadata: {
    createdAt: base.metadata.createdAt.toISOString()
  }
});

type DomainFactoryEvent<T extends DomainEvent['type']> = Extract<
  DomainEvent,
  { type: T }
>;

type DocumentByType = {
  watering: WateringEventDocument;
  fertilization: FertilizationEventDocument;
  pruning: PruningEventDocument;
  harvest: HarvestEventDocument;
  transplant: TransplantEventDocument;
  treatment: TreatmentEventDocument;
};

type Overrides<T> = {
  [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K];
};

function createEventDocument<T extends keyof DocumentByType>(
  type: T,
  data: DocumentByType[T]['data'],
  overrides: Overrides<DocumentByType[T]> = {}
): DocumentByType[T] {
  const base = toEventDocumentPrimitives(DomainEventFactoryBase.base());

  return {
    ...(base as Omit<DocumentByType[T], 'type' | 'data'>),
    type,
    data,
    ...(overrides as object)
  } as DocumentByType[T];
}

export const EventFactory = {
  domain: {
    watering(): DomainFactoryEvent<'watering'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'watering',
        data: {
          amountLiters: PositiveNumber.create(
            random.integer({ min: 1, max: 10 })
          )
        }
      };
    },

    fertilization(): DomainFactoryEvent<'fertilization'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'fertilization',
        data: {
          fertilizerId: UuidMother.random(),
          fertilizerType: random.arrayElement(FertilizerTypeValues),
          method: random.arrayElement(FertilizationMethodValues),
          amount: PositiveNumber.create(random.integer({ min: 1, max: 20 })),
          concentration: PositiveNumber.create(
            random.integer({ min: 1, max: 5 })
          )
        }
      };
    },

    pruning(): DomainFactoryEvent<'pruning'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'pruning',
        data: {
          type: random.arrayElement(PruningTypeValues),
          intensity: random.arrayElement(PruningIntensityValues)
        }
      };
    },

    harvest(): DomainFactoryEvent<'harvest'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'harvest',
        data: {
          yieldGrams: PositiveNumber.create(
            random.integer({ min: 50, max: 1000 })
          )
        }
      };
    },

    transplant(): DomainFactoryEvent<'transplant'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'transplant',
        data: {
          fromBedId: UuidMother.random(),
          toBedId: UuidMother.random()
        }
      };
    },

    treatment(): DomainFactoryEvent<'treatment'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'treatment',
        data: {
          target: random.arrayElement(TreatmentTargetValues),
          productId: UuidMother.random(),
          dosage: PositiveNumber.create(random.integer({ min: 1, max: 10 }))
        }
      };
    }
  },

  document: {
    watering(
      overrides: Overrides<WateringEventDocument> = {}
    ): WateringEventDocument {
      return createEventDocument(
        'watering',
        {
          amountLiters: random.integer({ min: 1, max: 10 })
        },
        overrides
      );
    },

    fertilization(
      overrides: Overrides<FertilizationEventDocument> = {}
    ): FertilizationEventDocument {
      return createEventDocument(
        'fertilization',
        {
          fertilizerId: UuidMother.random().value,
          fertilizerType: random.arrayElement(FertilizerTypeValues),
          method: random.arrayElement(FertilizationMethodValues),
          amount: random.integer({ min: 1, max: 20 }),
          concentration: random.integer({ min: 1, max: 5 })
        },
        overrides
      );
    },

    pruning(
      overrides: Overrides<PruningEventDocument> = {}
    ): PruningEventDocument {
      return createEventDocument(
        'pruning',
        {
          type: random.arrayElement(PruningTypeValues),
          intensity: random.arrayElement(PruningIntensityValues)
        },
        overrides
      );
    },

    harvest(
      overrides: Overrides<HarvestEventDocument> = {}
    ): HarvestEventDocument {
      return createEventDocument(
        'harvest',
        {
          yieldGrams: random.integer({ min: 50, max: 1000 })
        },
        overrides
      );
    },

    transplant(
      overrides: Overrides<TransplantEventDocument> = {}
    ): TransplantEventDocument {
      return createEventDocument(
        'transplant',
        {
          fromBedId: UuidMother.random().value,
          toBedId: UuidMother.random().value
        },
        overrides
      );
    },

    treatment(
      overrides: Overrides<TreatmentEventDocument> = {}
    ): TreatmentEventDocument {
      return createEventDocument(
        'treatment',
        {
          target: random.arrayElement(TreatmentTargetValues),
          productId: UuidMother.random().value,
          dosage: random.integer({ min: 1, max: 10 })
        },
        overrides
      );
    }
  }
};
