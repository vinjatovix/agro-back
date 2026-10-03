import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import type { FamilyPrimitives } from '../../../../../src/Contexts/Agro/Families/domain/types/FamilyPrimitives.js';

import {
  assertDocumentUnchanged,
  suite,
  updateStoredDocument,
  type AgroWorld
} from './utils/index.js';

const rememberFamily = (world: AgroWorld, family: FamilyPrimitives): void => {
  world.familyId = family.id;
  world.familySlug = family.slug;
  world.familyName = family.name;
};

Given('a family exists', async function (this: AgroWorld) {
  rememberFamily(this, await suite().seeders.family.create());
});

Given(
  'a family exists with an extra stored field {string}',
  async function (this: AgroWorld, field: string) {
    const family = await suite().seeders.family.create();
    rememberFamily(this, family);
    await updateStoredDocument('families', family.id, {
      $set: { [field]: 'stored outside the contract' }
    });
  }
);

Given(
  'a stored family is missing the required field {string}',
  async function (this: AgroWorld, field: string) {
    const family = await suite().seeders.family.create();
    rememberFamily(this, family);
    await updateStoredDocument('families', family.id, {
      $unset: { [field]: '' }
    });
  }
);

Given('a family with extra exists', async function (this: AgroWorld) {
  const family = await suite().seeders.family.create({
    extra: {
      order: 'Rosales',
      distribution: 'Worldwide',
      speciesCount: 3000,
      subfamilies: ['Rosoideae']
    }
  });

  rememberFamily(this, family);
});

Given(
  'a family exists with scientific name {string}',
  async function (this: AgroWorld, scientificName: string) {
    rememberFamily(
      this,
      await suite().seeders.family.create({ scientificName })
    );
  }
);

Given('multiple families exist', async function (this: AgroWorld) {
  const [family] = await suite().seeders.family.seed();
  assert.exists(family, 'FamilySeeder created no families');

  this.familyId = family.id;
  this.familySlug = family.slug;
});

Given('another family exists', async function (this: AgroWorld) {
  const family = await suite().seeders.family.create();

  this.otherFamilyId = family.id;
});

Given(
  'another family exists with slug {string}',
  async function (this: AgroWorld, slug: string) {
    const family = await suite().seeders.family.create({ slug });

    this.otherFamilyId = family.id;
  }
);

Then('the family should be unchanged', async function (this: AgroWorld) {
  await assertDocumentUnchanged(this, 'families', this.familyId);
});
