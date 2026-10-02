import { PollinationType } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { plantInputMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantInputMapper.js';
import { CreatePlantDtoMother } from '../application/useCases/mothers/CreatePlantDtoMother.js';

const USER = 'test-user';

describe('PlantInputMapper', () => {
  describe('fromCreateDto', () => {
    it('should map basic dto to domain correctly', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantInputMapper.fromCreateDto(dto, 'test-user');

      expect(plant.id).toBe(dto.id);
      expect(plant.identity.name.primary).toBe(dto.identity.name.primary);
      expect(plant.traits.lifecycle.getValue()).toBe(dto.traits.lifecycle);
    });

    it('should map phenology correctly', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.sowing.seedsPerHole.toPrimitives()).toEqual(
        dto.phenology.sowing.seedsPerHole
      );

      expect(plant.phenology.sowing.germinationDays.toPrimitives()).toEqual(
        dto.phenology.sowing.germinationDays
      );

      expect(plant.phenology.flowering.months.toArray()).toEqual(
        dto.phenology.flowering?.months
      );
    });

    it('should include pollination when present', () => {
      const dto = CreatePlantDtoMother.custom({
        'phenology.flowering.pollination': {
          types: [PollinationType.INSECT],
          agents: ['bee']
        }
      });

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.pollination).toBeDefined();
      expect(plant.phenology.flowering.pollination?.types).toEqual([
        PollinationType.INSECT
      ]);
    });

    it('should omit pollination when not present', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.pollination).toBeUndefined();
    });

    it('should give a plant without flowering nor harvest no months', () => {
      const dto = CreatePlantDtoMother.withoutFloweringNorHarvest();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.toPrimitives()).toEqual({ months: [] });
      expect(plant.phenology.harvest.toPrimitives()).toEqual({ months: [] });
    });

    it('should map optional identity fields', () => {
      const dto = CreatePlantDtoMother.withOptionalFields();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.identity.name.aliases).toEqual(dto.identity.name.aliases);
    });

    it('should map the required identity and knowledge fields', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.identity.scientificName).toBe(dto.identity.scientificName);
      expect(plant.knowledge?.toPrimitives()).toEqual(dto.knowledge);
    });

    it('should set metadata with user', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.metadata.createdBy).toBe(USER);
    });
  });

  describe('toChanges', () => {
    it('should carry only the given identity fields', () => {
      const changes = plantInputMapper.toChanges({
        identity: { name: { primary: 'Tomate' } }
      });

      expect(changes.identity?.name?.primary).toBe('Tomate');
      expect(changes.identity?.family).toBeUndefined();
    });

    it.each([
      ['name.primary', { name: { primary: '  Tomate  ' } }],
      ['name.aliases', { name: { aliases: [' tomatera ', '  ', 'cherry'] } }],
      ['scientificName', { scientificName: '   ' }],
      ['family', { family: '  abc-123  ' }]
    ])(
      'should pass %s as sent (PlantIdentity trims and validates it)',
      (_, identity) => {
        const changes = plantInputMapper.toChanges({ identity });

        expect(changes.identity).toEqual(identity);
      }
    );

    it('should pass a zero width when present (no validation)', () => {
      const changes = plantInputMapper.toChanges({
        traits: { spacingCm: { min: 0, max: 10 } }
      });

      expect(changes.traits?.spacingCm).toEqual({ min: 0, max: 10 });
    });

    it('should drop lifecycle when missing', () => {
      const changes = plantInputMapper.toChanges({
        traits: { spacingCm: { min: 10 } }
      });

      expect(changes.traits?.lifecycle).toBeUndefined();
    });

    it('should map phenology.sowing months', () => {
      const changes = plantInputMapper.toChanges({
        phenology: { sowing: { months: [3, 4] } }
      });

      expect(changes.phenology?.sowing?.months).toEqual([3, 4]);
    });

    it('should map phenology.flowering months', () => {
      const dto = { phenology: { flowering: { months: [5, 6] } } };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology?.flowering?.months).toEqual([5, 6]);
    });

    it('should map phenology.flowering pollination types and agents', () => {
      const dto = {
        phenology: {
          flowering: {
            pollination: {
              types: [PollinationType.INSECT],
              agents: ['bee']
            }
          }
        }
      };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology?.flowering?.pollination).toEqual({
        types: [PollinationType.INSECT],
        agents: ['bee']
      });
    });

    it('should map phenology.harvest months', () => {
      const dto = { phenology: { harvest: { months: [8, 9] } } };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology?.harvest?.months).toEqual([8, 9]);
    });

    it('should map phenology.harvest description', () => {
      const dto = {
        phenology: { harvest: { description: 'Harvest when ripe' } }
      };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology?.harvest?.description).toBe('Harvest when ripe');
    });

    it('should pass null removals through to the domain', () => {
      const dto = {
        identity: { name: { aliases: null } },
        phenology: {
          sowing: { methods: { starter: null } },
          flowering: { pollination: null },
          harvest: { description: null }
        }
      };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.identity?.name?.aliases).toBeNull();
      expect(changes.phenology?.sowing?.methods?.starter).toBeNull();
      expect(changes.phenology?.flowering?.pollination).toBeNull();
      expect(changes.phenology?.harvest?.description).toBeNull();
    });

    it('should pass null pollination agents through to the domain', () => {
      const dto = {
        phenology: { flowering: { pollination: { agents: null } } }
      };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology?.flowering?.pollination).toEqual({
        agents: null
      });
    });

    it('should map sowing, flowering, and harvest together in phenology', () => {
      const dto = {
        phenology: {
          sowing: { months: [3, 4] },
          flowering: { months: [5, 6] },
          harvest: { months: [7, 8] }
        }
      };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology).toEqual({
        sowing: { months: [3, 4] },
        flowering: { months: [5, 6] },
        harvest: { months: [7, 8] }
      });
    });

    it('should omit phenology when empty phenology object is provided', () => {
      const dto = { phenology: {} };

      const changes = plantInputMapper.toChanges(dto);

      expect(changes.phenology).toBeUndefined();
    });

    it('should not include id, userId or plantInstances in output', () => {
      const changes = plantInputMapper.toChanges({
        identity: { name: { primary: 'Tomato' } }
      });

      expect(changes).not.toHaveProperty('id');
      expect(changes).not.toHaveProperty('userId');
      expect(changes).not.toHaveProperty('plantInstances');
    });

    it('should return empty object when dto is empty', () => {
      const changes = plantInputMapper.toChanges({});

      expect(changes).toEqual({});
    });
  });
});
