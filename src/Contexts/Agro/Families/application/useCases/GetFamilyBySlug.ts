import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  FamilyField,
  FamilyReadRepository,
  FamilySparseView
} from '../queries/index.js';

export type GetFamilyBySlugDependencies = {
  familyReadRepository: FamilyReadRepository;
};

export class GetFamilyBySlug {
  private readonly familyReadRepository: FamilyReadRepository;

  constructor({ familyReadRepository }: GetFamilyBySlugDependencies) {
    this.familyReadRepository = familyReadRepository;
  }

  async execute(
    slug: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<FamilySparseView> {
    return ensureFound(
      await this.familyReadRepository.findBySlug(slug, options),
      'Family',
      slug,
      'slug'
    );
  }
}
