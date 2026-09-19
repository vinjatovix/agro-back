import { plantApiMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantApiMapper.js';
import { CreatePlantDtoMother } from '../application/useCases/mothers/CreatePlantDtoMother.js';
import { PollinationType } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';

const USER = 'test-user';

describe('PlantApiMapper', () => {
  describe('fromCreateDto', () => {
    it('should map basic dto to domain correctly', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantApiMapper.fromCreateDto(dto, 'test-user');

      expect(plant.id.value).toBe(dto.id);
      expect(plant.identity.name.primary).toBe(dto.identity.name.primary);
      expect(plant.traits.lifecycle.getValue()).toBe(dto.traits.lifecycle);
    });

    it('should map phenology correctly', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantApiMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.sowing.seedsPerHole.toPrimitives()).toEqual(
        dto.phenology.sowing.seedsPerHole
      );

      expect(plant.phenology.sowing.germinationDays.toPrimitives()).toEqual(
        dto.phenology.sowing.germinationDays
      );

      expect(plant.phenology.flowering.months.toArray()).toEqual(
        dto.phenology.flowering.months
      );
    });

    it('should include pollination when present', () => {
      const dto = CreatePlantDtoMother.tomato();

      dto.phenology.flowering.pollination = {
        type: PollinationType.INSECT,
        agents: ['bee']
      };

      const plant = plantApiMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.pollination).toBeDefined();
      expect(plant.phenology.flowering.pollination?.type).toBe(
        PollinationType.INSECT
      );
    });

    it('should omit pollination when not present', () => {
      const dto = CreatePlantDtoMother.tomato();

      delete dto.phenology.flowering.pollination;

      const plant = plantApiMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.pollination).toBeUndefined();
    });

    it('should map optional identity fields', () => {
      const dto = CreatePlantDtoMother.withOptionalFields();

      const plant = plantApiMapper.fromCreateDto(dto, USER);

      expect(plant.identity.scientificName).toBe(dto.identity.scientificName);
    });

    it('should fallback to empty knowledge when not provided', () => {
      const dto = CreatePlantDtoMother.tomato();
      delete dto.knowledge;

      const plant = plantApiMapper.fromCreateDto(dto, USER);

      expect(plant.knowledge).toBeDefined();
    });

    it('should set metadata with user', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantApiMapper.fromCreateDto(dto, USER);

      expect(plant.metadata.createdBy).toBe(USER);
    });
  });

  describe('fromUpdateDtoToPrimitivesPatch', () => {
    it('should map identity patch', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({
        identity: {
          name: {
            primary: 'New name'
          }
        }
      });

      expect(patch.identity?.name?.primary).toBe('New name');
    });

    it('should map traits patch', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({
        traits: {
          lifecycle: 'annual',
          spacingCm: { min: 10, max: 20 }
        }
      });

      expect(patch.traits?.lifecycle).toBe('annual');
      expect(patch.traits?.spacingCm).toEqual({ min: 10, max: 20 });
    });

    it('should map nested size patch', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({
        traits: {
          size: {
            height: { min: 10, max: 50 }
          }
        }
      });

      expect(patch.traits?.size?.height).toEqual({
        min: 10,
        max: 50
      });
    });

    it('should map sowing patch', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({
        phenology: {
          sowing: {
            months: [1, 2],
            seedsPerHole: { min: 1, max: 2 }
          }
        }
      });

      expect(patch.phenology?.sowing?.months).toEqual([1, 2]);
      expect(patch.phenology?.sowing?.seedsPerHole).toEqual({
        min: 1,
        max: 2
      });
    });

    it('should map sowing methods patch', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({
        phenology: {
          sowing: {
            methods: {
              direct: { depthCm: { min: 1, max: 2 } }
            }
          }
        }
      });

      expect(patch.phenology?.sowing?.methods?.direct?.depthCm).toEqual({
        min: 1,
        max: 2
      });
    });

    it('should map knowledge patch', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({
        knowledge: {
          watering: { frequency: 'daily' }
        }
      });

      expect(patch.knowledge?.watering?.frequency).toBe('daily');
    });

    it('should return empty object when dto is empty', () => {
      const patch = plantApiMapper.fromUpdateDtoToPrimitivesPatch({});

      expect(patch).toEqual({});
    });
  });
});
