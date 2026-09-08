import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';

export class GetFamilyBySlug {
  constructor(private readonly repository: FamilyRepository) {}

  async execute(slug: string) {
    return await this.repository.findBySlug(slug);
  }
}
