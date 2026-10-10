import { PlantInstance } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/PlantInstance.js';
import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import { plantInstanceDomainMapper } from '../../../../../../src/Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import { plantInstancePersistenceMapper } from '../../../../../../src/Contexts/Agro/PlantInstances/mappers/plantInstancePersistenceMapper.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';

describe('PlantInstance (Positionless Crop)', () => {
  it('omits position key from primitives when crop is positionless', () => {
    const crop = PlantInstanceMother.create({ position: undefined });

    const primitives = plantInstanceDomainMapper.toPrimitives(crop);

    expect('position' in primitives).toBe(false);
    expect(primitives.position).toBeUndefined();
  });

  it('omits position key from Mongo document when crop is positionless', () => {
    const crop = PlantInstanceMother.create({ position: undefined });

    const doc = plantInstancePersistenceMapper.toMongoDocument(crop);

    expect('position' in doc).toBe(false);
    expect(doc.position).toBeUndefined();
  });

  it('restores positionless crop correctly from primitives without position', () => {
    const original = PlantInstanceMother.create({ position: undefined });
    const primitives = plantInstanceDomainMapper.toPrimitives(original);

    const restored = PlantInstance.fromPrimitives(primitives);

    expect(restored.position).toBeUndefined();
    expect(restored.toPrimitives()).toEqual(primitives);
  });

  it('restores positionless crop correctly from Mongo document without position', () => {
    const original = PlantInstanceMother.create({ position: undefined });
    const doc = plantInstancePersistenceMapper.toMongoDocument(original);

    const restored = plantInstancePersistenceMapper.fromMongoDocument(doc);

    expect(restored.position).toBeUndefined();
    expect(restored.id).toBe(original.id);
  });

  it('is ignored by CropSpatialService during neighbor collision checks', () => {
    const spatialService = new CropSpatialService();
    const bed = { width: 100, height: 100 };
    const proposed = { position: { x: 20, y: 20 }, spacingCm: 30 };
    const existingCrops = [
      {
        id: 'positionless-crop',
        position: undefined,
        spacingCm: 50
      }
    ];

    expect(() =>
      spatialService.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it('can be positioned later using moveTo', () => {
    const crop = PlantInstanceMother.create({ position: undefined });
    const newPosition = new Coordinates(25, 30);

    crop.moveTo(newPosition, 'gardener');

    expect(crop.position).toEqual(newPosition);
    expect('position' in crop.toPrimitives()).toBe(true);
  });
});
