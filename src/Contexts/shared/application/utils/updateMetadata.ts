import type { Username } from '../../../agroApi/Auth/domain/Username.js';

interface UpdateMetadata {
  'metadata.updatedBy': string;
  'metadata.updatedAt': Date;
}

export function updateMetadata(username: Username): UpdateMetadata {
  return {
    'metadata.updatedBy': username.value,
    'metadata.updatedAt': new Date()
  };
}
