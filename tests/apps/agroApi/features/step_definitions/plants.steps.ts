import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { assert } from 'chai';

import { PlantStatus } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';

import {
  assertDocumentUnchanged,
  plantOverrides,
  prepareRequest,
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
