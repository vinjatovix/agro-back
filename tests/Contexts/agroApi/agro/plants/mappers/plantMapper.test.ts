import { plantMapper } from '../../../../../../src/Contexts/agroApi/agro/plants/mappers/plantMapper.js';
import { CreatePlantDtoMother } from '../application/useCases/mothers/CreatePlantDtoMother.js';
import { CreatePlant } from '../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import { PlantRepositoryMock } from '../__mocks__/PlantRepositoryMock.js';
import { PollinationType } from '../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PollinationType.js';
import type { UpdatePlantDto } from '../../../../../../src/Contexts/agroApi/agro/plants/application/useCases/interfaces/UpdatePlantDto.js';

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

  it('mapKnowledge should return empty when null or empty', () => {
    expect(plantMapper.mapKnowledge(null)).toBeDefined();
    expect(plantMapper.mapKnowledge(undefined)).toBeDefined();
    expect(plantMapper.mapKnowledge({})).toBeDefined();
  });

  describe('fromUpdateDtoToPrimitivesPatch', () => {
    it('should map identity fields', () => {
      const patch = plantMapper.fromUpdateDtoToPrimitivesPatch({
        id: 'plant-1',
        identity: {
          name: { primary: 'Tomate', aliases: ['Tomato'] },
          scientificName: 'Solanum lycopersicum',
          familyId: 'solanaceae'
        }
      });

      expect(patch.identity?.name?.primary).toBe('Tomate');
      expect(patch.identity?.name?.aliases).toEqual(['Tomato']);
      expect(patch.identity?.scientificName).toBe('Solanum lycopersicum');
      expect(patch.identity?.familyId).toBe('solanaceae');
    });

    it('should map traits fields', () => {
      const patch = plantMapper.fromUpdateDtoToPrimitivesPatch({
        id: 'plant-1',
        traits: {
          lifecycle: 'annual',
          spacingCm: { min: 10, max: 50 },
          size: {
            height: { min: 10, max: 100 },
            spread: { min: 20, max: 80 }
          }
        }
      });

      expect(patch.traits?.lifecycle).toBe('annual');
      expect(patch.traits?.spacingCm).toEqual({ min: 10, max: 50 });
      expect(patch.traits?.size?.height).toEqual({ min: 10, max: 100 });
      expect(patch.traits?.size?.spread).toEqual({ min: 20, max: 80 });
    });

    it('should map phenology sowing fields', () => {
      const patch = plantMapper.fromUpdateDtoToPrimitivesPatch({
        id: 'plant-1',
        phenology: {
          sowing: {
            months: [1, 2],
            seedsPerHole: { min: 3, max: 3 },
            germinationDays: { min: 5, max: 10 },
            methods: {
              direct: { depthCm: { min: 2, max: 2 } },
              starter: { depthCm: { min: 1, max: 1 } }
            }
          }
        }
      });

      expect(patch.phenology?.sowing?.months).toEqual([1, 2]);
      expect(patch.phenology?.sowing?.seedsPerHole).toEqual({ min: 3, max: 3 });
      expect(patch.phenology?.sowing?.methods?.direct?.depthCm).toEqual({
        min: 2,
        max: 2
      });
    });

    it('should map knowledge', () => {
      const patch = plantMapper.fromUpdateDtoToPrimitivesPatch({
        id: 'plant-1',
        knowledge: {
          notes: ['water regularly']
        }
      });

      expect(patch.knowledge).toBeDefined();
    });

    it('should return empty patch when dto is empty', () => {
      const patch = plantMapper.fromUpdateDtoToPrimitivesPatch(
        {} as UpdatePlantDto
      );

      expect(patch).toEqual({});
    });
  });
});
