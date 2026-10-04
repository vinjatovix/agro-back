import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  FamilyField,
  FamilyReadRepository,
  FamilySparseView
} from '../queries/index.js';

export type GetFamilyByIdDependencies = {
  familyReadRepository: FamilyReadRepository;
};

export class GetFamilyById {
  private readonly familyReadRepository: FamilyReadRepository;

  constructor({ familyReadRepository }: GetFamilyByIdDependencies) {
    this.familyReadRepository = familyReadRepository;
  }

  async execute(
    id: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<FamilySparseView> {
    return ensureFound(
      await this.familyReadRepository.findById(id, options),
      'Family',
      id
    );
  }
}
