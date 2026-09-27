import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export class GetFamilyBySlug {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(slug: string): Promise<Family> {
    return ensureFound(
      await this.repository.findBySlug(slug),
      'Family',
      slug,
      'slug'
    );
  }
}
