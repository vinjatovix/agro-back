import type { PlantKnowledgeProps } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/interfaces/PlantKnowledgeProps.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';

describe('PlantKnowledge', () => {
  const mockProps = {
    soil: {
      ph: { min: 6, max: 7 },
      availableDepthCm: { min: 20, max: 50 }
    },
    watering: {
      frequency: 'weekly',
      conditions: ['dry']
    },
    light: {
      hoursMin: 6,
      type: 'partial_shade',
      preference: 'morning'
    },
    pruning: [
      {
        type: 'maintenance',
        intensity: 'light',
        season: 'spring',
        frequencyPerYear: 2
      }
    ],
    propagation: {
      methods: {
        cuttings: {
          season: 'spring',
          estimatedTimeWeeks: { min: 2, max: 4 }
        }
      }
    },
    ecology: {
      strategicBenefits: ['pollinator friendly']
    },
    resources: [
      {
        type: 'image',
        url: 'https://example.com/img.jpg',
        title: 'test'
      }
    ],
    notes: ['test note'],
    rootSystem: {
      type: 'taproot',
      depthCm: { min: 10, max: 30 },
      spreadCm: { min: 20, max: 40 }
    }
  };

  it('should expose all properties via getters', () => {
    const knowledge = new PlantKnowledge(
      mockProps as unknown as PlantKnowledgeProps
    );

    expect(knowledge.soil).toBe(mockProps.soil);
    expect(knowledge.watering).toBe(mockProps.watering);
    expect(knowledge.light).toBe(mockProps.light);
    expect(knowledge.pruning).toBe(mockProps.pruning);
    expect(knowledge.propagation).toBe(mockProps.propagation);
    expect(knowledge.ecology).toBe(mockProps.ecology);
    expect(knowledge.resources).toBe(mockProps.resources);
    expect(knowledge.notes).toBe(mockProps.notes);
    expect(knowledge.rootSystem).toBe(mockProps.rootSystem);
  });

  it('should allow empty creation', () => {
    const knowledge = PlantKnowledge.empty();

    expect(knowledge.soil).toBeUndefined();
    expect(knowledge.watering).toBeUndefined();
    expect(knowledge.light).toBeUndefined();
    expect(knowledge.pruning).toBeUndefined();
    expect(knowledge.propagation).toBeUndefined();
    expect(knowledge.ecology).toBeUndefined();
    expect(knowledge.resources).toBeUndefined();
    expect(knowledge.notes).toBeUndefined();
    expect(knowledge.rootSystem).toBeUndefined();
  });

  it('should preserve reference integrity (no cloning)', () => {
    const knowledge = new PlantKnowledge(
      mockProps as unknown as PlantKnowledgeProps
    );

    expect(knowledge.soil).toBe(mockProps.soil);
  });
});
