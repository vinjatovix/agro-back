import { createUserId } from '../../../../Auth/domain/UserId.js';
import { PositiveNumber } from '../../../../shared/domain/valueObject/PositiveNumber.js';
import { createBedId } from '../../../Beds/domain/BedId.js';
import { createPlantInstanceId } from '../../../PlantInstances/domain/PlantInstanceId.js';
import type { EventDocument } from '../../infrastructure/persistence/types/EventDocument.js';
import { createEventId } from '../EventId.js';
import { createFertilizerId } from '../FertilizerId.js';
import { createProductId } from '../ProductId.js';
import type { DomainEvent } from '../types/DomainEvent.js';

export const EventMapper = {
  toDomain(doc: EventDocument): DomainEvent {
    const base = {
      id: createEventId(doc._id),
      plantInstanceId: createPlantInstanceId(doc.plantInstanceId),
      bedId: createBedId(doc.bedId),
      userId: createUserId(doc.userId),
      date: new Date(doc.date),
      ...(doc.notes ? { notes: doc.notes } : {}),
      metadata: {
        createdAt: new Date(doc.metadata.createdAt)
      }
    };

    switch (doc.type) {
      case 'watering':
        return {
          ...base,
          type: 'watering',
          data: {
            amountLiters: PositiveNumber.create(doc.data.amountLiters)
          }
        } satisfies Extract<DomainEvent, { type: 'watering' }>;

      case 'fertilization':
        return {
          ...base,
          type: 'fertilization',
          data: {
            fertilizerId: createFertilizerId(doc.data.fertilizerId),
            fertilizerType: doc.data.fertilizerType,
            method: doc.data.method,
            amount: PositiveNumber.create(doc.data.amount),
            concentration: PositiveNumber.create(doc.data.concentration)
          }
        } satisfies Extract<DomainEvent, { type: 'fertilization' }>;

      case 'pruning':
        return {
          ...base,
          type: 'pruning',
          data: doc.data
        } satisfies Extract<DomainEvent, { type: 'pruning' }>;

      case 'harvest':
        return {
          ...base,
          type: 'harvest',
          data: {
            yieldGrams: PositiveNumber.create(doc.data.yieldGrams)
          }
        } satisfies Extract<DomainEvent, { type: 'harvest' }>;

      case 'transplant':
        return {
          ...base,
          type: 'transplant',
          data: {
            fromBedId: createBedId(doc.data.fromBedId),
            toBedId: createBedId(doc.data.toBedId)
          }
        } satisfies Extract<DomainEvent, { type: 'transplant' }>;

      case 'treatment':
        return {
          ...base,
          type: 'treatment',
          data: {
            target: doc.data.target,
            productId: createProductId(doc.data.productId),
            dosage: PositiveNumber.create(doc.data.dosage)
          }
        } satisfies Extract<DomainEvent, { type: 'treatment' }>;
    }
  },

  toPersistence(event: DomainEvent): EventDocument {
    const base = {
      _id: event.id,
      plantInstanceId: event.plantInstanceId,
      bedId: event.bedId,
      userId: event.userId,
      date: event.date.toISOString(),
      ...(event.notes ? { notes: event.notes } : {}),
      metadata: {
        createdAt: event.metadata.createdAt.toISOString()
      }
    };

    switch (event.type) {
      case 'watering':
        return {
          ...base,
          type: 'watering',
          data: {
            amountLiters: event.data.amountLiters.value
          }
        } satisfies Extract<EventDocument, { type: 'watering' }>;

      case 'fertilization':
        return {
          ...base,
          type: 'fertilization',
          data: {
            fertilizerId: event.data.fertilizerId,
            fertilizerType: event.data.fertilizerType,
            method: event.data.method,
            amount: event.data.amount.value,
            concentration: event.data.concentration.value
          }
        } satisfies Extract<EventDocument, { type: 'fertilization' }>;

      case 'pruning':
        return {
          ...base,
          type: 'pruning',
          data: event.data
        } satisfies Extract<EventDocument, { type: 'pruning' }>;

      case 'harvest':
        return {
          ...base,
          type: 'harvest',
          data: {
            yieldGrams: event.data.yieldGrams.value
          }
        } satisfies Extract<EventDocument, { type: 'harvest' }>;

      case 'transplant':
        return {
          ...base,
          type: 'transplant',
          data: {
            fromBedId: event.data.fromBedId,
            toBedId: event.data.toBedId
          }
        } satisfies Extract<EventDocument, { type: 'transplant' }>;

      case 'treatment':
        return {
          ...base,
          type: 'treatment',
          data: {
            target: event.data.target,
            productId: event.data.productId,
            dosage: event.data.dosage.value
          }
        } satisfies Extract<EventDocument, { type: 'treatment' }>;
    }
  }
};
