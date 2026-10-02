import { Readable } from 'node:stream';

import {
  down,
  type MigrationBulkOperation,
  type MigrationDb,
  type MigrationPlant,
  PlantsChangedWhileMigratingError,
  up
} from '../../migrations/1.0.0/20261002120000-normalize-plant-knowledge.js';

const LEGACY_IDENTITY = {
  name: { primary: 'Tomato' },
  scientificName: 'Solanum lycopersicum',
  family: '0190a6a0-0000-7000-8000-000000000001'
};

/** The stored identity with some fields replaced; `undefined` leaves one out. */
const identityWith = (
  overrides: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({ ...LEGACY_IDENTITY, ...overrides }).filter(
      ([, value]) => value !== undefined
    )
  );

/** A plant as an older version of the API stored it. */
const legacyPlant = (
  overrides: Record<string, unknown> = {}
): MigrationPlant => ({
  _id: 'plant-1',
  slug: 'tomato',
  version: 3,
  status: 'ACTIVE',
  identity: LEGACY_IDENTITY,
  phenology: {
    flowering: { months: [6, 7] },
    harvest: { months: [8, 9] }
  },
  knowledge: {},
  ...overrides
});

/**
 * A pruning entry as an older version stored it, with one `season`. An
 * `undefined` override leaves that field out.
 */
const legacyPruningEntry = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({
      type: 'maintenance',
      intensity: 'light',
      season: 'spring',
      frequencyPerYear: 1,
      ...overrides
    }).filter(([, value]) => value !== undefined)
  );

const fakeDb = (
  plants: MigrationPlant[],
  matchedCount?: number
): { db: MigrationDb; written: MigrationBulkOperation[] } => {
  const written: MigrationBulkOperation[] = [];
  const db: MigrationDb = {
    collection: () => ({
      find: () => Readable.from(plants),
      bulkWrite: (operations) => {
        written.push(...operations);
        return Promise.resolve({
          matchedCount: matchedCount ?? operations.length
        });
      }
    })
  };
  return { db, written };
};

const migrate = async (
  plant: MigrationPlant
): Promise<MigrationBulkOperation | undefined> => {
  const { db, written } = fakeDb([plant]);
  await up(db);
  return written[0];
};

const setOf = (operation: MigrationBulkOperation | undefined) =>
  operation?.updateOne.update.$set;

