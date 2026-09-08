import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export class GetFamilyById {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(id: string) {
    return await this.repository.findById(id);
  }
}
