import { plantDomainMapper } from '../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { toPlantResponse } from '../../../../../src/Contexts/Agro/Plants/mappers/plantResponseMapper.js';
import { PlantFactory } from '../domain/mothers/PlantFactory.js';
import { PlantKnowledgeBuilder } from '../domain/mothers/PlantKnowledgeBuilder.js';
import { PlantResourceBuilder } from '../domain/mothers/PlantResourceBuilder.js';

describe('toPlantResponse', () => {
  it('sends the first image resource as image', () => {
    const image = PlantResourceBuilder.image();
    const plant = PlantFactory.tomato({
      knowledge: PlantKnowledgeBuilder.withResources([
        PlantResourceBuilder.video(),
        image,
        PlantResourceBuilder.image()
      ])
    });

    expect(toPlantResponse(plant).image).toStrictEqual({
      url: image.url,
      title: image.title,
      source: image.source
    });
  });

  it('leaves the plant primitives without image', () => {
    const plant = PlantFactory.tomato({
      knowledge: PlantKnowledgeBuilder.withResources([
        PlantResourceBuilder.image()
      ])
    });

    expect(plantDomainMapper.toPrimitives(plant)).not.toHaveProperty('image');
  });
});
