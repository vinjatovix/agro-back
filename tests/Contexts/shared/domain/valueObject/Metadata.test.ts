import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('Metadata', () => {
  describe('update', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const previous = Metadata.fromPrimitives({
      createdAt,
      createdBy: 'creator',
      updatedAt: createdAt,
      updatedBy: 'creator'
    });

    it('keeps the created pair and sets the acting user', () => {
      const updated = Metadata.update(previous, 'editor');

      expect(updated.createdAt).toEqual(createdAt);
      expect(updated.createdBy).toBe('creator');
      expect(updated.updatedBy).toBe('editor');
    });

    it('uses the given timestamp when provided', () => {
      const at = new Date('2025-06-15T10:00:00.000Z');

      const updated = Metadata.update(previous, 'editor', at);

      expect(updated.updatedAt).toBe(at);
    });

    it('uses the current time when no timestamp is provided', () => {
      const before = Date.now();

      const updated = Metadata.update(previous, 'editor');

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('returns a new instance and leaves the previous one unchanged', () => {
      const updated = Metadata.update(previous, 'editor');

      expect(updated).not.toBe(previous);
      expect(previous.updatedAt).toEqual(createdAt);
      expect(previous.updatedBy).toBe('creator');
    });
  });
});
