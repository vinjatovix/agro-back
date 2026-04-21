import { CreatePlant } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/index.js';
import type { CreatePlantDto } from '../../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/interfaces/CreatePlantDto.js';
import { PlantRepositoryMock } from '../../__mocks__/PlantRepositoryMock.js';
import { CreatePlantDtoMother } from './mothers/CreatePlantDtoMother.js';

describe('CreatePlant', () => {
  let repository: PlantRepositoryMock;
  let useCase: CreatePlant;

  beforeEach(() => {
    repository = new PlantRepositoryMock();
    useCase = new CreatePlant(repository);
  });

  it('should throw if id is not a valid uuid', async () => {
    const dto = CreatePlantDtoMother.custom({
      id: 'not-a-uuid'
    });

    await expect(useCase.execute(dto)).rejects.toThrow();
  });

  it('should create and persist a plant', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);

    expect(plant.id.value).toBe(dto.id);
    expect(plant.name).toBe(dto.name);

    const stored = await repository.findById(dto.id);
    expect(stored.id.value).toBe(plant.id.value);

    repository.assertSaveHasBeenCalledWith(plant);
  });

  it('should throw if plant already exists', async () => {
    const dto = CreatePlantDtoMother.tomato();

    repository.addToStorage(await useCase.execute(dto));

    await expect(useCase.execute(dto)).rejects.toThrow(
      `Plant already exists: ${dto.id}`
    );
  });

  it('should correctly map primitive fields into domain', async () => {
    const dto = CreatePlantDtoMother.lettuce();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives).toMatchObject({
      id: dto.id,
      name: dto.name,
      lifecycle: dto.lifecycle
    });
  });

  it('should correctly map nested structures', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives.size.height).toEqual(dto.size.height);
    expect(primitives.size.spread).toEqual(dto.size.spread);
    expect(primitives.spacingCm).toEqual(dto.spacingCm);
    expect(primitives.sowing.seedsPerHole).toEqual(dto.sowing.seedsPerHole);
    expect(primitives.sowing.germinationDays).toEqual(
      dto.sowing.germinationDays
    );
    expect(primitives.sowing.methods.direct.depthCm).toEqual(
      dto.sowing.methods.direct.depthCm
    );
  });

  it('should include optional fields when provided', async () => {
    const dto = CreatePlantDtoMother.withOptionalFields();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives.scientificName).toBe(dto.scientificName);
    expect(primitives.familyId).toBe(dto.familyId);
  });

  it('should persist multiple plants independently', async () => {
    const dto1 = CreatePlantDtoMother.tomato();
    const dto2 = CreatePlantDtoMother.lettuce();

    await useCase.execute(dto1);
    await useCase.execute(dto2);

    const all = await repository.findAll();

    expect(all).toHaveLength(2);
  });

  it('should throw if sowing.direct method is missing', async () => {
    const dto = {
      ...CreatePlantDtoMother.tomato(),
      sowing: {
        ...CreatePlantDtoMother.tomato().sowing,
        methods: {}
      }
    } as unknown as CreatePlantDto;

    await expect(useCase.execute(dto)).rejects.toThrow(
      'PlantSowing.direct is required'
    );
  });
  it('should propagate error when repository fails on save', async () => {
    const dto = CreatePlantDtoMother.tomato();

    repository.simulateSaveFailure();

    await expect(useCase.execute(dto)).rejects.toThrow('Save failed');
  });

  it('should generate metadata internally', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);
    const primitives = plant.toPrimitives();

    expect(primitives.metadata).toBeDefined();
    expect(primitives.metadata?.createdAt).toBeDefined();
    expect(primitives.metadata?.createdBy).toBeDefined();
    expect(primitives.metadata?.updatedAt).toBeDefined();
    expect(primitives.metadata?.updatedBy).toBeDefined();
  });
});
