import type {
  PartialRange,
  RangePrimitives
} from '../../../../../shared/domain/value-objects/interfaces/index.js';
import { Range } from '../../../../../shared/domain/value-objects/Range.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { PlantKnowledgeChanges } from '../entities/types/PlantKnowledgeChanges.js';
import type { PlantKnowledgePrimitives } from '../entities/types/PlantKnowledgePrimitives.js';
import type { PlantLightPrimitives } from '../entities/types/PlantLightPrimitives.js';
import type { PlantPropagationPrimitives } from '../entities/types/PlantPropagationPrimitives.js';
import type { PlantKnowledgeProps } from './interfaces/PlantKnowledgeProps.js';
import { RootSystem } from './RootSystem.js';
import { SoilProfile } from './SoilProfile.js';

export class PlantKnowledge {
  constructor(private readonly props: PlantKnowledgeProps) {}

  get soil() {
    return this.props.soil;
  }

  get watering() {
    return this.props.watering;
  }

  get light() {
    return this.props.light;
  }

  get pruning() {
    return this.props.pruning;
  }

  get propagation() {
    return this.props.propagation;
  }

  get ecology() {
    return this.props.ecology;
  }

  get resources() {
    return this.props.resources;
  }

  get notes() {
    return this.props.notes;
  }

  get rootSystem() {
    return this.props.rootSystem;
  }

  private serializeWatering(): PlantKnowledgePrimitives['watering'] {
    if (!this.props.watering) return undefined;
    const w: NonNullable<PlantKnowledgePrimitives['watering']> = {
      frequency: this.props.watering.frequency
    };
    if (this.props.watering.conditions)
      w.conditions = this.props.watering.conditions;
    return w;
  }

  toPrimitives(): PlantKnowledgePrimitives {
    const result: PlantKnowledgePrimitives = {};

    const watering = this.serializeWatering();
    if (watering !== undefined) result.watering = watering;
    if (this.props.light) result.light = this.props.light;
    if (this.props.pruning) result.pruning = this.props.pruning;
    if (this.props.propagation) result.propagation = this.props.propagation;
    if (this.props.ecology) result.ecology = this.props.ecology;
    if (this.props.resources) result.resources = this.props.resources;
    if (this.props.notes) result.notes = this.props.notes;
    if (this.props.soil) result.soil = this.props.soil.toPrimitives();
    if (this.props.rootSystem)
      result.rootSystem = this.props.rootSystem.toPrimitives();

    return result;
  }

  private static buildWatering(
    primitives: PlantKnowledgePrimitives
  ): PlantKnowledgeProps['watering'] {
    if (!primitives.watering) return undefined;
    const w: NonNullable<PlantKnowledgeProps['watering']> = {
      frequency: primitives.watering.frequency
    };
    if (primitives.watering.conditions)
      w.conditions = primitives.watering.conditions;
    return w;
  }

  static fromPrimitives(primitives: PlantKnowledgePrimitives): PlantKnowledge {
    const props: PlantKnowledgeProps = {};

    if (primitives.soil)
      props.soil = SoilProfile.fromPrimitives(primitives.soil);
    if (primitives.rootSystem)
      props.rootSystem = RootSystem.fromPrimitives(primitives.rootSystem);
    const watering = PlantKnowledge.buildWatering(primitives);
    if (watering !== undefined) props.watering = watering;
    if (primitives.light) props.light = primitives.light;
    if (primitives.pruning) props.pruning = primitives.pruning;
    if (primitives.propagation) props.propagation = primitives.propagation;
    if (primitives.ecology) props.ecology = primitives.ecology;
    if (primitives.resources) props.resources = primitives.resources;
    if (primitives.notes) props.notes = primitives.notes;

    return new PlantKnowledge(props);
  }

  update(changes: PlantKnowledgeChanges): PlantKnowledge {
    const next: PlantKnowledgeProps = { ...this.props };

    if (changes.soil !== undefined) {
      next.soil = this.updateSoil(changes.soil);
    }
    if (changes.rootSystem !== undefined) {
      next.rootSystem = this.updateRootSystem(changes.rootSystem);
    }
    if (changes.watering !== undefined) {
      next.watering = this.updateWatering(changes.watering);
    }
    if (changes.light !== undefined) {
      next.light = this.updateLight(changes.light);
    }
    const propagation = this.updatePropagation(changes.propagation);
    if (propagation !== undefined) next.propagation = propagation;
    const ecology = this.updateEcology(changes.ecology);
    if (ecology !== undefined) next.ecology = ecology;
    if (changes.pruning !== undefined) next.pruning = changes.pruning;
    if (changes.resources !== undefined) next.resources = changes.resources;
    if (changes.notes !== undefined) next.notes = changes.notes;

    return new PlantKnowledge(next);
  }

  static empty(): PlantKnowledge {
    return new PlantKnowledge({});
  }

