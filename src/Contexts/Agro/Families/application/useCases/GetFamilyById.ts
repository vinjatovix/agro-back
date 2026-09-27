import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export class GetFamilyById {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(id: string): Promise<Family> {
    return ensureFound(await this.repository.findById(id), 'Family', id);
  }
}
