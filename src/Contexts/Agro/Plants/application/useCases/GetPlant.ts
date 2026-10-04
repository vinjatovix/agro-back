import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  FamilySummaryReader,
  PlantField,
  PlantReadRepository,
  PlantRelation,
  PlantSparseView
} from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import { embedFamilySummaries, embedsFamily } from './embedFamilySummaries.js';

export type GetPlantDependencies = {
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
};

export class GetPlant {
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;

  constructor({
    plantReadRepository,
    familySummaryReader
  }: GetPlantDependencies) {
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
  }

  async execute(
    id: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<PlantField, PlantRelation> = {}
  ): Promise<PlantSparseView> {
    const { include: _include, ...readOptions } = options;
    const found = canSeeDeletedPlants(user)
      ? await this.plantReadRepository.findById(id, readOptions)
      : await this.plantReadRepository.findActiveById(id, readOptions);
    const plant = ensureFound(found, 'Plant', id);

    if (!embedsFamily(options)) return plant;

    const [embedded = plant] = await embedFamilySummaries(
      [plant],
      this.familySummaryReader
    );

    return embedded;
  }
}
