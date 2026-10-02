import {
  mergePatchField,
  patchField
} from '../../../../../shared/domain/utils/patchField.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import type {
  PartialRange,
  RangePrimitives
} from '../../../../../shared/domain/value-objects/interfaces/index.js';
import { Range } from '../../../../../shared/domain/value-objects/Range.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type {
  PlantKnowledgeChanges,
  PropagationMethodChanges
} from '../entities/types/PlantKnowledgeChanges.js';
import type { PlantKnowledgePrimitives } from '../entities/types/PlantKnowledgePrimitives.js';
import type { PlantLightPrimitives } from '../entities/types/PlantLightPrimitives.js';
import type { PlantPropagationPrimitives } from '../entities/types/PlantPropagationPrimitives.js';
import type { Seasons } from '../entities/types/Seasons.js';
import type { PlantKnowledgeProps } from './interfaces/PlantKnowledgeProps.js';
import { RootSystem } from './RootSystem.js';
import { SoilProfile } from './SoilProfile.js';

const HOURS_PER_DAY = 24;

export class PlantKnowledge {
  private readonly props: PlantKnowledgeProps;

  constructor(props: PlantKnowledgeProps) {
    PlantKnowledge.checkSeasons(props);
    PlantKnowledge.checkPruningFrequencies(props);
    PlantKnowledge.checkLightHours(props);
    this.props = PlantKnowledge.withRequiredTexts(
      PlantKnowledge.withoutEmptyEcology(props)
    );
  }

  /** Hours of light a day: from 0 to 24. */
  private static checkLightHours(props: PlantKnowledgeProps): void {
    const hours = props.light?.hoursMin;
    if (hours !== undefined && !(hours >= 0 && hours <= HOURS_PER_DAY)) {
      throw new InvalidArgumentException(
        `knowledge.light.hoursMin must be between 0 and ${HOURS_PER_DAY}`
      );
    }
  }

  /** Required labels (types, frequencies…): trimmed and never blank. */
  private static withRequiredTexts(
    props: PlantKnowledgeProps
  ): PlantKnowledgeProps {
    const { watering, light, pruning, resources } = props;
    return {
      ...props,
      ...(watering !== undefined && {
        watering: {
          ...watering,
          frequency: requiredText(
            watering.frequency,
            'knowledge.watering.frequency'
          )
        }
      }),
      ...(light !== undefined && {
        light: {
          ...light,
          type: requiredText(light.type, 'knowledge.light.type')
        }
      }),
      ...(pruning !== undefined && {
        pruning: pruning.map((entry, index) => ({
          ...entry,
          type: requiredText(entry.type, `knowledge.pruning.${index}.type`),
          intensity: requiredText(
            entry.intensity,
            `knowledge.pruning.${index}.intensity`
          )
        }))
      }),
      ...(resources !== undefined && {
        resources: resources.map((resource, index) => ({
          ...resource,
          type: requiredText(resource.type, `knowledge.resources.${index}.type`)
        }))
      })
    };
  }

  /** Prunings per year: above zero (`0.5` is once every two years). */
  private static checkPruningFrequencies(props: PlantKnowledgeProps): void {
    props.pruning?.forEach((entry, index) => {
      if (!(entry.frequencyPerYear > 0)) {
        throw new InvalidArgumentException(
          `knowledge.pruning.${index}.frequencyPerYear must be greater than 0`
        );
      }
    });
  }

  /** A pruning entry or propagation method lists each season once. */
  private static checkSeasons(props: PlantKnowledgeProps): void {
    props.pruning?.forEach((entry, index) =>
      PlantKnowledge.checkUniqueSeasons(
        entry.seasons,
        `pruning.${index}.seasons`
      )
    );
    const methods = Object.entries(props.propagation?.methods ?? {});
    for (const [name, method] of methods) {
      PlantKnowledge.checkUniqueSeasons(
        method.seasons,
        `propagation.methods.${name}.seasons`
      );
    }
  }

  private static checkUniqueSeasons(
    seasons: readonly Seasons[] | undefined,
    field: string
  ): void {
    if (seasons !== undefined && new Set(seasons).size !== seasons.length) {
      throw new InvalidArgumentException(
        `knowledge.${field} cannot repeat a season`
      );
    }
  }

  /** An ecology left without fields (`strategicBenefits: null`) is removed. */
  private static withoutEmptyEcology(
    props: PlantKnowledgeProps
  ): PlantKnowledgeProps {
    if (props.ecology === undefined || Object.keys(props.ecology).length > 0) {
      return props;
    }
    const { ecology: _empty, ...rest } = props;
    return rest;
  }

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

