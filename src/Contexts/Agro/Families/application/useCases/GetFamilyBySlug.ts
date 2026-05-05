import { createError } from '../../../../../shared/errors/index.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export class GetFamilyBySlug {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(slug: string) {
    const family = await this.repository.findBySlug(slug);

    if (!family) {
      throw createError.notFound(`Family not found: ${slug}`);
    }

    return family;
  }
}
