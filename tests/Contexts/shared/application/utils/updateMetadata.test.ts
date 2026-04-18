import { Username } from '../../../../../src/Contexts/agroApi/Auth/domain/Username.js';
import { updateMetadata } from '../../../../../src/Contexts/shared/application/utils/updateMetadata.js';

describe('updateMetadata', () => {
  it('should set metadata.updatedBy from username value', () => {
    const username = new Username('validUser');

    const result = updateMetadata(username);

    expect(result['metadata.updatedBy']).toBe('validUser');
  });

  it('should set metadata.updatedAt with current date', () => {
    const username = new Username('validUser');
    const before = Date.now();

    const result = updateMetadata(username);

    const after = Date.now();
    expect(result['metadata.updatedAt']).toBeInstanceOf(Date);
    expect(result['metadata.updatedAt'].getTime()).toBeGreaterThanOrEqual(before);
    expect(result['metadata.updatedAt'].getTime()).toBeLessThanOrEqual(after);
  });
});
