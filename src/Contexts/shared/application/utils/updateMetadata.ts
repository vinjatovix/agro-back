import type { Username } from '../../../Auth/domain/value-objects/Username.js';

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
