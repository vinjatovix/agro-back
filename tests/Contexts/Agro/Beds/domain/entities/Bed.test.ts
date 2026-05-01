import { Bed } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { PlantInstanceMother } from '../mothers/PlantInstanceMother.js';
import type {
  SpatialService,
  SpatialPlantModel
} from '../../../../../../src/Contexts/Agro/Beds/domain/services/spatial/interfaces/index.js';

describe('Bed (unit)', () => {
  let validatePlacement: jest.Mock;
  let spatialService: SpatialService;

  let bed: Bed;

  const BED_DIMENSION = 200;
  const DEFAULT_SPACING = 50;

  const POSITION_A = { x: 10, y: 10 };
  const POSITION_B = { x: 20, y: 20 };
  const POSITION_C = { x: 50, y: 50 };

  const toSpatial = (
    plant: ReturnType<typeof PlantInstanceMother.atPosition>
  ): SpatialPlantModel => ({
    id: plant.id.value,
    plantId: plant.plantId.value,
    position: {
      x: plant.position.x,
      y: plant.position.y
    },
    spacingCm: DEFAULT_SPACING
  });

  beforeAll(() => {
    validatePlacement = jest.fn();

    spatialService = {
      validatePlacement
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();

    bed = new Bed(
      UuidMother.random(),
      {
        width: BED_DIMENSION,
        height: BED_DIMENSION,
        plantInstances: []
      },
      spatialService
    );
  });

  it('should expose correct dimensions and id', () => {
    expect(bed.id).toBeDefined();
    expect(bed.width).toBe(BED_DIMENSION);
    expect(bed.height).toBe(BED_DIMENSION);
  });

  it('should start with empty plant list', () => {
    expect(bed.plants).toHaveLength(0);
  });

  it('should call spatial service before adding plant', () => {
    const plant = PlantInstanceMother.atPosition(POSITION_A.x, POSITION_A.y);

    const spatial = toSpatial(plant);

    bed.addPlant(plant, spatial, []);

    expect(validatePlacement).toHaveBeenCalledTimes(1);

    expect(validatePlacement).toHaveBeenCalledWith(
      {
        width: BED_DIMENSION,
        height: BED_DIMENSION,
        plants: []
      },
      spatial
    );
  });

  it('should not mutate state if spatial validation fails', () => {
    validatePlacement.mockImplementationOnce(() => {
      throw new Error('invalid');
    });

    const plant = PlantInstanceMother.atPosition(POSITION_A.x, POSITION_A.y);

    expect(() => bed.addPlant(plant, toSpatial(plant), [])).toThrow('invalid');

    expect(bed.plants).toHaveLength(0);
  });

  it('should add plant when spatial service allows it', () => {
    const plant = PlantInstanceMother.atPosition(POSITION_C.x, POSITION_C.y);

    bed.addPlant(plant, toSpatial(plant), []);

    expect(bed.plants).toHaveLength(1);
    expect(bed.plants[0]).toBe(plant);
  });

  it('should remove plant by id', () => {
    const plant = PlantInstanceMother.atPosition(POSITION_C.x, POSITION_C.y);

    bed = new Bed(
      bed.id,
      {
        width: BED_DIMENSION,
        height: BED_DIMENSION,
        plantInstances: [plant]
      },
      spatialService
    );

    bed.removePlant(plant.id);

    expect(bed.plants).toHaveLength(0);
  });

  it('should do nothing when removing non-existent plant', () => {
    bed.removePlant(UuidMother.random());

    expect(bed.plants).toHaveLength(0);
  });

  it('should serialize to primitives correctly', () => {
    const plant = PlantInstanceMother.atPosition(POSITION_C.x, POSITION_C.y);

    bed = new Bed(
      bed.id,
      {
        width: BED_DIMENSION,
        height: BED_DIMENSION,
        plantInstances: [plant]
      },
      spatialService
    );

    const result = bed.toPrimitives();

    expect(result).toEqual(
      expect.objectContaining({
        id: bed.id.value,
        width: BED_DIMENSION,
        height: BED_DIMENSION,
        plantInstances: expect.arrayContaining([
          expect.objectContaining({
            id: plant.id.value,
            plantId: plant.plantId.value
          })
        ]) as unknown[]
      })
    );
  });

  it('should pass plants array to spatial service on add', () => {
    const plant1 = PlantInstanceMother.atPosition(POSITION_A.x, POSITION_A.y);
    const plant2 = PlantInstanceMother.atPosition(POSITION_B.x, POSITION_B.y);

    const spatial1 = toSpatial(plant1);
    const spatial2 = toSpatial(plant2);

    bed.addPlant(plant1, spatial1, []);
    bed.addPlant(plant2, spatial2, [spatial1]);

    expect(validatePlacement).toHaveBeenLastCalledWith(
      {
        width: BED_DIMENSION,
        height: BED_DIMENSION,
        plants: [spatial1]
      },
      spatial2
    );
  });

  it('should call spatial service before mutating state', () => {
    const plant = PlantInstanceMother.atPosition(POSITION_A.x, POSITION_A.y);

    let capturedPlants: unknown[] = [];

    validatePlacement.mockImplementation((context: { plants: unknown[] }) => {
      capturedPlants = context.plants;
    });

    bed.addPlant(plant, toSpatial(plant), []);

    expect(capturedPlants).toHaveLength(0);
  });
});
