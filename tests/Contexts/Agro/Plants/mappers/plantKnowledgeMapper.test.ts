import { plantKnowledgeMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantKnowledgeMapper.js';
import { PlantKnowledgeBuilder } from '../domain/mothers/PlantKnowledgeBuilder.js';

describe('plantKnowledgeMapper', () => {
  describe('toPrimitives', () => {
    it('should map tomato knowledge correctly', () => {
      const knowledge = PlantKnowledgeBuilder.tomato();

      const result = plantKnowledgeMapper.toPrimitives(knowledge);

      expect(result.soil).toBeDefined();
      expect(result.rootSystem).toBeDefined();

      expect(result.watering?.frequency).toBe('weekly');
      expect(result.light?.type).toBe('full_sun');

      expect(result.pruning?.length).toBeGreaterThan(0);
      expect(result.propagation).toBeDefined();
      expect(result.ecology).toBeDefined();
      expect(result.resources).toBeDefined();
      expect(result.notes).toBeDefined();
    });

    it('should handle empty knowledge', () => {
      const knowledge = PlantKnowledgeBuilder.empty();

      const result = plantKnowledgeMapper.toPrimitives(knowledge);

      expect(result).toEqual({});
    });

    it('should map full knowledge structure', () => {
      const knowledge = PlantKnowledgeBuilder.full();

      const result = plantKnowledgeMapper.toPrimitives(knowledge);

      expect(result.soil).toEqual(knowledge.soil?.toPrimitives());

      expect(result.rootSystem).toEqual(knowledge.rootSystem?.toPrimitives());

      expect(result.watering?.frequency).toBe('weekly');
    });
  });

  describe('fromPrimitives', () => {
    it('should roundtrip tomato correctly', () => {
      const knowledge = PlantKnowledgeBuilder.tomato();

      const primitives = plantKnowledgeMapper.toPrimitives(knowledge);

      const reconstructed = plantKnowledgeMapper.fromPrimitives(primitives);

      expect(plantKnowledgeMapper.toPrimitives(reconstructed)).toEqual(
        primitives
      );
    });

    it('should reconstruct full knowledge', () => {
      const original = PlantKnowledgeBuilder.full();

      const primitives = plantKnowledgeMapper.toPrimitives(original);

      const reconstructed = plantKnowledgeMapper.fromPrimitives(primitives);

      expect(reconstructed.soil).toBeDefined();
      expect(reconstructed.rootSystem).toBeDefined();
      expect(reconstructed.watering?.frequency).toBe('weekly');
    });

    it('should throw on undefined input', () => {
      expect(() => plantKnowledgeMapper.fromPrimitives(undefined)).toThrow();
    });
  });

  describe('randomized safety', () => {
    it('should survive random inputs', () => {
      for (let i = 0; i < 20; i++) {
        const knowledge = PlantKnowledgeBuilder.random();

        const primitives = plantKnowledgeMapper.toPrimitives(knowledge);

        const reconstructed = plantKnowledgeMapper.fromPrimitives(primitives);

        expect(plantKnowledgeMapper.toPrimitives(reconstructed)).toEqual(
          primitives
        );
      }
    });
  });
});
