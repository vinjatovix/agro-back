import type { DeepPartial } from '../../../../../shared/domain/patch/DeepPartial.js';
import {
  MonthSet,
  Range
} from '../../../../../shared/domain/value-objects/index.js';
import { Metadata, Uuid } from '../../../../shared/domain/valueObject/index.js';
import type { CreatePlantDto } from '../application/useCases/interfaces/CreatePlantDto.js';
import type { UpdatePlantDto } from '../application/useCases/interfaces/UpdatePlantDto.js';
import { Plant } from '../domain/entities/Plant.js';
import type {
  PlantKnowledgePrimitives,
  PlantPrimitives,
  PlantProps
} from '../domain/entities/types/index.js';
import {
  PlantKnowledge,
  PlantLifecycle,
  PlantSowing
} from '../domain/value-objects/index.js';
import { plantKnowledgeMapper } from './plantKnowledgeMapper.js';

export const plantMapper = {
  toPrimitives(plant: Plant): PlantPrimitives {
    const phenology: PlantPrimitives['phenology'] = {
      sowing: plant.phenology.sowing.toPrimitives(),
      flowering: {
        months: plant.phenology.flowering.months.toArray()
      },
      harvest: {
        months: plant.phenology.harvest.months.toArray()
      }
    };

    if (plant.phenology.flowering.pollination) {
      phenology.flowering.pollination = plant.phenology.flowering.pollination;
    }

    if (plant.phenology.harvest.description) {
      phenology.harvest.description = plant.phenology.harvest.description;
    }

    const knowledge = plantKnowledgeMapper.toPrimitives(
      plant.knowledge ?? PlantKnowledge.empty()
    );
    const result: PlantPrimitives = {
      id: plant.id.value,
      identity: plant.identity,
      traits: {
        lifecycle: plant.traits.lifecycle.getValue(),
        size: {
          height: plant.traits.size.height.toPrimitives(),
          spread: plant.traits.size.spread.toPrimitives()
        },
        spacingCm: plant.traits.spacingCm.toPrimitives()
      },
      phenology,
      knowledge,
      metadata: plant.metadata.toPrimitives(),
      status: plant.status,
      deletedAt: plant.deletedAt ? plant.deletedAt.toISOString() : null
    };

    return result;
  },

  fromPrimitives(primitives: PlantPrimitives): Plant {
    const flowering = {
      months: MonthSet.fromArray(primitives.phenology.flowering.months),
      ...(primitives.phenology.flowering.pollination && {
        pollination: primitives.phenology.flowering.pollination
      })
    };

    const harvest = {
      months: MonthSet.fromArray(primitives.phenology.harvest.months),
      ...(primitives.phenology.harvest.description && {
        description: primitives.phenology.harvest.description
      })
    };

    const phenology = {
      sowing: PlantSowing.fromPrimitives(primitives.phenology.sowing),
      flowering,
      harvest
    };

    const props: PlantProps = {
      id: new Uuid(primitives.id),
      identity: primitives.identity,
      traits: {
        lifecycle: PlantLifecycle.from(primitives.traits.lifecycle),
        size: {
          height: Range.fromPrimitives(primitives.traits.size.height),
          spread: Range.fromPrimitives(primitives.traits.size.spread)
        },
        spacingCm: Range.fromPrimitives(primitives.traits.spacingCm)
      },
      phenology,
      knowledge: this.mapKnowledge(primitives.knowledge),
      metadata: Metadata.fromPrimitives(primitives.metadata),
      status: primitives.status
    };

    if (primitives.deletedAt) {
      props.deletedAt = new Date(primitives.deletedAt);
    }

    return new Plant(props);
  },

  mapKnowledge(knowledge?: PlantKnowledgePrimitives | null): PlantKnowledge {
    if (!knowledge || Object.keys(knowledge).length === 0) {
      return PlantKnowledge.empty();
    }

    return plantKnowledgeMapper.fromPrimitives(knowledge);
  },

  fromCreateDtoToDomain(dto: CreatePlantDto, user = 'system'): Plant {
    const phenology = {
      sowing: PlantSowing.fromPrimitives(dto.phenology.sowing),

      flowering: {
        months: MonthSet.fromArray(dto.phenology.flowering.months),
        ...(dto.phenology.flowering.pollination && {
          pollination: dto.phenology.flowering.pollination
        })
      },

      harvest: {
        months: MonthSet.fromArray(dto.phenology.harvest.months),
        ...(dto.phenology.harvest.description && {
          description: dto.phenology.harvest.description
        })
      }
    };

    const knowledge = dto.knowledge
      ? plantKnowledgeMapper.fromPrimitives(dto.knowledge)
      : PlantKnowledge.empty();

    const props: PlantProps = {
      id: new Uuid(dto.id),

      identity: dto.identity,

      traits: {
        lifecycle: PlantLifecycle.from(dto.traits.lifecycle),
        size: {
          height: Range.fromPrimitives(dto.traits.size.height),
          spread: Range.fromPrimitives(dto.traits.size.spread)
        },
        spacingCm: Range.fromPrimitives(dto.traits.spacingCm)
      },

      phenology,

      knowledge,

      metadata: Metadata.create(user)
    };

    return Plant.create(props);
  },

  fromUpdateDtoToPrimitivesPatch(
    dto: UpdatePlantDto
  ): DeepPartial<PlantPrimitives> {
    const patch: DeepPartial<PlantPrimitives> = {};
    if (dto.identity) {
      patch.identity = {
        ...(dto.identity.name && {
          name: {
            ...(dto.identity.name.primary !== undefined && {
              primary: dto.identity.name.primary
            }),
            ...(dto.identity.name.aliases && {
              aliases: dto.identity.name.aliases
            })
          }
        }),
        ...(dto.identity.scientificName !== undefined && {
          scientificName: dto.identity.scientificName
        }),
        ...(dto.identity.familyId && {
          familyId: dto.identity.familyId
        })
      };
    }

    if (dto.traits) {
      patch.traits = {
        ...(dto.traits.lifecycle && {
          lifecycle: dto.traits.lifecycle
        }),
        ...(dto.traits.spacingCm && {
          spacingCm: dto.traits.spacingCm
        }),
        ...(dto.traits.size && {
          size: {
            ...(dto.traits.size.height && {
              height: dto.traits.size.height
            }),
            ...(dto.traits.size.spread && {
              spread: dto.traits.size.spread
            })
          }
        })
      };
    }

    if (dto.phenology?.sowing) {
      patch.phenology = {
        sowing: {
          ...(dto.phenology.sowing.months && {
            months: dto.phenology.sowing.months
          }),
          ...(dto.phenology.sowing.seedsPerHole && {
            seedsPerHole: dto.phenology.sowing.seedsPerHole
          }),
          ...(dto.phenology.sowing.germinationDays && {
            germinationDays: dto.phenology.sowing.germinationDays
          }),
          ...(dto.phenology.sowing.methods && {
            methods: {
              ...(dto.phenology.sowing.methods.direct && {
                direct: {
                  depthCm: dto.phenology.sowing.methods.direct.depthCm
                }
              }),
              ...(dto.phenology.sowing.methods.starter && {
                starter: {
                  depthCm: dto.phenology.sowing.methods.starter.depthCm
                }
              })
            }
          })
        }
      };
    }

    if (dto.knowledge) {
      patch.knowledge = dto.knowledge;
    }

    return patch;
  }
};
