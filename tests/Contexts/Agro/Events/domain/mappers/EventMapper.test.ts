import { EventMapper } from '../../../../../../src/Contexts/Agro/Events/domain/mappers/EventMapper.js';
import type { DomainEvent } from '../../../../../../src/Contexts/Agro/Events/domain/types/DomainEvent.js';
import type {
  FertilizationEventDocument,
  HarvestEventDocument,
  PruningEventDocument,
  TransplantEventDocument,
  TreatmentEventDocument,
  WateringEventDocument
} from '../../../../../../src/Contexts/Agro/Events/infrastructure/persistence/types/EventDocument.js';
import { EventFactory } from '../mothers/EventFactory.js';

describe('EventMapper', () => {
  describe('toDomain', () => {
    it('should map watering document to domain event', () => {
      const doc = EventFactory.document.watering();

      const event = EventMapper.toDomain(doc) as Extract<
        DomainEvent,
        { type: 'watering' }
      >;

      expect(event.type).toBe('watering');
      expect(event.data.amountLiters.value).toBe(doc.data.amountLiters);
      expect(event.id.value).toBe(doc._id);
    });

    it('should map fertilization document to domain event', () => {
      const doc = EventFactory.document.fertilization();

      const event = EventMapper.toDomain(doc) as Extract<
        ReturnType<typeof EventMapper.toDomain>,
        { type: 'fertilization' }
      >;

      expect(event.type).toBe('fertilization');
      expect(event.data.fertilizerId.value).toBe(doc.data.fertilizerId);
      expect(event.data.fertilizerType).toBe(doc.data.fertilizerType);
      expect(event.data.method).toBe(doc.data.method);
      expect(event.data.amount.value).toBe(doc.data.amount);
      expect(event.data.concentration.value).toBe(doc.data.concentration);
    });

    it('should map pruning document to domain event', () => {
      const doc = EventFactory.document.pruning();

      const event = EventMapper.toDomain(doc) as Extract<
        ReturnType<typeof EventMapper.toDomain>,
        { type: 'pruning' }
      >;

      expect(event.type).toBe('pruning');
      expect(event.data).toEqual(doc.data);
    });

    it('should map harvest document to domain event', () => {
      const doc = EventFactory.document.harvest();

      const event = EventMapper.toDomain(doc) as Extract<
        ReturnType<typeof EventMapper.toDomain>,
        { type: 'harvest' }
      >;

      expect(event.type).toBe('harvest');
      expect(event.data.yieldGrams.value).toBe(doc.data.yieldGrams);
    });

    it('should map transplant document to domain event', () => {
      const doc = EventFactory.document.transplant();

      const event = EventMapper.toDomain(doc) as Extract<
        ReturnType<typeof EventMapper.toDomain>,
        { type: 'transplant' }
      >;

      expect(event.type).toBe('transplant');
      expect(event.data.fromBedId.value).toBe(doc.data.fromBedId);
      expect(event.data.toBedId.value).toBe(doc.data.toBedId);
    });

    it('should map treatment document to domain event', () => {
      const doc = EventFactory.document.treatment();

      const event = EventMapper.toDomain(doc) as Extract<
        ReturnType<typeof EventMapper.toDomain>,
        { type: 'treatment' }
      >;

      expect(event.type).toBe('treatment');
      expect(event.data.target).toBe(doc.data.target);
      expect(event.data.productId.value).toBe(doc.data.productId);
      expect(event.data.dosage.value).toBe(doc.data.dosage);
    });

    it('should preserve notes when present', () => {
      const doc = EventFactory.document.watering({
        notes: 'some note'
      });

      const event = EventMapper.toDomain(doc) as Extract<
        ReturnType<typeof EventMapper.toDomain>,
        { type: 'watering' }
      >;

      expect(event.notes).toBe('some note');
    });
  });

  describe('toPersistence', () => {
    it('should map watering domain event to document', () => {
      const event = EventFactory.domain.watering();

      const doc = EventMapper.toPersistence(event) as WateringEventDocument;
      expect(doc.type).toBe('watering');
      expect(doc.data.amountLiters).toBe(event.data.amountLiters.value);
      expect(doc._id).toBe(event.id.value);
    });

    it('should map fertilization domain event to document', () => {
      const event = EventFactory.domain.fertilization();

      const doc = EventMapper.toPersistence(
        event
      ) as FertilizationEventDocument;

      expect(doc.type).toBe('fertilization');
      expect(doc.data.fertilizerId).toBe(event.data.fertilizerId.value);
      expect(doc.data.fertilizerType).toBe(event.data.fertilizerType);
      expect(doc.data.method).toBe(event.data.method);
      expect(doc.data.amount).toBe(event.data.amount.value);
      expect(doc.data.concentration).toBe(event.data.concentration.value);
    });

    it('should map pruning domain event to document', () => {
      const event = EventFactory.domain.pruning();

      const doc = EventMapper.toPersistence(event) as PruningEventDocument;

      expect(doc.type).toBe('pruning');
      expect(doc.data).toEqual(event.data);
    });

    it('should map harvest domain event to document', () => {
      const event = EventFactory.domain.harvest();

      const doc = EventMapper.toPersistence(event) as HarvestEventDocument;

      expect(doc.type).toBe('harvest');
      expect(doc.data.yieldGrams).toBe(event.data.yieldGrams.value);
    });

    it('should map transplant domain event to document', () => {
      const event = EventFactory.domain.transplant();

      const doc = EventMapper.toPersistence(event) as TransplantEventDocument;

      expect(doc.type).toBe('transplant');
      expect(doc.data.fromBedId).toBe(event.data.fromBedId.value);
      expect(doc.data.toBedId).toBe(event.data.toBedId.value);
    });

    it('should map treatment domain event to document', () => {
      const event = EventFactory.domain.treatment();

      const doc = EventMapper.toPersistence(event) as TreatmentEventDocument;

      expect(doc.type).toBe('treatment');
      expect(doc.data.target).toBe(event.data.target);
      expect(doc.data.productId).toBe(event.data.productId.value);
      expect(doc.data.dosage).toBe(event.data.dosage.value);
    });

    it('should preserve notes when present', () => {
      const event = {
        ...EventFactory.domain.watering(),
        notes: 'note test'
      };

      const doc = EventMapper.toPersistence(event);

      expect(doc.notes).toBe('note test');
    });
  });
});
