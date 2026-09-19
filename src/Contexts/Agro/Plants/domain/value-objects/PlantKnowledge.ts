import type { PlantKnowledgeProps } from './interfaces/PlantKnowledgeProps.js';

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

  static empty(): PlantKnowledge {
    return new PlantKnowledge({});
  }
}
