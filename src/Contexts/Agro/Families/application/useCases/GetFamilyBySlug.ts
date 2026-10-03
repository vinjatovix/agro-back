import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { FamilyReadRepository, FamilyReadView } from '../queries/index.js';

export type GetFamilyBySlugDependencies = {
  familyReadRepository: FamilyReadRepository;
};

export class GetFamilyBySlug {
  private readonly familyReadRepository: FamilyReadRepository;

  constructor({ familyReadRepository }: GetFamilyBySlugDependencies) {
    this.familyReadRepository = familyReadRepository;
  }

  async execute(slug: string): Promise<FamilyReadView> {
    return ensureFound(
      await this.familyReadRepository.findBySlug(slug),
      'Family',
      slug,
      'slug'
    );
  }
}
