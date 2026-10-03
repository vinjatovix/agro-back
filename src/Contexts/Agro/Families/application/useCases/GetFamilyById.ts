import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export type GetFamilyByIdDependencies = {
  familyRepository: FamilyRepository;
};

export class GetFamilyById {
  private readonly familyRepository: FamilyRepository;

  constructor({ familyRepository }: GetFamilyByIdDependencies) {
    this.familyRepository = familyRepository;
  }

  async execute(id: string): Promise<Family> {
    return ensureFound(await this.familyRepository.findById(id), 'Family', id);
  }
}
