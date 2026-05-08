import type { IndexConfig } from './interfaces/IndexConfig.js';

export const INDEXES: IndexConfig[] = [
  {
    collection: 'users',
    indexes: [
      {
        fields: { email: 1 },
        options: {
          unique: true,
          name: 'users_email_unique'
        }
      },
      {
        fields: { username: 1 },
        options: {
          unique: true,
          name: 'users_username_unique'
        }
      }
    ]
  },
  {
    collection: 'families',
    indexes: [
      {
        fields: { slug: 1 },
        options: {
          unique: true,
          name: 'families_slug_unique'
        }
      }
    ]
  },
  {
    collection: 'plants',
    indexes: [
      {
        fields: { 'identity.familyId': 1 },
        options: {
          name: 'plants_family_idx'
        }
      }
    ]
  }
];
