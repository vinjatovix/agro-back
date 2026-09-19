import { assertResponseMatchesOpenAPI } from './assertResponseMatchesOpenAPI.js';

describe('assertResponseMatchesOpenAPI', () => {
  describe('Basic scenarios (health endpoint)', () => {
    it('should pass if the body matches the schema', async () => {
      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/health',
          method: 'GET',
          status: 200,
          body: { status: 'ok' }
        })
      ).resolves.not.toThrow();
    });

    it('should throw an error with detailed messages if a required field is missing', async () => {
      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/health',
          method: 'GET',
          status: 200,
          body: {}
        })
      ).rejects.toThrow(
        'OpenAPI contract violation for GET /api/v1/health 200.\nValidation errors:\n- [body.status] Missing required field'
      );
    });

    it('should throw an error with detailed messages if a property has an invalid type', async () => {
      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/health',
          method: 'GET',
          status: 200,
          body: { status: 123 }
        })
      ).rejects.toThrow(
        'OpenAPI contract violation for GET /api/v1/health 200.\nValidation errors:\n- [body.status] Expected string, received number'
      );
    });
  });

  describe('Complex nested scenarios (families endpoint)', () => {
    const validFamilyResponse = {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          slug: 'solanaceae',
          name: 'Nightshades',
          scientificName: 'Solanaceae',
          shortDescription: 'A family of flowering plants',
          highlights: ['toxic', 'edible'],
          aliases: ['nightshade'],
          extra: {
            order: 'Solanales',
            subfamilies: ['Solanoideae']
          }
        }
      ],
      pagination: {
        totalItems: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    };

    it('should pass if a nested object with arrays matches the schema perfectly', async () => {
      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/families',
          method: 'GET',
          status: 200,
          body: validFamilyResponse
        })
      ).resolves.not.toThrow();
    });

    it('should pass if optional nested structures are null or missing and allowed by schema', async () => {
      const responseWithNulls = {
        ...validFamilyResponse,
        data: [
          {
            ...validFamilyResponse.data[0],
            aliases: null,
            extra: null
          }
        ]
      };

      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/families',
          method: 'GET',
          status: 200,
          body: responseWithNulls
        })
      ).resolves.not.toThrow();
    });

    it('should throw an error if data is not an array (type validation)', async () => {
      const invalidResponse = {
        ...validFamilyResponse,
        data: 'not-an-array'
      };

      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/families',
          method: 'GET',
          status: 200,
          body: invalidResponse
        })
      ).rejects.toThrow(
        'OpenAPI contract violation for GET /api/v1/families 200.\nValidation errors:\n- [body.data] Expected array, received string'
      );
    });

    it('should throw an error with detailed path if a nested element in an array has a missing required field', async () => {
      const invalidResponse = {
        ...validFamilyResponse,
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            slug: 'solanaceae',
            scientificName: 'Solanaceae',
            shortDescription: 'A family of flowering plants',
            highlights: ['toxic']
          }
        ]
      };

      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/families',
          method: 'GET',
          status: 200,
          body: invalidResponse
        })
      ).rejects.toThrow(
        'OpenAPI contract violation for GET /api/v1/families 200.\nValidation errors:\n- [body.data[0].name] Missing required field'
      );
    });

    it('should throw an error if a deep nested field has an invalid type', async () => {
      const invalidResponse = {
        ...validFamilyResponse,
        data: [
          {
            ...validFamilyResponse.data[0],
            extra: {
              order: 123,
              subfamilies: ['Solanoideae']
            }
          }
        ]
      };

      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/families',
          method: 'GET',
          status: 200,
          body: invalidResponse
        })
      ).rejects.toThrow(
        'OpenAPI contract violation for GET /api/v1/families 200.\nValidation errors:\n- [body.data[0].extra.order] Expected string, received number'
      );
    });

    it('should throw an error if a nullable field has an invalid type instead of null or its schema', async () => {
      const invalidResponse = {
        ...validFamilyResponse,
        data: [
          {
            ...validFamilyResponse.data[0],
            aliases: 12345
          }
        ]
      };

      await expect(
        assertResponseMatchesOpenAPI({
          path: '/api/v1/families',
          method: 'GET',
          status: 200,
          body: invalidResponse
        })
      ).rejects.toThrow(
        'OpenAPI contract violation for GET /api/v1/families 200.\nValidation errors:\n- [body.data[0].aliases] Expected array, received number'
      );
    });
  });
});
