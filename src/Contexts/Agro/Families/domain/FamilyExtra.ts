import { requiredText } from '../../../../shared/domain/utils/requiredText.js';
import { uniqueTextList } from '../../../../shared/domain/utils/uniqueTextList.js';
import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';
import type { FamilyExtraPrimitives } from './types/FamilyExtraPrimitives.js';

const PATH = 'Family.extra';

const extraText = (value: unknown, key: string): string => {
  if (typeof value !== 'string') {
    throw new InvalidArgumentException(`${PATH}.${key} must be a text`);
  }
  return requiredText(value, `${PATH}.${key}`);
};

const speciesCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new InvalidArgumentException(
      `${PATH}.speciesCount must be an integer greater than 0`
    );
  }
  return value;
};

const subfamilies = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new InvalidArgumentException(`${PATH}.subfamilies must be an array`);
  }
  return uniqueTextList(value, `${PATH}.subfamilies`);
};

/**
 * Normalised taxonomy details of a family: texts trimmed and never blank,
 * `subfamilies` without blanks or repeats, `speciesCount` a positive integer.
 * An `extra` without keys has a single representation: absent (`undefined`).
 */
export const familyExtra = (
  extra?: FamilyExtraPrimitives
): FamilyExtraPrimitives | undefined => {
  if (extra === undefined) return undefined;
  if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) {
    throw new InvalidArgumentException(`${PATH} must be an object`);
  }

  const result: FamilyExtraPrimitives = {};
  if (extra.order !== undefined) result.order = extraText(extra.order, 'order');
  if (extra.distribution !== undefined)
    result.distribution = extraText(extra.distribution, 'distribution');
  if (extra.speciesCount !== undefined)
    result.speciesCount = speciesCount(extra.speciesCount);
  if (extra.subfamilies !== undefined)
    result.subfamilies = subfamilies(extra.subfamilies);

  return Object.keys(result).length ? result : undefined;
};
