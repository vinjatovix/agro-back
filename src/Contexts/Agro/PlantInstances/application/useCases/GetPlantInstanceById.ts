import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';

export type GetPlantInstanceByIdDependencies = {
  plantInstanceRepository: PlantInstanceRepository;
};

export class GetPlantInstanceById {
  private readonly repository: PlantInstanceRepository;

  constructor({ plantInstanceRepository }: GetPlantInstanceByIdDependencies) {
    this.repository = plantInstanceRepository;
  }

  async execute(id: string, user: UserSessionInfo): Promise<PlantInstance> {
    const crop = await this.repository.findOwnedActiveById(id, user.id);

    return ensureFound(crop, 'PlantInstance', id);
  }
}
