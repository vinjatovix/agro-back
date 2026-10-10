import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';

describe('CropSpatialService', () => {
  const service = new CropSpatialService();
  const bed = { width: 100, height: 200 };

  it('allows placement within bed boundaries and away from existing crops', () => {
    const proposed = {
      position: { x: 50, y: 50 },
      spacingCm: 20
    };
    const existingCrops = [
      {
        id: 'crop-1',
        position: { x: 10, y: 10 },
        spacingCm: 20
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it.each([
    [-1, 50, 'Crop position x cannot be less than 0'],
    [101, 50, 'Crop position x cannot exceed bed width'],
    [50, -1, 'Crop position y cannot be less than 0'],
    [50, 201, 'Crop position y cannot exceed bed height']
  ])(
    'throws DomainConflictException when coordinates (%i, %i) are out of bounds',
    (x, y) => {
      const proposed = {
        position: { x, y },
        spacingCm: 20
      };

      expect(() =>
        service.validatePlacement({ bed, proposed, existingCrops: [] })
      ).toThrow(DomainConflictException);
    }
  );

  it('allows placement exactly on bed edges', () => {
    const proposed = {
      position: { x: 0, y: 200 },
      spacingCm: 10
    };

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops: [] })
    ).not.toThrow();
  });

  it('throws DomainConflictException when proposed crop collides with an existing crop', () => {
    const proposed = {
      position: { x: 30, y: 30 },
      spacingCm: 30
    };
    const existingCrops = [
      {
        id: 'crop-1',
        position: { x: 40, y: 40 },
        spacingCm: 20
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).toThrow(DomainConflictException);
  });

  it('uses the maximum spacing between the two crops as the required collision distance', () => {
    const proposed = {
      position: { x: 10, y: 10 },
      spacingCm: 15
    };
    const existingCrops = [
      {
        id: 'crop-large-spacing',
        position: { x: 10, y: 40 },
        spacingCm: 40
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).toThrow(DomainConflictException);
  });

  it('ignores existing crops without coordinates', () => {
    const proposed = {
      position: { x: 20, y: 20 },
      spacingCm: 25
    };
    const existingCrops = [
      {
        id: 'crop-no-pos',
        position: undefined,
        spacingCm: 50
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it('ignores the crop itself when an excludedCropId is supplied during movement', () => {
    const proposed = {
      position: { x: 20, y: 20 },
      spacingCm: 25
    };
    const existingCrops = [
      {
        id: 'self-crop',
        position: { x: 20, y: 20 },
        spacingCm: 25
      }
    ];

    expect(() =>
      service.validatePlacement({
        bed,
        proposed,
        existingCrops,
        excludeCropId: 'self-crop'
      })
    ).not.toThrow();
  });
});
