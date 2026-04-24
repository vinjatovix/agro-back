import { plantMapper } from '../../../../../../src/Contexts/agroApi/agro/plants/mappers/plantMapper.js';
import { CreatePlantDtoMother } from '../application/useCases/mothers/CreatePlantDtoMother.js';
import { CreatePlant } from '../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import { PlantRepositoryMock } from '../__mocks__/PlantRepositoryMock.js';
import { PollinationType } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PollinationType.js';

describe('PlantMapper', () => {
  let repo: PlantRepositoryMock;
  let useCase: CreatePlant;

  beforeEach(() => {
    repo = new PlantRepositoryMock();
    useCase = new CreatePlant(repo);
  });

  it('should map plant to primitives correctly (base)', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);
    const p = plantMapper.toPrimitives(plant);

    expect(p.id).toBe(dto.id);
    expect(p.identity.name.primary).toBe(dto.identity.name.primary);
    expect(p.traits.lifecycle).toBe(dto.traits.lifecycle);
  });

  it('should preserve nested structures (phenology + sowing)', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);
    const p = plantMapper.toPrimitives(plant);

    expect(p.traits.size.height).toEqual(dto.traits.size.height);
    expect(p.traits.spacingCm).toEqual(dto.traits.spacingCm);

    expect(p.phenology.sowing.seedsPerHole).toEqual(
      dto.phenology.sowing.seedsPerHole
    );
    expect(p.phenology.sowing.germinationDays).toEqual(
      dto.phenology.sowing.germinationDays
    );

    expect(p.phenology.sowing.methods.direct.depthCm).toEqual(
      dto.phenology.sowing.methods.direct.depthCm
    );
  });

  it('should include pollination when present', async () => {
    const dto = CreatePlantDtoMother.tomato();
    dto.phenology.flowering.pollination = {
      type: PollinationType.INSECT,
      agents: ['bee']
    };

    const plant = await useCase.execute(dto);
    const p = plantMapper.toPrimitives(plant);

    expect(p.phenology.flowering.pollination).toBeDefined();
    expect(p.phenology.flowering.pollination?.type).toBe(
      PollinationType.INSECT
    );
  });

  it('should omit pollination when not present', async () => {
    const dto = CreatePlantDtoMother.tomato();
    delete dto.phenology.flowering.pollination;

    const plant = await useCase.execute(dto);
    const p = plantMapper.toPrimitives(plant);

    expect(p.phenology.flowering.pollination).toBeUndefined();
  });

  it('should include harvest description when present', async () => {
    const dto = CreatePlantDtoMother.tomato();
    dto.phenology.harvest.description = 'summer harvest';

    const plant = await useCase.execute(dto);
    const p = plantMapper.toPrimitives(plant);

    expect(p.phenology.harvest.description).toBe('summer harvest');
  });

  it('should handle knowledge empty fallback', async () => {
    const dto = CreatePlantDtoMother.tomato();
    delete dto.knowledge;

    const plant = await useCase.execute(dto);
    const p = plantMapper.toPrimitives(plant);

    expect(p.knowledge).toBeDefined();
  });

  it('should preserve deletedAt when present', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);
    plant.deletedAt = new Date();

    const p = plantMapper.toPrimitives(plant);

    expect(p.deletedAt).toBeDefined();
  });

  it('should be reversible (full structure)', async () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = await useCase.execute(dto);

    const primitives = plantMapper.toPrimitives(plant);
    const restored = plantMapper.fromPrimitives(primitives);

    const restoredP = plantMapper.toPrimitives(restored);

    expect(restoredP).toMatchObject(primitives);
  });

  it('should build fromDtoToDomain correctly', () => {
    const dto = CreatePlantDtoMother.tomato();

    const plant = plantMapper.fromCreateDtoToDomain(dto);

    const p = plantMapper.toPrimitives(plant);

    expect(p.id).toBe(dto.id);
    expect(p.identity.name.primary).toBe(dto.identity.name.primary);
  });

  it('should fallback to empty knowledge when missing', () => {
    const dto = CreatePlantDtoMother.tomato();
    delete dto.knowledge;

    const plant = plantMapper.fromCreateDtoToDomain(dto);

    const p = plantMapper.toPrimitives(plant);

    expect(p.knowledge).toBeDefined();
  });
});
