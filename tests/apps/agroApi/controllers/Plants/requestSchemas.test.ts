import httpStatus from 'http-status';

import {
  createPlantRequest,
  deletePlantRequest,
  getPlantByIdRequest,
  updatePlantRequest
} from '../../../../../src/apps/agroApi/controllers/Plants/requestSchemas.js';
import type { RequestSchemas } from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { REQUEST_LIMITS } from '../../../../../src/apps/agroApi/shared/requestSchemas.js';
import { randomPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import { withPath, withoutPath } from '../../../../shared/dto/editPath.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';
import {
  buildFullCreatePlantBody,
  buildMinimalCreatePlantBody,
  buildPruningEntryBody,
  buildResourceBody
} from './fixtures/plantBodies.js';

type RequestParts = Parameters<typeof buildRequest>[0];

const validate = (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<unknown> =>
  runWithValidation(schemas, buildRequest(parts), buildResponse().res);

const errorsOf = async (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<Record<string, string>> => {
  const error = await validate(schemas, parts);

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);

  return (error as HttpError).errors ?? {};
};

describe('Plant requestSchemas', () => {
  describe('createPlantRequest', () => {
    it('should accept a valid minimal payload', async () => {
      const body = buildMinimalCreatePlantBody();

      const error = await validate(createPlantRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should accept a valid full payload', async () => {
      const body = buildFullCreatePlantBody();

      const error = await validate(createPlantRequest, { body });

      expect(error).toBeUndefined();
    });

    it.each([['id'], ['identity'], ['traits'], ['phenology'], ['knowledge']])(
      'should reject when top-level field "%s" is missing',
      async (field) => {
        const body = buildMinimalCreatePlantBody();
        delete body[field];

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty(field);
      }
    );

    it.each([
      ['identity.scientificName'],
      ['identity.family'],
      ['identity.name.primary'],
      ['traits.lifecycle'],
      ['traits.size.height'],
      ['traits.spacingCm'],
      ['phenology.sowing'],
      ['knowledge.rootSystem'],
      ['knowledge.soil'],
      ['knowledge.light'],
      ['knowledge.propagation']
    ])(
      'should reject when nested required field "%s" is missing',
      async (fieldPath) => {
        const body = withoutPath(buildMinimalCreatePlantBody(), fieldPath);

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([fieldPath]);
      }
    );

    it.each([
      ['identity.name.primary'],
      ['identity.scientificName'],
      ['identity.family'],
      ['knowledge.rootSystem.type'],
      ['knowledge.light.type'],
      ['knowledge.watering.frequency'],
      ['phenology.harvest.description']
    ])(
      'should reject empty or whitespace-only string at "%s"',
      async (fieldPath) => {
        const body = withPath(buildFullCreatePlantBody(), fieldPath, '   ');

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([fieldPath]);
      }
    );

    it.each([
      ['knowledge.pruning', 'type', buildPruningEntryBody({ type: '   ' })],
      [
        'knowledge.pruning',
        'intensity',
        buildPruningEntryBody({ intensity: '   ' })
      ],
      ['knowledge.resources', 'type', buildResourceBody({ type: '   ' })]
    ])(
      'should reject a whitespace-only %s.0.%s',
      async (listPath, field, entry) => {
        const body = withPath(buildFullCreatePlantBody(), listPath, [entry]);

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([`${listPath}.0.${field}`]);
      }
    );

    it('should reject an empty knowledge.rootSystem', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'knowledge.rootSystem',
        {}
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['knowledge.rootSystem.type']);
      expect(errors).toHaveProperty(['knowledge.rootSystem.depthCm']);
      expect(errors).toHaveProperty(['knowledge.rootSystem.spreadCm']);
    });

    it('should reject invalid UUID for id', async () => {
      const body = buildMinimalCreatePlantBody({ id: 'invalid-uuid-123' });

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['id']);
    });

    it.each([
      ['month 0 is less than 1', [0], 'phenology.sowing.months.0'],
      ['month 13 is greater than 12', [13], 'phenology.sowing.months.0'],
      ['empty months array', [], 'phenology.sowing.months']
    ])(
      'should reject invalid sowing months (%s)',
      async (_, months, expectedPath) => {
        const body = withPath(
          buildMinimalCreatePlantBody(),
          'phenology.sowing.months',
          months
        );

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([expectedPath]);
      }
    );

    it('should leave the order of range bounds to the domain', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'traits.size.height',
        { min: 100, max: 20 }
      );

      const error = await validate(createPlantRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should reject invalid pollination type', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'phenology.flowering.pollination',
        { types: ['invalid_type'] }
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty([
        'phenology.flowering.pollination.types.0'
      ]);
    });

    it('should reject an empty list of pollination types', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'phenology.flowering.pollination',
        { types: [] }
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['phenology.flowering.pollination.types']);
    });

    it('should leave repeated pollination types to the domain', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'phenology.flowering.pollination',
        { types: ['wind', 'wind'] }
      );

      const error = await validate(createPlantRequest, { body });

      expect(error).toBeUndefined();
    });

    it.each([
      ['Snake_Case', 'seed_cutting'],
      ['kebab-case', 'seed-cutting'],
      ['PascalCase', 'SeedCutting']
    ])(
      'should reject non-camelCase propagation method key "%s"',
      async (_, key) => {
        const body = withPath(
          buildMinimalCreatePlantBody(),
          'knowledge.propagation.methods',
          { [key]: { seasons: ['spring'] } }
        );

        const errors = await errorsOf(createPlantRequest, { body });

        expect(
          Object.keys(errors).some((path) =>
            path.startsWith('knowledge.propagation.methods')
          )
        ).toBe(true);
      }
    );

    it('should accept a plant that never flowers nor is harvested', async () => {
      const body = withPath(
        withPath(buildMinimalCreatePlantBody(), 'phenology.flowering', {
          months: []
        }),
        'phenology.harvest',
        { months: [] }
      );

      const error = await validate(createPlantRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should accept a plant without flowering nor harvest sections', async () => {
      const body = withoutPath(
        withoutPath(buildMinimalCreatePlantBody(), 'phenology.flowering'),
        'phenology.harvest'
      );

      const error = await validate(createPlantRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should reject a pollination without types', async () => {
      const body = withPath(
        buildFullCreatePlantBody(),
        'phenology.flowering.pollination',
        { agents: ['bee'] }
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['phenology.flowering.pollination.types']);
    });

    it.each([
      ['knowledge.light.type', 'knowledge.light', { hoursMin: 6 }],
      [
        'knowledge.watering.frequency',
        'knowledge.watering',
        { conditions: ['dry surface'] }
      ]
    ])(
      'should reject knowledge without "%s"',
      async (fieldPath, sectionPath, section) => {
        const body = withPath(
          buildMinimalCreatePlantBody(),
          sectionPath,
          section
        );

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([fieldPath]);
      }
    );

    it.each([
      ['pruning', 'knowledge.pruning', ['Annual spring pruning']],
      ['resources', 'knowledge.resources', ['https://example.com/tomato']]
    ])('should reject %s given as plain strings', async (_, path, value) => {
      const body = withPath(buildMinimalCreatePlantBody(), path, value);

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty([`${path}.0`]);
    });

    it.each([
      ['an unknown season', ['year_round'], 'knowledge.pruning.0.seasons.0'],
      ['no season', [], 'knowledge.pruning.0.seasons']
    ])(
      'should reject a pruning entry with %s',
      async (_, seasons, errorPath) => {
        const body = withPath(
          buildMinimalCreatePlantBody(),
          'knowledge.pruning',
          [
            {
              type: 'maintenance',
              intensity: 'light',
              seasons,
              frequencyPerYear: 1
            }
          ]
        );

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([errorPath]);
      }
    );

    it('should reject the former single season of a propagation method', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'knowledge.propagation.methods',
        { seed: { season: 'spring' } }
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(
        ['knowledge.propagation.methods.seed.season'],
        'Unknown field'
      );
    });

    it.each([
      ['javascript:alert(1)'],
      ['ftp://example.com/tomato'],
      ['not a url']
    ])('should reject the resource URL "%s"', async (url) => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'knowledge.resources',
        [{ type: 'article', url }]
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['knowledge.resources.0.url']);
    });

    describe('size limits', () => {
      const tooMany = <T>(item: T): T[] =>
        Array.from({ length: REQUEST_LIMITS.listItems + 1 }, () => item);

      it.each([
        ['identity.name.primary', 'x'.repeat(REQUEST_LIMITS.shortText + 1)],
        [
          'phenology.harvest.description',
          'x'.repeat(REQUEST_LIMITS.longText + 1)
        ],
        ['identity.name.aliases', tooMany('alias')],
        ['knowledge.notes', tooMany('note')]
      ])('should reject an oversized "%s"', async (path, value) => {
        const body = withPath(buildFullCreatePlantBody(), path, value);

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty([path]);
      });

      it.each([
        ['identity.name.primary', 'x'.repeat(REQUEST_LIMITS.shortText)],
        ['identity.name.aliases', ['x'.repeat(REQUEST_LIMITS.shortText)]],
        ['phenology.harvest.description', 'x'.repeat(REQUEST_LIMITS.longText)]
      ])(
        'should not count the padding of "%s" against its limit',
        async (path, value) => {
          const padded = Array.isArray(value)
            ? value.map((item) => `  ${item}  `)
            : `  ${value}  `;
          const body = withPath(buildFullCreatePlantBody(), path, padded);

          const error = await validate(createPlantRequest, { body });

          expect(error).toBeUndefined();
        }
      );

      it('should reject too many propagation methods', async () => {
        const methods = Object.fromEntries(
          Array.from({ length: REQUEST_LIMITS.recordKeys + 1 }, (_, i) => [
            `method${String.fromCharCode(97 + i)}`,
            {}
          ])
        );
        const body = withPath(
          buildMinimalCreatePlantBody(),
          'knowledge.propagation.methods',
          methods
        );

        const errors = await errorsOf(createPlantRequest, { body });

        expect(errors).toHaveProperty(['knowledge.propagation.methods']);
      });
    });

    it('should reject an unknown top-level property', async () => {
      const body = buildMinimalCreatePlantBody({ extraField: 'unexpected' });

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['extraField'], 'Unknown field');
    });

    it('should reject an unknown nested property', async () => {
      const body = withPath(
        buildMinimalCreatePlantBody(),
        'identity.extraProp',
        'unexpected'
      );

      const errors = await errorsOf(createPlantRequest, { body });

      expect(errors).toHaveProperty(['identity.extraProp'], 'Unknown field');
    });

    it('should reject unknown query parameters', async () => {
      const body = buildMinimalCreatePlantBody();
      const query = { extraQuery: 'not-allowed' };

      const errors = await errorsOf(createPlantRequest, { body, query });

      expect(Object.values(errors)).toContain('Unknown field');
    });
  });

  describe('updatePlantRequest', () => {
    const validId = randomPlantId();
    const params = { id: validId };
    const validBody = { identity: { scientificName: 'Solanum lycopersicum' } };

    it('should accept a partial update with a valid UUID param', async () => {
      const error = await validate(updatePlantRequest, {
        params,
        body: validBody
      });

      expect(error).toBeUndefined();
    });

    it('should accept an empty body as a no-op', async () => {
      const error = await validate(updatePlantRequest, { params, body: {} });

      expect(error).toBeUndefined();
    });

    it('should reject a missing body', async () => {
      const errors = await errorsOf(updatePlantRequest, { params });

      expect(errors).toHaveProperty(['body']);
    });

    it('should reject an invalid UUID in params', async () => {
      const errors = await errorsOf(updatePlantRequest, {
        params: { id: 'invalid-uuid-456' },
        body: validBody
      });

      expect(errors).toHaveProperty(['id']);
    });

    it('should reject id supplied in the body as an unknown field', async () => {
      const body = { ...validBody, id: validId };

      const errors = await errorsOf(updatePlantRequest, { params, body });

      expect(errors).toHaveProperty(['id'], 'Unknown field');
    });

    it.each([
      [
        'flowering alone',
        {
          phenology: {
            flowering: { months: [4, 5], pollination: { types: ['insect'] } }
          }
        }
      ],
      [
        'harvest alone',
        {
          phenology: {
            harvest: { months: [6, 7], description: 'Fresh harvest' }
          }
        }
      ],
      ['rootSystem alone', { knowledge: { rootSystem: { type: 'taproot' } } }],
      [
        'pruning alone',
        {
          knowledge: {
            pruning: [
              {
                type: 'maintenance',
                intensity: 'light',
                seasons: ['spring'],
                frequencyPerYear: 1
              }
            ]
          }
        }
      ],
      [
        'pollination agents alone',
        { phenology: { flowering: { pollination: { agents: ['bee'] } } } }
      ],
      [
        'the seasons of a propagation method',
        {
          knowledge: {
            propagation: {
              methods: { seed: { seasons: ['autumn', 'winter'] } }
            }
          }
        }
      ],
      [
        'only the min bound of a range',
        { traits: { size: { height: { min: 40 } } } }
      ],
      [
        'only the max bound of a range',
        { traits: { size: { height: { max: 120 } } } }
      ],
      [
        'both bounds of a range',
        { traits: { size: { height: { min: 40, max: 120 } } } }
      ]
    ])('should accept a partial mutation of %s', async (_, body) => {
      const error = await validate(updatePlantRequest, { params, body });

      expect(error).toBeUndefined();
    });

    it.each([
      ['identity.name.primary', { identity: { name: { primary: '   ' } } }],
      ['identity.scientificName', { identity: { scientificName: '   ' } }],
      ['identity.family', { identity: { family: '   ' } }],
      [
        'knowledge.rootSystem.type',
        { knowledge: { rootSystem: { type: '   ' } } }
      ],
      ['knowledge.light.type', { knowledge: { light: { type: '   ' } } }],
      [
        'knowledge.watering.frequency',
        { knowledge: { watering: { frequency: '   ' } } }
      ],
      [
        'knowledge.pruning.0.type',
        { knowledge: { pruning: [buildPruningEntryBody({ type: '   ' })] } }
      ],
      [
        'knowledge.pruning.0.intensity',
        {
          knowledge: { pruning: [buildPruningEntryBody({ intensity: '   ' })] }
        }
      ],
      [
        'knowledge.resources.0.type',
        { knowledge: { resources: [buildResourceBody({ type: '   ' })] } }
      ],
      [
        'phenology.harvest.description',
        { phenology: { harvest: { description: '   ' } } }
      ]
    ])(
      'should reject a whitespace-only string at "%s"',
      async (fieldPath, body) => {
        const errors = await errorsOf(updatePlantRequest, { params, body });

        expect(errors).toHaveProperty([fieldPath]);
      }
    );

    it.each([
      ['identity.name.primary', { identity: { name: { primary: null } } }],
      ['identity.scientificName', { identity: { scientificName: null } }],
      ['identity.family', { identity: { family: null } }],
      ['knowledge.rootSystem', { knowledge: { rootSystem: null } }]
    ])(
      'should reject null at non-clearable field "%s"',
      async (fieldPath, body) => {
        const errors = await errorsOf(updatePlantRequest, { params, body });

        expect(errors).toHaveProperty([fieldPath]);
      }
    );

    it.each([
      ['identity.name.aliases', { identity: { name: { aliases: null } } }],
      [
        'phenology.sowing.methods.starter',
        { phenology: { sowing: { methods: { starter: null } } } }
      ],
      [
        'phenology.flowering.pollination',
        { phenology: { flowering: { pollination: null } } }
      ],
      [
        'phenology.flowering.pollination.agents',
        { phenology: { flowering: { pollination: { agents: null } } } }
      ],
      [
        'phenology.harvest.description',
        { phenology: { harvest: { description: null } } }
      ],
      ['knowledge.watering', { knowledge: { watering: null } }],
      [
        'knowledge.watering.conditions',
        { knowledge: { watering: { conditions: null } } }
      ],
      [
        'knowledge.light.preference',
        { knowledge: { light: { preference: null } } }
      ],
      ['knowledge.pruning', { knowledge: { pruning: null } }],
      ['knowledge.ecology', { knowledge: { ecology: null } }],
      [
        'knowledge.ecology.strategicBenefits',
        { knowledge: { ecology: { strategicBenefits: null } } }
      ],
      ['knowledge.resources', { knowledge: { resources: null } }],
      ['knowledge.notes', { knowledge: { notes: null } }],
      [
        'a propagation method',
        { knowledge: { propagation: { methods: { seed: null } } } }
      ],
      [
        'the fields of a propagation method',
        {
          knowledge: {
            propagation: {
              methods: {
                seed: {
                  seasons: null,
                  estimatedTimeWeeks: null,
                  bestPractices: null
                }
              }
            }
          }
        }
      ]
    ])('should accept null to remove %s', async (_, body) => {
      const error = await validate(updatePlantRequest, { params, body });

      expect(error).toBeUndefined();
    });

    it.each([
      ['knowledge.soil', { knowledge: { soil: null } }],
      ['knowledge.light', { knowledge: { light: null } }],
      [
        'knowledge.light.hoursMin',
        { knowledge: { light: { hoursMin: null } } }
      ],
      ['knowledge.propagation', { knowledge: { propagation: null } }],
      [
        'knowledge.watering.frequency',
        { knowledge: { watering: { frequency: null } } }
      ],
      [
        'phenology.flowering.pollination.types',
        { phenology: { flowering: { pollination: { types: null } } } }
      ],
      ['phenology.harvest.months', { phenology: { harvest: { months: null } } }]
    ])('should reject null at required field "%s"', async (fieldPath, body) => {
      const errors = await errorsOf(updatePlantRequest, { params, body });

      expect(errors).toHaveProperty([fieldPath]);
    });

    it('should reject unknown query parameters', async () => {
      const query = { extraQuery: 'not-allowed' };

      const errors = await errorsOf(updatePlantRequest, {
        params,
        query,
        body: validBody
      });

      expect(errors).toHaveProperty(['extraQuery'], 'Unknown field');
    });

    it('should reject unknown properties in the body', async () => {
      const body = { ...validBody, unknownProperty: 'disallowed' };

      const errors = await errorsOf(updatePlantRequest, { params, body });

      expect(errors).toHaveProperty(['unknownProperty'], 'Unknown field');
    });
  });

  describe.each([
    ['getPlantByIdRequest', getPlantByIdRequest],
    ['deletePlantRequest', deletePlantRequest]
  ])('%s', (_, schemas) => {
    const params = { id: randomPlantId() };

    it('should accept a valid UUID param without query or body', async () => {
      const error = await validate(schemas, { params });

      expect(error).toBeUndefined();
    });

    it('should reject an invalid UUID param', async () => {
      const errors = await errorsOf(schemas, { params: { id: 'not-a-uuid' } });

      expect(errors).toHaveProperty(['id']);
    });

    it('should reject unknown query parameters', async () => {
      const query = { extraQuery: 'not-allowed' };

      const errors = await errorsOf(schemas, { params, query });

      expect(errors).toHaveProperty(['extraQuery'], 'Unknown field');
    });

    it('should reject an unexpected body payload', async () => {
      const body = { unexpected: true };

      const errors = await errorsOf(schemas, { params, body });

      expect(errors).toHaveProperty(['unexpected'], 'Unknown field');
    });
  });
});
