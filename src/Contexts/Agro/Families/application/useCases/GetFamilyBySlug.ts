import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export type GetFamilyBySlugDependencies = {
  familyRepository: FamilyRepository;
};

export class GetFamilyBySlug {
  private readonly familyRepository: FamilyRepository;

  constructor({ familyRepository }: GetFamilyBySlugDependencies) {
    this.familyRepository = familyRepository;
  }

  async execute(slug: string): Promise<Family> {
    return ensureFound(
      await this.familyRepository.findBySlug(slug),
      'Family',
      slug,
      'slug'
    );
  }
}
