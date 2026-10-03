import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { FamilyReadRepository, FamilyReadView } from '../queries/index.js';

export type GetFamilyByIdDependencies = {
  familyReadRepository: FamilyReadRepository;
};

export class GetFamilyById {
  private readonly familyReadRepository: FamilyReadRepository;

  constructor({ familyReadRepository }: GetFamilyByIdDependencies) {
    this.familyReadRepository = familyReadRepository;
  }

  async execute(id: string): Promise<FamilyReadView> {
    return ensureFound(
      await this.familyReadRepository.findById(id),
      'Family',
      id
    );
  }
}
