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
        dto.phenology.flowering.months
      );
    });

    it('should include pollination when present', () => {
      const dto = CreatePlantDtoMother.tomato();

      dto.phenology.flowering.pollination = {
        type: PollinationType.INSECT,
        agents: ['bee']
      };

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.pollination).toBeDefined();
      expect(plant.phenology.flowering.pollination?.type).toBe(
        PollinationType.INSECT
      );
    });

    it('should omit pollination when not present', () => {
      const dto = CreatePlantDtoMother.tomato();

      delete dto.phenology.flowering.pollination;

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.phenology.flowering.pollination).toBeUndefined();
    });

    it('should map optional identity fields', () => {
      const dto = CreatePlantDtoMother.withOptionalFields();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.identity.scientificName).toBe(dto.identity.scientificName);
    });

    it('should fallback to empty knowledge when not provided', () => {
      const dto = CreatePlantDtoMother.tomato();
      delete dto.knowledge;

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.knowledge).toBeDefined();
    });

    it('should set metadata with user', () => {
      const dto = CreatePlantDtoMother.tomato();

      const plant = plantInputMapper.fromCreateDto(dto, USER);

      expect(plant.metadata.createdBy).toBe(USER);
    });
  });

  describe('toChanges', () => {
    it('should carry only given name.primary trimmed', () => {
      const changes = plantInputMapper.toChanges({
        identity: { name: { primary: '  Tomate  ' } }
      });

      expect(changes.identity?.name?.primary).toBe('Tomate');
      expect(changes.identity?.family).toBeUndefined();
    });

    it('should keep name.primary empty after trim so the domain can reject it', () => {
      const changes = plantInputMapper.toChanges({
        identity: { name: { primary: '   ' } }
      });

      expect(changes.identity?.name?.primary).toBe('');
    });

    it('should pass aliases through untouched (the domain trims them)', () => {
      const aliases = [' tomatera ', '  ', 'cherry'];
      const changes = plantInputMapper.toChanges({
        identity: { name: { aliases } }
      });

      expect(changes.identity?.name?.aliases).toEqual(aliases);
    });

    it('should keep scientificName empty after trim so the domain can reject it', () => {
      const changes = plantInputMapper.toChanges({
        identity: { scientificName: '   ' }
      });

      expect(changes.identity?.scientificName).toBe('');
    });

    it('should keep family empty after trim so the domain can reject it', () => {
      const changes = plantInputMapper.toChanges({
        identity: { family: '   ' }
      });

      expect(changes.identity?.family).toBe('');
    });

    it('should pass a valid family id trimmed', () => {
      const changes = plantInputMapper.toChanges({
        identity: { family: '  abc-123  ' }
      });

      expect(changes.identity?.family).toBe('abc-123');
    });

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

    it('should drop flowering and harvest sections', () => {
      const changes = plantInputMapper.toChanges({
        phenology: { flowering: { months: [5] }, harvest: { months: [8] } }
      });

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
