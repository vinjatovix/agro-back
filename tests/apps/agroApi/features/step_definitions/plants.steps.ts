import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import { PlantStatus } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

import {
  assertDocumentUnchanged,
  currentResponse,
  plantOverrides,
  prepareRequest,
  rawCollection,
  softDeleteDocument,
  suite,
  updateStoredDocument,
  type AgroWorld
} from './utils/index.js';

const createPlants = async (world: AgroWorld): Promise<void> => {
  const [plant] = await suite().seeders.plant.createMany(2, {
    'identity.family': world.familyId
  });
  assert.exists(plant, 'PlantSeeder created no plants');

  world.plantId = plant.id;
};

Given('a plant exists', async function (this: AgroWorld) {
  await createPlants(this);
});

Given(
  'a plant exists with an extra stored field {string}',
  async function (this: AgroWorld, field: string) {
    await createPlants(this);
    await updateStoredDocument('plants', this.plantId as string, {
      $set: { [field]: 'stored outside the contract' }
    });
  }
);

Given(
  'a stored plant is missing the required field {string}',
  async function (this: AgroWorld, field: string) {
    await createPlants(this);
    await updateStoredDocument('plants', this.plantId as string, {
      $unset: { [field]: '' }
    });
  }
);

Given('a plant with optional details exists', async function (this: AgroWorld) {
  const plant = await suite().seeders.plant.create({
    'identity.family': this.familyId,
    'phenology.flowering.pollination': {
      types: ['self', 'insect'],
      agents: ['bee']
    },
    'phenology.harvest.description': 'Pick when ripe',
    'knowledge.watering': { frequency: 'weekly', conditions: ['dry soil'] },
    'knowledge.ecology': { strategicBenefits: ['Attracts pollinators'] },
    'knowledge.propagation.methods': {
      seed: { seasons: ['spring'] },
      division: { seasons: ['autumn'] }
    }
  });

  this.plantId = plant.id;
});

// A family id that matches no stored family (not even a UUID), as legacy
// data may hold: creating a plant checks its family, so it is stored after.
const MISSING_FAMILY_ID = 'fam_test';

Given(
  'a plant exists whose family does not exist',
  async function (this: AgroWorld) {
    this.familyId = (await suite().seeders.family.create()).id;
    await createPlants(this);
    await updateStoredDocument('plants', this.plantId as string, {
      $set: { 'identity.family': MISSING_FAMILY_ID }
    });
  }
);

Given(
  'plants exist from {int} families',
  async function (this: AgroWorld, count: number) {
    const families = await suite().seeders.family.createMany(count);

    for (const family of families) {
      await suite().seeders.plant.createMany(2, {
        'identity.family': family.id
      });
    }
  }
);

Given('multiple plants exists', async function (this: AgroWorld) {
  await createPlants(this);
});

Given('no plants exist', async function () {
  await suite().environmentArranger.arrange();
});

Given(
  'the following plants exist:',
  async function (this: AgroWorld, dataTable: DataTable) {
    for (const row of dataTable.hashes()) {
      const plant = await suite().seeders.plant.create(
        plantOverrides(this, row)
      );

      assert.exists(plant.id, `PlantSeeder failed for "${row.name}"`);
    }
  }
);

const createSoftDeletedPlant = async (
  world: AgroWorld,
  overrides: Record<string, unknown> = {}
): Promise<void> => {
  const [plant] = await suite().seeders.plant.createMany(1, {
    'identity.family': world.familyId,
    ...overrides
  });
  assert.exists(plant, 'PlantSeeder created no plants');

  const plantIdStr = plant.id.toString();

  world.storedDocument = await softDeleteDocument('plants', plantIdStr, {
    status: PlantStatus.DELETED,
    deletedAt: new Date().toISOString()
  });
  world.plantId = plantIdStr;
};

Given('a soft-deleted plant exists', async function (this: AgroWorld) {
  await createSoftDeletedPlant(this);
});

Given(
  'a soft-deleted plant exists with scientific name {string}',
  async function (this: AgroWorld, scientificName: string) {
    await createSoftDeletedPlant(this, {
      'identity.scientificName': scientificName
    });
  }
);