describe('normalize-plant-knowledge migration', () => {
  describe('up', () => {
    it('should turn a single season into a list of seasons', async () => {
      const operation = await migrate(
        legacyPlant({
          knowledge: {
            pruning: [legacyPruningEntry({ season: 'spring_to_summer' })],
            propagation: { methods: { seed: { season: 'year_round' } } }
          }
        })
      );

      expect(setOf(operation)).toMatchObject({
        'knowledge.pruning': [{ seasons: ['spring', 'summer'] }],
        'knowledge.propagation.methods': {
          seed: { seasons: ['spring', 'summer', 'autumn', 'winter'] }
        }
      });
    });

    it('should place an "after harvest" season in the month after the harvest', async () => {
      const operation = await migrate(
        legacyPlant({
          phenology: {
            flowering: { months: [6] },
            harvest: { months: [11, 12] }
          },
          knowledge: {
            pruning: [legacyPruningEntry({ season: 'after harvest' })]
          }
        })
      );

      expect(setOf(operation)?.['knowledge.pruning']).toMatchObject([
        { seasons: ['winter'] }
      ]);
    });

    it('should rename propagation methods to camelCase', async () => {
      const operation = await migrate(
        legacyPlant({
          knowledge: {
            propagation: { methods: { leaf_cutting: {}, 'air layering': {} } }
          }
        })
      );

      expect(
        Object.keys(
          setOf(operation)?.['knowledge.propagation.methods'] as object
        )
      ).toEqual(['leafCutting', 'airLayering']);
    });

    it.each([
      ['insect', { types: ['insect'] }],
      [
        { type: 'insect', agents: ['bee'] },
        { types: ['insect'], agents: ['bee'] }
      ],
      [{ type: 'wind', agents: [] }, { types: ['wind'] }],
      [
        { type: 'self', agents: ['viento', 'vibración', 'abejorros'] },
        { types: ['self', 'wind', 'insect'], agents: ['abejorros'] }
      ],
      [{ type: 'wind', agents: ['Viento'] }, { types: ['wind'] }],
      [
        { type: 'insect', agents: ['abejas', 'insectos'] },
        { types: ['insect'], agents: ['abejas'] }
      ]
    ])(
      'should turn the pollination %j into a list of types',
      async (pollination, expected) => {
        const operation = await migrate(
          legacyPlant({
            phenology: {
              flowering: { months: [6], pollination },
              harvest: { months: [8] }
            }
          })
        );

        expect(setOf(operation)?.['phenology.flowering.pollination']).toEqual(
          expected
        );
      }
    );

    it.each([['none'], [{ type: 'none', agents: [] }], [{ types: ['spore'] }]])(
      'should remove the pollination %j, which is not a way of pollinating',
      async (pollination) => {
        const operation = await migrate(
          legacyPlant({
            phenology: {
              flowering: { months: [8], pollination },
              harvest: { months: [] }
            }
          })
        );

        expect(operation?.updateOne.update.$unset).toHaveProperty([
          'phenology.flowering.pollination'
        ]);
      }
    );

    it('should give a horsetail a spores method in the seasons of its spore-bearing stems', async () => {
      const operation = await migrate(
        legacyPlant({
          identity: identityWith({ scientificName: 'Equisetum arvense' }),
          phenology: {
            flowering: { months: [4, 5], pollination: { type: 'spore' } },
            harvest: { months: [] }
          },
          knowledge: {
            propagation: { methods: { division: { seasons: ['spring'] } } }
          }
        })
      );

      expect(setOf(operation)?.['knowledge.propagation.methods']).toEqual({
        division: { seasons: ['spring'] },
        spores: { seasons: ['spring'] }
      });
      expect(setOf(operation)).not.toHaveProperty([
        'phenology.flowering.months'
      ]);
      expect(operation?.updateOne.update.$unset).toHaveProperty([
        'phenology.flowering.pollination'
      ]);
    });

    it('should give a horsetail without spore months a spores method without seasons', async () => {
      const operation = await migrate(
        legacyPlant({
          identity: identityWith({ scientificName: 'Equisetum hyemale' }),
          phenology: {
            flowering: { months: [], pollination: 'none' },
            harvest: { months: [] }
          }
        })
      );

      expect(setOf(operation)?.['knowledge.propagation.methods']).toEqual({
        spores: {}
      });
    });

    it.each([
      ['a null pollination', { months: [6], pollination: null }, {}],
      ['a blank harvest description', { months: [6] }, { description: '  ' }],
      ['a null harvest description', { months: [6] }, { description: null }]
    ])('should remove %s', async (_, flowering, harvest) => {
      const operation = await migrate(
        legacyPlant({
          phenology: { flowering, harvest: { months: [8], ...harvest } }
        })
      );

      expect(operation?.updateOne.update.$unset).toBeDefined();
    });

    it('should remove an empty ecology', async () => {
      const operation = await migrate(
        legacyPlant({ knowledge: { ecology: {} } })
      );

      expect(operation?.updateOne.update.$unset).toEqual({
        'knowledge.ecology': ''
      });
    });

    it('should keep an ecology with fields', async () => {
      const operation = await migrate(
        legacyPlant({
          knowledge: { ecology: { strategicBenefits: ['Fixes nitrogen'] } }
        })
      );

      expect(operation).toBeUndefined();
    });

    it('should give a plant without status the ACTIVE one', async () => {
      const operation = await migrate(legacyPlant({ status: undefined }));

      expect(setOf(operation)?.status).toBe('ACTIVE');
    });

    it('should bump the version and the update metadata of a changed plant', async () => {
      const operation = await migrate(legacyPlant({ status: undefined }));

      expect(operation?.updateOne.filter).toEqual({
        _id: 'plant-1',
        version: 3
      });
      expect(operation?.updateOne.update.$inc).toEqual({ version: 1 });
      expect(setOf(operation)?.['metadata.updatedBy']).toBe('system');
      expect(setOf(operation)?.['metadata.updatedAt']).toBeInstanceOf(Date);
    });

    it('should leave an already normalized plant untouched', async () => {
      const operation = await migrate(legacyPlant());

      expect(operation).toBeUndefined();
    });

    it('should remove null agents from an animal pollination', async () => {
      const operation = await migrate(
        legacyPlant({
          phenology: {
            flowering: {
              months: [6],
              pollination: { types: ['insect'], agents: null }
            },
            harvest: { months: [8] }
          }
        })
      );

      expect(setOf(operation)?.['phenology.flowering.pollination']).toEqual({
        types: ['insect']
      });
    });

    it('should not write the null fields of the entries it rewrites', async () => {
      const operation = await migrate(
        legacyPlant({
          knowledge: {
            pruning: [legacyPruningEntry({ bestPractices: null })],
            propagation: {
              methods: { seed: { season: 'spring', bestPractices: null } }
            }
          }
        })
      );

      expect(setOf(operation)).toMatchObject({
        'knowledge.pruning': [{ seasons: ['spring'] }],
        'knowledge.propagation.methods': { seed: { seasons: ['spring'] } }
      });
      expect(JSON.stringify(setOf(operation))).not.toContain('null');
    });

    it.each([
      [
        'an unknown season',
        { knowledge: { pruning: [legacyPruningEntry({ season: 'monsoon' })] } }
      ],
      [
        'an unknown pollination type',
        {
          phenology: {
            flowering: { months: [6], pollination: { type: 'magic' } },
            harvest: { months: [8] }
          }
        }
      ],
      [
        'repeated pollination types',
        {
          phenology: {
            flowering: {
              months: [6],
              pollination: { types: ['insect', 'insect'] }
            },
            harvest: { months: [8] }
          }
        }
      ],
      [
        'pollination agents without an animal type',
        {
          phenology: {
            flowering: {
              months: [6],
              pollination: { type: 'wind', agents: ['bee'] }
            },
            harvest: { months: [8] }
          }
        }
      ],
      ['a plant without identity', { identity: undefined }],
      [
        'a blank primary name',
        { identity: identityWith({ name: { primary: ' ' } }) }
      ],
      [
        'a plant without scientific name',
        { identity: identityWith({ scientificName: undefined }) }
      ],
      [
        'a null scientific name',
        { identity: identityWith({ scientificName: null }) }
      ],
      [
        'a blank scientific name',
        { identity: identityWith({ scientificName: ' ' }) }
      ],
      ['a blank family', { identity: identityWith({ family: ' ' }) }],
      [
        'a blank root system type',
        { knowledge: { rootSystem: { type: ' ' } } }
      ],
      [
        'a blank light type',
        { knowledge: { light: { hoursMin: 6, type: ' ' } } }
      ],
      [
        'light hours above 24',
        { knowledge: { light: { hoursMin: 25, type: 'full_sun' } } }
      ],
      [
        'negative light hours',
        { knowledge: { light: { hoursMin: -1, type: 'full_sun' } } }
      ],
      [
        'a blank watering frequency',
        { knowledge: { watering: { frequency: '' } } }
      ],
      [
        'a resource without type',
        { knowledge: { resources: [{ url: 'https://example.com/a' }] } }
      ],
      [
        'a resource URL that is not http(s)',
        {
          knowledge: {
            resources: [{ type: 'article', url: 'javascript:alert(1)' }]
          }
        }
      ],
      [
        'a pruning entry that is not an object',
        { knowledge: { pruning: ['prune in spring'] } }
      ],
      [
        'a pruning entry without seasons',
        {
          knowledge: { pruning: [legacyPruningEntry({ season: undefined })] }
        }
      ],
      [
        'a pruning entry that repeats a season',
        {
          knowledge: {
            pruning: [
              legacyPruningEntry({
                season: undefined,
                seasons: ['spring', 'spring']
              })
            ]
          }
        }
      ],
      [
        'a pruning entry without type',
        { knowledge: { pruning: [legacyPruningEntry({ type: undefined })] } }
      ],
      [
        'a pruning entry with a blank intensity',
        { knowledge: { pruning: [legacyPruningEntry({ intensity: ' ' })] } }
      ],
      [
        'a pruning entry without frequencyPerYear',
        {
          knowledge: {
            pruning: [legacyPruningEntry({ frequencyPerYear: undefined })]
          }
        }
      ],
      [
        'a pruning entry with frequencyPerYear 0',
        {
          knowledge: { pruning: [legacyPruningEntry({ frequencyPerYear: 0 })] }
        }
      ]
    ])('should stop on %s without writing', async (_, overrides) => {
      const { db, written } = fakeDb([
        legacyPlant({ status: undefined, _id: 'plant-0' }),
        legacyPlant(overrides)
      ]);

      await expect(up(db)).rejects.toThrow(/tomato/);
      expect(written).toHaveLength(0);
    });

    it('should fail when a plant changed while migrating', async () => {
      const { db } = fakeDb([legacyPlant({ status: undefined })], 0);

      const migration = up(db);

      await expect(migration).rejects.toBeInstanceOf(
        PlantsChangedWhileMigratingError
      );
      await expect(migration).rejects.toMatchObject({ count: 1 });
    });

    it('should give a known resource stored without type its type', async () => {
      const resource = { url: 'https://phcogcommn.org/content/103' };
      const operation = await migrate(
        legacyPlant({
          slug: 'backhousia-myrtifolia',
          knowledge: { resources: [resource] }
        })
      );

      expect(setOf(operation)?.['knowledge.resources']).toEqual([
        { ...resource, type: 'article' }
      ]);
    });
  });

  describe('down', () => {
    it('should keep the first pollination type', async () => {
      const { db, written } = fakeDb([
        legacyPlant({
          phenology: {
            flowering: {
              months: [6],
              pollination: { types: ['self', 'insect'], agents: ['bee'] }
            },
            harvest: { months: [8] }
          }
        })
      ]);

      await down(db);

      expect(setOf(written[0])?.['phenology.flowering.pollination']).toEqual({
        type: 'self',
        agents: ['bee']
      });
    });

    it('should keep the first season of each list', async () => {
      const { db, written } = fakeDb([
        legacyPlant({
          knowledge: {
            pruning: [{ seasons: ['autumn', 'winter'] }],
            propagation: { methods: { seed: { seasons: ['spring'] } } }
          }
        })
      ]);

      await down(db);

      expect(setOf(written[0])).toMatchObject({
        'knowledge.pruning': [{ season: 'autumn' }],
        'knowledge.propagation.methods': { seed: { season: 'spring' } }
      });
    });

    it('should leave out the season of an empty list instead of writing null', async () => {
      const { db, written } = fakeDb([
        legacyPlant({
          knowledge: {
            propagation: { methods: { seed: { seasons: [] } } }
          }
        })
      ]);

      await down(db);

      expect(setOf(written[0])?.['knowledge.propagation.methods']).toEqual({
        seed: {}
      });
    });
  });
});
