import type { PlantKnowledgeChanges } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantKnowledgeChanges.js';
import type { PlantKnowledgePrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantKnowledgeProps } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/interfaces/PlantKnowledgeProps.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { plantKnowledgeMapper } from '../../../../../../src/Contexts/Agro/Plants/mappers/plantKnowledgeMapper.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantKnowledgeBuilder } from '../mothers/PlantKnowledgeBuilder.js';

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
        seasons: ['spring'],
        frequencyPerYear: 2
      }
    ],
    propagation: {
      methods: {
        cuttings: {
          seasons: ['spring'],
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
    // Sections with required labels are rebuilt with those labels trimmed.
    expect(knowledge.watering).toEqual(mockProps.watering);
    expect(knowledge.light).toEqual(mockProps.light);
    expect(knowledge.pruning).toEqual(mockProps.pruning);
    expect(knowledge.propagation).toBe(mockProps.propagation);
    expect(knowledge.ecology).toBe(mockProps.ecology);
    expect(knowledge.resources).toEqual(mockProps.resources);
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

  describe('fromPrimitives', () => {
    it('should round-trip through toPrimitives matching plantKnowledgeMapper output', () => {
      const knowledge = PlantKnowledgeBuilder.tomato();
      const mapperPrimitives = plantKnowledgeMapper.toPrimitives(knowledge);

      const reconstructed = PlantKnowledge.fromPrimitives(mapperPrimitives);

      expect(reconstructed.toPrimitives()).toEqual(mapperPrimitives);
    });

    it('should drop a legacy stored watering.amountMm from the output', () => {
      const legacyWatering = {
        frequency: 'weekly' as const,
        amountMm: 500,
        conditions: ['dry']
      };
      const primitives: PlantKnowledgePrimitives = { watering: legacyWatering };

      const knowledge = PlantKnowledge.fromPrimitives(primitives);
      const result = knowledge.toPrimitives();

      expect(result.watering?.frequency).toBe('weekly');
      expect('amountMm' in (result.watering ?? {})).toBe(false);
    });

    it('should reconstruct full knowledge with all sections', () => {
      const original = PlantKnowledgeBuilder.full();
      const primitives = plantKnowledgeMapper.toPrimitives(original);

      const reconstructed = PlantKnowledge.fromPrimitives(primitives);

      expect(reconstructed.soil).toBeDefined();
      expect(reconstructed.rootSystem).toBeDefined();
      expect(reconstructed.watering?.frequency).toBe('weekly');
      expect(reconstructed.light).toBeDefined();
    });
  });

  describe('seasons', () => {
    it('should reject a season repeated in a pruning entry', () => {
      const primitives: PlantKnowledgePrimitives = {
        pruning: [
          {
            type: 'maintenance',
            intensity: 'light',
            seasons: ['spring', 'spring'],
            frequencyPerYear: 1
          }
        ]
      };

      expect(() => PlantKnowledge.fromPrimitives(primitives)).toThrow(
        /knowledge\.pruning\.0\.seasons/
      );
    });

    it('should reject a season repeated in a propagation method', () => {
      const knowledge = PlantKnowledgeBuilder.full();
      const update = (): PlantKnowledge =>
        knowledge.update({
          propagation: { methods: { seed: { seasons: ['autumn', 'autumn'] } } }
        });

      expect(update).toThrow(InvalidArgumentException);
      expect(update).toThrow(/knowledge\.propagation\.methods\.seed\.seasons/);
    });
  });

  describe('pruning frequency', () => {
    it.each([0, -1])(
      'should reject a pruning entry with frequencyPerYear %p',
      (frequencyPerYear) => {
        const knowledge = PlantKnowledgeBuilder.full();
        const [entry] = knowledge.toPrimitives().pruning ?? [];
        const update = (): PlantKnowledge =>
          knowledge.update({ pruning: [{ ...entry!, frequencyPerYear }] });

        expect(update).toThrow(InvalidArgumentException);
        expect(update).toThrow(/knowledge\.pruning\.0\.frequencyPerYear/);
      }
    );

    it('should accept a pruning every few years', () => {
      const knowledge = PlantKnowledgeBuilder.full();
      const [entry] = knowledge.toPrimitives().pruning ?? [];

      const updated = knowledge.update({
        pruning: [{ ...entry!, frequencyPerYear: 0.5 }]
      });

      expect(updated.toPrimitives().pruning?.[0]?.frequencyPerYear).toBe(0.5);
    });
  });

  describe('required labels', () => {
    const withLabel = (path: string, label: string): PlantKnowledgeChanges => {
      const [entry] = PlantKnowledgeBuilder.full().toPrimitives().pruning ?? [];
      const [resource] =
        PlantKnowledgeBuilder.full().toPrimitives().resources ?? [];
      const changes: Record<string, PlantKnowledgeChanges> = {
        'watering.frequency': { watering: { frequency: label } },
        'light.type': { light: { type: label } },
        'pruning.0.type': { pruning: [{ ...entry!, type: label }] },
        'pruning.0.intensity': { pruning: [{ ...entry!, intensity: label }] },
        'resources.0.type': { resources: [{ ...resource!, type: label }] }
      };
      return changes[path]!;
    };

    const paths = [
      'watering.frequency',
      'light.type',
      'pruning.0.type',
      'pruning.0.intensity',
      'resources.0.type'
    ];

    it.each(paths)('should reject a blank knowledge.%s', (path) => {
      const knowledge = PlantKnowledgeBuilder.full();
      const update = (): PlantKnowledge =>
        knowledge.update(withLabel(path, '   '));

      expect(update).toThrow(InvalidArgumentException);
      expect(update).toThrow(`knowledge.${path}`);
    });

    it.each(paths)('should trim knowledge.%s', (path) => {
      const knowledge = PlantKnowledgeBuilder.full();

      const updated = knowledge.update(withLabel(path, '  label  '));

      expect(updated.toPrimitives()).toHaveProperty(path.split('.'), 'label');
    });
  });

  describe('light hours', () => {
    it.each([-1, 24.5, 25])(
      'should reject hoursMin %p, outside 0 to 24',
      (hoursMin) => {
        const knowledge = PlantKnowledgeBuilder.full();
        const update = (): PlantKnowledge =>
          knowledge.update({ light: { hoursMin } });

        expect(update).toThrow(InvalidArgumentException);
        expect(update).toThrow(/knowledge\.light\.hoursMin/);
      }
    );

    it.each([0, 24])('should accept hoursMin %p', (hoursMin) => {
      const knowledge = PlantKnowledgeBuilder.full();

      const updated = knowledge.update({ light: { hoursMin } });

      expect(updated.light?.hoursMin).toBe(hoursMin);
    });
  });

  describe('ecology', () => {
    it('should leave out a stored ecology without fields', () => {
      const knowledge = PlantKnowledge.fromPrimitives({ ecology: {} });

      expect(knowledge.ecology).toBeUndefined();
      expect(knowledge.toPrimitives()).not.toHaveProperty('ecology');
    });
  });

  describe('update', () => {
    it('should not modify the original instance', () => {
      const knowledge = PlantKnowledgeBuilder.tomato();
      const before = knowledge.toPrimitives();

      const changes: PlantKnowledgeChanges = {
        ecology: { strategicBenefits: ['new benefit'] }
      };
      knowledge.update(changes);

      expect(knowledge.toPrimitives()).toEqual(before);
    });

    describe('soil', () => {
      it('should merge individual range fields keeping existing values', () => {
        const knowledge = PlantKnowledgeBuilder.full();
        const original = knowledge.toPrimitives();

        const result = knowledge.update({ soil: { ph: { min: 5 } } });

        expect(result.toPrimitives().soil?.ph.min).toBe(5);
        expect(result.toPrimitives().soil?.ph.max).toBe(original.soil!.ph.max);
        expect(result.toPrimitives().soil?.availableDepthCm).toEqual(
          original.soil!.availableDepthCm
        );
      });

      it('should build soil from changes when absent in current knowledge', () => {
        const knowledge = PlantKnowledge.empty();

        const result = knowledge.update({
          soil: {
            ph: { min: 6, max: 7 },
            availableDepthCm: { min: 20, max: 50 }
          }
        });

        expect(result.toPrimitives().soil?.ph).toEqual({ min: 6, max: 7 });
        expect(result.toPrimitives().soil?.availableDepthCm).toEqual({
          min: 20,
          max: 50
        });
      });

      it('should reject a partial soil when absent in current knowledge', () => {
        const knowledge = PlantKnowledge.empty();

        expect(() => knowledge.update({ soil: { ph: { min: 6 } } })).toThrow(
          InvalidArgumentException
        );
        expect(() => knowledge.update({ soil: { ph: { min: 6 } } })).toThrow(
          /knowledge\.soil\.ph/
        );
      });
    });

    describe('rootSystem', () => {
      it('should replace the type and merge range fields', () => {
        const knowledge = PlantKnowledgeBuilder.full();
        const original = knowledge.toPrimitives();

        const result = knowledge.update({
          rootSystem: { type: 'taproot', depthCm: { max: 100 } }
        });

        expect(result.toPrimitives().rootSystem?.type).toBe('taproot');
        expect(result.toPrimitives().rootSystem?.depthCm.max).toBe(100);
        expect(result.toPrimitives().rootSystem?.depthCm.min).toBe(
          original.rootSystem!.depthCm.min
        );
      });

      it('should build rootSystem from full changes when absent in current', () => {
        const knowledge = PlantKnowledge.empty();

        const result = knowledge.update({
          rootSystem: {
            type: 'fibrous',
            depthCm: { min: 10, max: 40 },
            spreadCm: { min: 20, max: 60 }
          }
        });

        expect(result.toPrimitives().rootSystem?.type).toBe('fibrous');
        expect(result.toPrimitives().rootSystem?.depthCm).toEqual({
          min: 10,
          max: 40
        });
      });

      it('should require type when rootSystem is absent in current', () => {
        const knowledge = PlantKnowledge.empty();

        expect(() =>
          knowledge.update({
            rootSystem: {
              depthCm: { min: 10, max: 40 },
              spreadCm: { min: 20, max: 60 }
            }
          })
        ).toThrow(/rootSystem\.type/);
      });
    });

    describe('watering', () => {
      it('should merge watering field by field', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({
          watering: { frequency: 'daily', conditions: ['drought'] }
        });

        expect(result.toPrimitives().watering?.frequency).toBe('daily');
        expect(result.toPrimitives().watering?.conditions).toEqual(['drought']);
      });

      it('should keep frequency when only conditions are given', () => {
        const knowledge = PlantKnowledgeBuilder.full();
        const original = knowledge.toPrimitives();

        const result = knowledge.update({
          watering: { conditions: ['drought'] }
        });

        expect(result.toPrimitives().watering?.frequency).toBe(
          original.watering!.frequency
        );
      });

      it('should require frequency when watering is absent in current', () => {
        const knowledge = PlantKnowledge.empty();

        expect(() =>
          knowledge.update({ watering: { conditions: ['drought'] } })
        ).toThrow(/watering\.frequency/);
      });
    });

    describe('light', () => {
      it('should merge light key by key', () => {
        const knowledge = PlantKnowledgeBuilder.full();
        const original = knowledge.toPrimitives();

        const result = knowledge.update({ light: { preference: 'morning' } });

        expect(result.toPrimitives().light).toEqual({
          ...original.light,
          preference: 'morning'
        });
      });

      it('should require hoursMin and type when light is absent in current', () => {
        const knowledge = PlantKnowledge.empty();

        expect(() =>
          knowledge.update({ light: { preference: 'morning' } })
        ).toThrow(/light\.hoursMin/);
      });
    });

    describe('propagation', () => {
      it('should merge method keys and replace bestPractices list', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({
          propagation: {
            methods: {
              seed: { bestPractices: ['new practice'] }
            }
          }
        });

        expect(
          result.toPrimitives().propagation?.methods.seed?.bestPractices
        ).toEqual(['new practice']);
      });

      it('should merge estimatedTimeWeeks as a range', () => {
        const knowledge = PlantKnowledgeBuilder.full().update({
          propagation: {
            methods: { seed: { estimatedTimeWeeks: { min: 2, max: 6 } } }
          }
        });

        const result = knowledge.update({
          propagation: {
            methods: {
              seed: { estimatedTimeWeeks: { min: 1 } }
            }
          }
        });

        expect(
          result.toPrimitives().propagation?.methods.seed?.estimatedTimeWeeks
        ).toEqual({ min: 1, max: 6 });
      });

      it('should add a new propagation method key', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({
          propagation: {
            methods: {
              cutting: {
                seasons: ['spring'],
                bestPractices: ['keep moist']
              }
            }
          }
        });

        expect(
          result.toPrimitives().propagation?.methods.cutting
        ).toBeDefined();
        expect(result.toPrimitives().propagation?.methods.seed).toBeDefined();
      });

      it('should reject a partial estimatedTimeWeeks on a new method key', () => {
        const knowledge = PlantKnowledgeBuilder.full();
        const update = (): PlantKnowledge =>
          knowledge.update({
            propagation: {
              methods: { cutting: { estimatedTimeWeeks: { min: 2 } } }
            }
          });

        expect(update).toThrow(InvalidArgumentException);
        expect(update).toThrow(
          /knowledge\.propagation\.methods\.cutting\.estimatedTimeWeeks/
        );
      });

      it('should keep propagation when the changes carry no method', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({ propagation: {} });

        expect(result.toPrimitives().propagation).toEqual(
          knowledge.toPrimitives().propagation
        );
      });
    });

    describe('empty sections', () => {
      it('should not create propagation or ecology from empty changes', () => {
        const result = PlantKnowledge.empty().update({
          propagation: { methods: {} },
          ecology: {}
        });

        expect(result.toPrimitives()).toEqual({});
      });

      it('should keep ecology when the changes carry no field', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({ ecology: {} });

        expect(result.toPrimitives().ecology).toEqual(
          knowledge.toPrimitives().ecology
        );
      });
    });

    describe('list sections', () => {
      it('should replace ecology.strategicBenefits list', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({
          ecology: { strategicBenefits: ['new benefit'] }
        });

        expect(result.toPrimitives().ecology?.strategicBenefits).toEqual([
          'new benefit'
        ]);
      });

      it('should replace pruning list', () => {
        const knowledge = PlantKnowledgeBuilder.full();
        const newPruning = [
          {
            type: 'rejuvenation' as const,
            intensity: 'hard' as const,
            seasons: ['spring' as const],
            frequencyPerYear: 1
          }
        ];

        const result = knowledge.update({ pruning: newPruning });

        expect(result.toPrimitives().pruning).toEqual(newPruning);
      });

      it('should replace notes list', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update({ notes: ['new note'] });

        expect(result.toPrimitives().notes).toEqual(['new note']);
      });
    });

    describe('null removals', () => {
      it.each([
        ['watering', { watering: null }],
        ['pruning', { pruning: null }],
        ['ecology', { ecology: null }],
        ['resources', { resources: null }],
        ['notes', { notes: null }]
      ] satisfies Array<
        [keyof PlantKnowledgePrimitives, PlantKnowledgeChanges]
      >)('should remove %s on null', (section, changes) => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge.update(changes).toPrimitives();

        expect(result).not.toHaveProperty(section);
        expect(result.soil).toEqual(knowledge.toPrimitives().soil);
      });

      it('should remove optional fields inside a section on null', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge
          .update({
            watering: { conditions: null },
            light: { preference: null },
            ecology: { strategicBenefits: null }
          })
          .toPrimitives();

        expect(result.watering).not.toHaveProperty('conditions');
        expect(result.watering?.frequency).toBe(
          knowledge.toPrimitives().watering?.frequency
        );
        expect(result.light).not.toHaveProperty('preference');
      });

      it('should remove the ecology when its last field is removed', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge
          .update({ ecology: { strategicBenefits: null } })
          .toPrimitives();

        expect(result).not.toHaveProperty('ecology');
      });

      it('should remove a propagation method on null and keep the others', () => {
        const knowledge = PlantKnowledgeBuilder.full().update({
          propagation: { methods: { division: { seasons: ['autumn'] } } }
        });

        const result = knowledge
          .update({ propagation: { methods: { seed: null } } })
          .toPrimitives();

        expect(result.propagation?.methods).not.toHaveProperty('seed');
        expect(result.propagation?.methods).toHaveProperty('division');
      });

      it('should remove optional fields of a propagation method on null', () => {
        const knowledge = PlantKnowledgeBuilder.full();

        const result = knowledge
          .update({
            propagation: {
              methods: {
                seed: { seasons: null, bestPractices: null }
              }
            }
          })
          .toPrimitives();

        expect(result.propagation?.methods.seed).toBeDefined();
        expect(result.propagation?.methods.seed).not.toHaveProperty('seasons');
        expect(result.propagation?.methods.seed).not.toHaveProperty(
          'bestPractices'
        );
      });
    });
  });
});
