import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { randomEventId } from '../../../../../../src/Contexts/Agro/Events/domain/EventId.js';
import { randomFertilizerId } from '../../../../../../src/Contexts/Agro/Events/domain/FertilizerId.js';
import { randomProductId } from '../../../../../../src/Contexts/Agro/Events/domain/ProductId.js';
import type { DomainEvent } from '../../../../../../src/Contexts/Agro/Events/domain/types/DomainEvent.js';
import {
  FertilizationMethodValues,
  FertilizerTypeValues,
  PruningIntensityValues,
  PruningTypeValues,
  TreatmentTargetValues
} from '../../../../../../src/Contexts/Agro/Events/domain/types/EventData.js';
import type {
  FertilizationEventDocument,
  HarvestEventDocument,
  PruningEventDocument,
  TransplantEventDocument,
  TreatmentEventDocument,
  WateringEventDocument
} from '../../../../../../src/Contexts/Agro/Events/infrastructure/persistence/types/EventDocument.js';
import { randomPlantInstanceId } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/PlantInstanceId.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { random } from '../../../../shared/fixtures/random.js';

const DomainEventFactoryBase = {
  base() {
    return {
      id: randomEventId(),
      plantInstanceId: randomPlantInstanceId(),
      bedId: randomBedId(),
      userId: randomUserId(),
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
  _id: base.id,
  plantInstanceId: base.plantInstanceId,
  bedId: base.bedId,
  userId: base.userId,
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
          fertilizerId: randomFertilizerId(),
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
          fromBedId: randomBedId(),
          toBedId: randomBedId()
        }
      };
    },

    treatment(): DomainFactoryEvent<'treatment'> {
      return {
        ...DomainEventFactoryBase.base(),
        type: 'treatment',
        data: {
          target: random.arrayElement(TreatmentTargetValues),
          productId: randomProductId(),
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
          fertilizerId: randomFertilizerId(),
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
          fromBedId: randomBedId(),
          toBedId: randomBedId()
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
          productId: randomProductId(),
          dosage: random.integer({ min: 1, max: 10 })
        },
        overrides
      );
    }
  }
};
