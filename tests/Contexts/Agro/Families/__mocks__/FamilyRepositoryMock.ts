/* eslint-disable @typescript-eslint/require-await */
import type { Family } from '../../../../../src/Contexts/Agro/Families/domain/entities/Family.js';
import type { FamilyRepository } from '../../../../../src/Contexts/Agro/Families/domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyPrimitives } from '../../../../../src/Contexts/Agro/Families/domain/types/FamilyPrimitives.js';
import { familyDomainMapper } from '../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class FamilyRepositoryMock
  extends BaseMongoCrudRepositoryMock<Family, FamilyPrimitives>
  implements FamilyRepository
{
  protected readonly findBySlugMock = jest.fn();
  async findBySlug(slug: string): Promise<Nullable<Family>> {
    this.findBySlugMock(slug);

    const family = Array.from(this.storage.values()).find(
      (f) => f.slug === slug
    );

    return family ? this.toDomain(this.toPrimitives(family)) : null;
  }

  protected toDomain(primitives: FamilyPrimitives): Family {
    return familyDomainMapper.fromPrimitives(primitives);
  }

  protected toPrimitives(entity: Family): FamilyPrimitives {
    return familyDomainMapper.toPrimitives(entity);
  }

  protected entityName(): string {
    return 'Family';
  }

  assertFindBySlugHasBeenCalledWith(slug: string) {
    expect(this.findBySlugMock).toHaveBeenCalledWith(slug);
  }
}
