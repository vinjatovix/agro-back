import { performance } from 'node:perf_hooks';

import { plantResponseSchema } from '../../src/apps/agroApi/controllers/Plants/responseSchemas.js';
import { checkPage } from '../../src/apps/agroApi/shared/responseValidation.js';
import { toPlantReadView } from '../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/plantReadViewMapper.js';
import type { MongoPlantDocument } from '../../src/Contexts/Agro/Plants/infrastructure/persistence/types/MongoPlantDocument.js';
import { plantDomainMapper } from '../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { plantPersistenceMapper } from '../../src/Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import type { AppLogger } from '../../src/Contexts/shared/plugins/logger.plugin.js';
import { PlantFactory } from '../../tests/Contexts/Agro/Plants/domain/mothers/PlantFactory.js';
import { PlantKnowledgeBuilder } from '../../tests/Contexts/Agro/Plants/domain/mothers/PlantKnowledgeBuilder.js';

// Per-item cost outside the database of one plant page: the old path (stored
// document → aggregate → primitives) against the read bypass (stored document
// → read view → output check). Gate: new median per item ≤ 70% of old.

const PAGE_SIZE = 100;
const ROUNDS = 200;
const WARM_UP_ROUNDS = 50;
const MAX_RATIO = 0.7;

const silentLogger: AppLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

const documents: MongoPlantDocument[] = Array.from(
  { length: PAGE_SIZE },
  (_, index) =>
    plantPersistenceMapper.toMongoDocument(
      index % 2 === 0
        ? PlantFactory.full({ knowledge: PlantKnowledgeBuilder.full() })
        : PlantFactory.random()
    )
);

const pagination = {
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
  totalItems: PAGE_SIZE
};

const oldPath = (): unknown =>
  documents.map((document) =>
    plantDomainMapper.toPrimitives(
      plantPersistenceMapper.fromMongoDocument(document)
    )
  );

const newPath = (): unknown =>
  checkPage(
    plantResponseSchema,
    { data: documents.map(toPlantReadView), pagination },
    { resource: 'Plant', logger: silentLogger }
  );

const time = (run: () => unknown): number[] => {
  for (let round = 0; round < WARM_UP_ROUNDS; round++) run();

  return Array.from({ length: ROUNDS }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  });
};

const percentile = (samples: number[], p: number): number => {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);

  return sorted[Math.max(0, index)] ?? 0;
};

const summary = (
  name: string,
  samples: number[]
): { name: string; median: number } => {
  const median = percentile(samples, 0.5);
  const p95 = percentile(samples, 0.95);
  const ms = (value: number): string => `${value.toFixed(3)} ms`;
  const us = (value: number): string =>
    `${((value / PAGE_SIZE) * 1000).toFixed(2)} µs`;

  console.log(
    `${name}: page median ${ms(median)}, p95 ${ms(p95)} | ` +
      `per item median ${us(median)}, p95 ${us(p95)}`
  );

  return { name, median };
};

console.log(
  `Node ${process.version}, ${PAGE_SIZE} plants per page, ${ROUNDS} rounds`
);

const old = summary('old (aggregate round-trip)', time(oldPath));
const read = summary('new (read view + output check)', time(newPath));
const ratio = read.median / old.median;

console.log(
  `ratio new/old: ${(ratio * 100).toFixed(1)}% (gate ≤ ${MAX_RATIO * 100}%)`
);

if (ratio > MAX_RATIO) {
  console.error('FAIL: the read path is not at least 30% cheaper per item');
  process.exit(1);
}

console.log('PASS');