When('I get the plant', function (this: AgroWorld) {
  if (!this.plantId) {
    throw new TypeError('plantId not set');
  }

  prepareRequest(this, {
    method: 'GET',
    route: `/api/v1/plants/${this.plantId}`
  });
});

Then('the plant should be unchanged', async function (this: AgroWorld) {
  await assertDocumentUnchanged(this, 'plants', this.plantId);
});

type PlantIdentityBody = { identity?: { family?: unknown } };

const familyOf = (plant: unknown): unknown =>
  (plant as PlantIdentityBody).identity?.family;

Then(
  'the plant family should be the summary of the stored family',
  async function (this: AgroWorld) {
    const body: unknown = (await currentResponse(this)).body;

    assert.deepStrictEqual(familyOf(body), {
      id: this.familyId,
      name: this.familyName,
      slug: this.familySlug
    });
  }
);

Then(
  'the plant family should be the plain id {string}',
  async function (this: AgroWorld, familyId: string) {
    const body: unknown = (await currentResponse(this)).body;
    const expected = familyId.replace('<familyId>', this.familyId ?? '');

    assert.strictEqual(familyOf(body), expected);
  }
);

Then(
  'every listed plant should carry the summary of its own family',
  async function (this: AgroWorld) {
    const { data } = (await currentResponse(this)).body as {
      data: unknown[];
    };
    assert.isNotEmpty(data, 'The list has no plants to check');

    const stored = await rawCollection('families')
      .find({}, { projection: { name: 1, slug: 1 } })
      .toArray();
    const families = new Map(
      stored.map((family) => [
        String(fromMongoId(family._id)),
        { name: family.name, slug: family.slug }
      ])
    );

    for (const plant of data) {
      const { id = '' } = (familyOf(plant) ?? {}) as { id?: string };
      const family = families.get(id);

      assert.exists(family, 'A plant was sent without its family summary');
      assert.deepStrictEqual(familyOf(plant), { id, ...family });
    }
  }
);

// Columns `type`, `url`, `title`, `source`; an empty cell leaves the key out.
const tableRecords = (dataTable: DataTable): Record<string, string>[] =>
  dataTable
    .hashes()
    .map((row) =>
      Object.fromEntries(Object.entries(row).filter(([, cell]) => cell !== ''))
    );

Given(
  'a plant exists with the resources:',
  async function (this: AgroWorld, dataTable: DataTable) {
    const plant = await suite().seeders.plant.create({
      'identity.family': this.familyId,
      'knowledge.resources': tableRecords(dataTable)
    });
    assert.exists(plant.id, 'PlantSeeder created no plant');

    this.plantId = plant.id;
  }
);

const imageOf = (plant: unknown): unknown =>
  (plant as { image?: unknown }).image;

const listedImages = async (world: AgroWorld): Promise<unknown[]> => {
  const { data } = (await currentResponse(world)).body as { data: unknown[] };
  assert.isNotEmpty(data, 'The list has no plants to check');

  return data.map(imageOf);
};

// A single row `url`, `title`, `source`; an empty cell means the key is absent.
const expectedImage = (dataTable: DataTable): Record<string, string> => {
  const [image] = tableRecords(dataTable);
  assert.exists(image, 'The table has no image row');

  return image;
};

Then(
  'the plant image should be:',
  async function (this: AgroWorld, dataTable: DataTable) {
    const body: unknown = (await currentResponse(this)).body;

    assert.deepStrictEqual(imageOf(body), expectedImage(dataTable));
  }
);

Then(
  'every listed plant image should be:',
  async function (this: AgroWorld, dataTable: DataTable) {
    const expected = expectedImage(dataTable);

    for (const image of await listedImages(this)) {
      assert.deepStrictEqual(image, expected);
    }
  }
);

Then('no plant should be stored with id {string}', async function (id: string) {
  const stored = await rawCollection('plants').countDocuments({
    _id: toMongoId(id)
  });

  assert.strictEqual(stored, 0, `A plant ${id} was stored`);
});
