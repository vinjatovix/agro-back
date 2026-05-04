import { createError } from '../../../../../../shared/errors/index.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export class GetFamilyById {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(id: string) {
    const family = await this.repository.findById(id);

    if (!family) {
      throw createError.notFound(`Family not found: ${id}`);
    }

    return family;
  }
}
