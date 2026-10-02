import { patchField } from '../../../../../shared/domain/utils/patchField.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { PlantFloweringChanges } from '../entities/types/PlantPhenologyChanges.js';
import type { PlantPrimitives } from '../entities/types/PlantPrimitives.js';
import { PollinationType } from '../entities/types/PollinationType.js';

export type PollinationPrimitives = NonNullable<
  PlantPrimitives['phenology']['flowering']['pollination']
>;

export type PollinationChanges = NonNullable<
  PlantFloweringChanges['pollination']
>;

// Types carried by animals: only they have agents (bees, hummingbirds…).
const ANIMAL_TYPES: readonly PollinationType[] = [
  PollinationType.INSECT,
  PollinationType.BIRD,
  PollinationType.BAT
];

const PATH = 'phenology.flowering.pollination';

/**
 * The ways a plant is pollinated (tomato: self, helped by bumblebees). A
 * plant that is not pollinated (spores, sterile…) has no pollination.
 */
export class Pollination {
  readonly types: PollinationType[];
  readonly agents?: string[];

  constructor({ types, agents }: PollinationPrimitives) {
    Pollination.checkTypes(types);
    // An empty list of agents is no agents.
    const hasAgents = agents !== undefined && agents.length > 0;
    if (hasAgents && !Pollination.carriesAgents(types)) {
      throw new InvalidArgumentException(
        `${PATH}.agents need an insect, bird or bat type`
      );
    }
    this.types = [...types];
    if (hasAgents) this.agents = [...agents];
  }

  /** Starts a pollination from a patch: it must bring its types. */
  static start(changes: PollinationChanges): Pollination {
    if (changes.types === undefined) {
      throw new InvalidArgumentException(`${PATH}.types is required`);
    }
    const agents = changes.agents ?? undefined;
    return new Pollination({
      types: changes.types,
      ...(agents !== undefined && { agents })
    });
  }

  /**
   * `types` replaces the list. The agents are kept while an animal type
   * remains; `null` removes them.
   */
  update(changes: PollinationChanges): Pollination {
    const types = changes.types ?? this.types;
    const currentAgents = Pollination.carriesAgents(types)
      ? this.agents
      : undefined;
    const agents = patchField(changes.agents, currentAgents);

    return new Pollination({
      types,
      ...(agents !== undefined && { agents })
    });
  }

  toPrimitives(): PollinationPrimitives {
    return {
      types: [...this.types],
      ...(this.agents !== undefined && { agents: [...this.agents] })
    };
  }

  static fromPrimitives(primitives: PollinationPrimitives): Pollination {
    return new Pollination(primitives);
  }

  private static carriesAgents(types: readonly PollinationType[]): boolean {
    return types.some((type) => ANIMAL_TYPES.includes(type));
  }

  private static checkTypes(types: readonly PollinationType[]): void {
    if (types.length === 0) {
      throw new InvalidArgumentException(`${PATH}.types cannot be empty`);
    }
    if (new Set(types).size !== types.length) {
      throw new InvalidArgumentException(`${PATH}.types cannot repeat a type`);
    }
  }
}