  /** An absent field is kept; `null` removes an optional one. */
  update(changes: PlantKnowledgeChanges): PlantKnowledge {
    return new PlantKnowledge({
      ...this.mergeRequiredSections(changes),
      ...this.applyClearableSections(changes)
    });
  }

  /** Sections that are merged and can never be removed. */
  private mergeRequiredSections(
    changes: PlantKnowledgeChanges
  ): Pick<
    PlantKnowledgeProps,
    'soil' | 'rootSystem' | 'light' | 'propagation'
  > {
    const soil =
      changes.soil === undefined
        ? this.props.soil
        : this.updateSoil(changes.soil);
    const rootSystem =
      changes.rootSystem === undefined
        ? this.props.rootSystem
        : this.updateRootSystem(changes.rootSystem);
    const light =
      changes.light === undefined
        ? this.props.light
        : this.updateLight(changes.light);
    const propagation = this.updatePropagation(changes.propagation);

    // Optional in the props, since `PlantKnowledge.empty()` has none, so a
    // section still absent after the merge is left out, not set to undefined.
    return {
      ...(soil !== undefined && { soil }),
      ...(rootSystem !== undefined && { rootSystem }),
      ...(light !== undefined && { light }),
      ...(propagation !== undefined && { propagation })
    };
  }

  /** Optional sections, which `null` removes. */
  private applyClearableSections(
    changes: PlantKnowledgeChanges
  ): Pick<
    PlantKnowledgeProps,
    'watering' | 'ecology' | 'pruning' | 'resources' | 'notes'
  > {
    const watering = mergePatchField(
      changes.watering,
      this.props.watering,
      (change) => this.updateWatering(change)
    );
    const ecology = mergePatchField(
      changes.ecology,
      this.props.ecology,
      (change) => this.updateEcology(change)
    );
    const pruning = patchField(changes.pruning, this.props.pruning);
    const resources = patchField(changes.resources, this.props.resources);
    const notes = patchField(changes.notes, this.props.notes);

    return {
      ...(watering !== undefined && { watering }),
      ...(ecology !== undefined && { ecology }),
      ...(pruning !== undefined && { pruning }),
      ...(resources !== undefined && { resources }),
      ...(notes !== undefined && { notes })
    };
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
    const conditions = patchField(changes.conditions, current?.conditions);
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
    const preference = patchField(changes.preference, current?.preference);
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
    changes: PropagationMethodChanges,
    methodName: string
  ): RangePrimitives | undefined {
    return mergePatchField(
      changes.estimatedTimeWeeks,
      current?.estimatedTimeWeeks,
      (change, currentWeeks) =>
        this.buildRange(
          currentWeeks ? Range.fromPrimitives(currentWeeks) : undefined,
          change,
          `propagation.methods.${methodName}.estimatedTimeWeeks`
        ).toPrimitives()
    );
  }

  private buildPropagationMethod(
    methodName: string,
    methodChanges: PropagationMethodChanges,
    current: PlantPropagationPrimitives['methods'][string] | undefined
  ): PlantPropagationPrimitives['methods'][string] {
    const estimatedTimeWeeks = this.mergeEstimatedTimeWeeks(
      current,
      methodChanges,
      methodName
    );
    const seasons = patchField(methodChanges.seasons, current?.seasons);
    const bestPractices = patchField(
      methodChanges.bestPractices,
      current?.bestPractices
    );
    return {
      ...(seasons !== undefined && { seasons }),
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
    const nextMethods = new Map(Object.entries(currentMethods));

    for (const [key, method] of methodChanges) {
      // `null` removes the method.
      if (method === null) {
        nextMethods.delete(key);
        continue;
      }
      // Own keys only: a name like `constructor` must not read Object.prototype.
      const current = Object.hasOwn(currentMethods, key)
        ? currentMethods[key]
        : undefined;
      nextMethods.set(key, this.buildPropagationMethod(key, method, current));
    }

    return { methods: Object.fromEntries(nextMethods) };
  }

  /** Keeps the current value when the changes carry no field to apply. */
  private updateEcology(
    changes: NonNullable<PlantKnowledgeChanges['ecology']>
  ): PlantKnowledgeProps['ecology'] {
    if (changes.strategicBenefits === undefined) return this.props.ecology;

    const { strategicBenefits: _current, ...rest } = this.props.ecology ?? {};
    return {
      ...rest,
      ...(changes.strategicBenefits !== null && {
        strategicBenefits: changes.strategicBenefits
      })
    };
  }
}