  /** Merges into the current range, or builds a full one when absent. */
  private buildRange(
    current: Range | undefined,
    changes: PartialRange | undefined,
    field: string
  ): Range {
    if (current) return current.with(changes ?? {});
    return Range.fromPartial(changes ?? {}, `knowledge.${field}`);
  }

  private requireValue<T>(value: T | undefined, field: string): T {
    if (value === undefined) {
      throw new InvalidArgumentException(`knowledge.${field} is required`);
    }
    return value;
  }

  private updateSoil(
    changes: NonNullable<PlantKnowledgeChanges['soil']>
  ): SoilProfile {
    return new SoilProfile({
      ph: this.buildRange(this.props.soil?.ph, changes.ph, 'soil.ph'),
      availableDepthCm: this.buildRange(
        this.props.soil?.availableDepthCm,
        changes.availableDepthCm,
        'soil.availableDepthCm'
      )
    });
  }

  private updateRootSystem(
    changes: NonNullable<PlantKnowledgeChanges['rootSystem']>
  ): RootSystem {
    const type = this.requireValue(
      changes.type ?? this.props.rootSystem?.type,
      'rootSystem.type'
    );
    const depthCm = this.buildRange(
      this.props.rootSystem?.depthCm,
      changes.depthCm,
      'rootSystem.depthCm'
    );
    const spreadCm = this.buildRange(
      this.props.rootSystem?.spreadCm,
      changes.spreadCm,
      'rootSystem.spreadCm'
    );
    return new RootSystem(type, depthCm, spreadCm);
  }

  private updateWatering(
    changes: NonNullable<PlantKnowledgeChanges['watering']>
  ): NonNullable<PlantKnowledgeProps['watering']> {
    const current = this.props.watering;
    const conditions = changes.conditions ?? current?.conditions;
    return {
      frequency: this.requireValue(
        changes.frequency ?? current?.frequency,
        'watering.frequency'
      ),
      ...(conditions !== undefined && { conditions })
    };
  }

  private updateLight(
    changes: NonNullable<PlantKnowledgeChanges['light']>
  ): PlantLightPrimitives {
    const current = this.props.light;
    const preference = changes.preference ?? current?.preference;
    return {
      hoursMin: this.requireValue(
        changes.hoursMin ?? current?.hoursMin,
        'light.hoursMin'
      ),
      type: this.requireValue(changes.type ?? current?.type, 'light.type'),
      ...(preference !== undefined && { preference })
    };
  }

  private mergeEstimatedTimeWeeks(
    current: PlantPropagationPrimitives['methods'][string] | undefined,
    changes: { estimatedTimeWeeks?: PartialRange },
    methodName: string
  ): RangePrimitives | undefined {
    if (!changes.estimatedTimeWeeks) return current?.estimatedTimeWeeks;
    const currentRange = current?.estimatedTimeWeeks
      ? Range.fromPrimitives(current.estimatedTimeWeeks)
      : undefined;
    return this.buildRange(
      currentRange,
      changes.estimatedTimeWeeks,
      `propagation.methods.${methodName}.estimatedTimeWeeks`
    ).toPrimitives();
  }

  private buildPropagationMethod(
    methodName: string,
    methodChanges: NonNullable<
      NonNullable<PlantKnowledgeChanges['propagation']>['methods']
    >[string],
    current: PlantPropagationPrimitives['methods'][string] | undefined
  ): PlantPropagationPrimitives['methods'][string] {
    const estimatedTimeWeeks = this.mergeEstimatedTimeWeeks(
      current,
      methodChanges,
      methodName
    );
    const season =
      methodChanges.season !== undefined
        ? methodChanges.season
        : current?.season;
    const bestPractices =
      methodChanges.bestPractices !== undefined
        ? methodChanges.bestPractices
        : current?.bestPractices;
    return {
      ...(season !== undefined && { season }),
      ...(estimatedTimeWeeks !== undefined && { estimatedTimeWeeks }),
      ...(bestPractices !== undefined && { bestPractices })
    };
  }

  /** Keeps the current value when the changes carry no method to apply. */
  private updatePropagation(
    changes: PlantKnowledgeChanges['propagation']
  ): PlantPropagationPrimitives | undefined {
    const methodChanges = Object.entries(changes?.methods ?? {});
    if (!methodChanges.length) return this.props.propagation;

    const currentMethods = this.props.propagation?.methods ?? {};
    const nextMethods = { ...currentMethods };

    for (const [key, method] of methodChanges) {
      // Own keys only: a name like `constructor` must not read Object.prototype.
      const current = Object.hasOwn(currentMethods, key)
        ? currentMethods[key]
        : undefined;
      nextMethods[key] = this.buildPropagationMethod(key, method, current);
    }

    return { methods: nextMethods };
  }

  /** Keeps the current value when the changes carry no field to apply. */
  private updateEcology(
    changes: PlantKnowledgeChanges['ecology']
  ): PlantKnowledgeProps['ecology'] {
    if (changes?.strategicBenefits === undefined) return this.props.ecology;

    return {
      ...(this.props.ecology ?? {}),
      strategicBenefits: changes.strategicBenefits
    };
  }
}
