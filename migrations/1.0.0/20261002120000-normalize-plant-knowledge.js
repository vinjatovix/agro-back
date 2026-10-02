// Brings stored plants in line with the Plant model:
// - `season` (one value, sometimes a range or an event) becomes `seasons`, a
//   list of the four seasons, in pruning entries and propagation methods;
// - propagation method names become camelCase (`leaf_cutting` → `leafCutting`);
// - a pollination becomes `{ types, agents? }`: a bare string or a single
//   `type` turns into a list of one, and an empty list of agents is removed;
// - agents that name a type or a mechanism, kept there while a plant had a
//   single type, are translated with `AGENT_MEANINGS`: "abejas" adds
//   `insect` and stays, "viento" adds `wind` and leaves, "vibración" leaves;
// - `none` and `spore` are not ways of pollinating: that pollination is
//   removed. Horsetails (and any `spore` plant) get a `spores` propagation
//   method instead, in the seasons of their spore-bearing stems (stored as
//   their flowering months, which are kept);
// - a `null` pollination and a blank or `null` harvest description are
//   removed: both are optional, and a description is never blank;
// - an empty `ecology` (`{}`) is removed: the Plant model leaves it out;
// - the resources listed in `RESOURCE_TYPE_FIXES`, stored without a `type`,
//   get the one their source shows;
// - a plant without `status` gets `ACTIVE`;
// - no `null` is written: in what it rewrites, a `null` field or list item is
//   removed, since `null` only means "absent" (an agent list stored as `null`
//   would otherwise reach the Plant model and fail to load).
// It also checks the shapes and values the Plant model takes for granted when
// it loads a plant, which the API contract publishes too, and stops on
// anything it cannot fix: a
// pollination type outside the list or repeated, agents without an insect,
// bird or bat type, a missing or blank required label (primary and scientific
// name, family, root system, light and resource type, watering frequency,
// pruning type and intensity), light hours outside 0–24, a resource URL that is not `http(s)`,
// or a pruning entry that is not an object with `seasons` and a
// `frequencyPerYear` above zero. The contract's size limits (text length,
// list items) are request limits and are not checked here.
// Every changed plant gets `version + 1` and its update metadata, since its
// representation changes. Seasons are stored for the northern hemisphere; the
// frontend shifts them for the southern one.

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

const SEASON_VALUES = {
  spring: ['spring'],
  summer: ['summer'],
  autumn: ['autumn'],
  winter: ['winter'],
  spring_to_summer: ['spring', 'summer'],
  spring_to_autumn: ['spring', 'summer', 'autumn'],
  autumn_to_early_spring: ['autumn', 'winter', 'spring'],
  year_round: SEASONS
};

// "After <event>": the season of the month that follows the event.
const EVENT_SEASONS = {
  'after flowering': 'flowering',
  'after harvest': 'harvest'
};

const POLLINATION_TYPES = ['insect', 'wind', 'self', 'water', 'bird', 'bat'];

// Types carried by animals: only they have agents.
const ANIMAL_POLLINATION_TYPES = ['insect', 'bird', 'bat'];

// What a stored agent says about the pollination: the type it adds, and
// whether it stays as an agent (an animal) or leaves (a type or a mechanism).
// Agents not listed stay as they are.
const AGENT_MEANINGS = {
  abejas: { type: 'insect', keep: true },
  abejorros: { type: 'insect', keep: true },
  mariposas: { type: 'insect', keep: true },
  moscas: { type: 'insect', keep: true },
  trips: { type: 'insect', keep: true },
  insectos: { type: 'insect', keep: false },
  insect: { type: 'insect', keep: false },
  viento: { type: 'wind', keep: false },
  autopolinización: { type: 'self', keep: false },
  vibración: { keep: false },
  'dispersión explosiva del polen': { keep: false }
};

// Stored as pollination types, though they are not ways of pollinating.
const NOT_POLLINATION = ['none', 'spore'];

const CAMEL_CASE = /^[a-z][a-zA-Z]*$/;

const HTTP_URL = /^https?:\/\//i;

const HOURS_PER_DAY = 24;

// Resources stored without a `type`, by plant slug and URL. Their type is not
// guessed: it is the one their source shows (a journal article).
const RESOURCE_TYPE_FIXES = {
  'backhousia-myrtifolia': {
    'https://phcogcommn.org/content/103': 'article'
  }
};

const MIGRATION_USER = 'system';

const BATCH_SIZE = 500;

const monthSeason = (month) => {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const fail = (plant, message) => {
  throw new Error(`plant ${plant.slug ?? plant._id}: ${message}`);
};

// Plants written by someone else between the read and the write: running the
// migration again picks them up.
export class PlantsChangedWhileMigratingError extends Error {
  constructor(count) {
    super(`${count} plants changed while migrating: run it again`);
    this.name = 'PlantsChangedWhileMigratingError';
    this.count = count;
  }
}

// The month after the end of one contiguous run of months (December wraps
// to January). Several runs, or the whole year, have no single end.
const monthAfter = (plant, months) => {
  const set = new Set(months);
  const ends = [...set].filter((month) => !set.has((month % 12) + 1));
  if (ends.length !== 1) {
    fail(plant, `cannot place a season after months [${months.join(', ')}]`);
  }
  return (ends[0] % 12) + 1;
};

const toSeasons = (plant, season) => {
  if (Object.hasOwn(SEASON_VALUES, season)) return SEASON_VALUES[season];

  if (Object.hasOwn(EVENT_SEASONS, season)) {
    const months = plant.phenology?.[EVENT_SEASONS[season]]?.months ?? [];
    return [monthSeason(monthAfter(plant, months))];
  }

  return fail(plant, `unknown season "${season}"`);
};

const withSeasons = (plant, entry) => {
  if (entry === null || typeof entry !== 'object' || !('season' in entry)) {
    return entry;
  }
  const { season, ...rest } = entry;
  return { ...rest, seasons: toSeasons(plant, season) };
};

const toCamelCase = (plant, name) => {
  const [first = '', ...rest] = name.split(/[\s_-]+/).filter(Boolean);
  const camel =
    first.toLowerCase() +
    rest
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  if (!CAMEL_CASE.test(camel)) {
    fail(plant, `cannot turn propagation method "${name}" into camelCase`);
  }
  return camel;
};

const normalizeMethods = (plant, methods) => {
  const next = {};
  for (const [name, method] of Object.entries(methods)) {
    const key = CAMEL_CASE.test(name) ? name : toCamelCase(plant, name);
    if (Object.hasOwn(next, key)) {
      fail(plant, `propagation method "${name}" collides with "${key}"`);
    }
    next[key] = withSeasons(plant, method);
  }
  return next;
};

// Horsetails (Equisetum) reproduce by spores.
const SPORE_GENERA = ['equisetum'];

const genusOf = (plant) =>
  (plant.identity?.scientificName ?? '').trim().toLowerCase().split(/\s+/)[0];

const checkPollination = (plant, { types, agents }) => {
  if (!Array.isArray(types) || types.length === 0) {
    fail(plant, 'pollination without types');
  }
  for (const type of types) {
    if (!POLLINATION_TYPES.includes(type)) {
      fail(plant, `unknown pollination "${type}"`);
    }
  }
  if (new Set(types).size !== types.length) {
    fail(plant, `repeated pollination types [${types.join(', ')}]`);
  }
  if (
    agents !== undefined &&
    !types.some((type) => ANIMAL_POLLINATION_TYPES.includes(type))
  ) {
    fail(plant, `pollination agents without an insect, bird or bat type`);
  }
};

const toPollinationTypes = (plant, pollination) => {
  if (typeof pollination === 'string') return { types: [pollination] };
  if (pollination === null || typeof pollination !== 'object') {
    fail(plant, `unknown pollination "${pollination}"`);
  }
  if (!('type' in pollination)) return pollination;
  const { type, ...rest } = pollination;
  return { types: [type], ...rest };
};

const meaningOf = (agent) => {
  const key = typeof agent === 'string' ? agent.trim().toLowerCase() : '';
  return Object.hasOwn(AGENT_MEANINGS, key) ? AGENT_MEANINGS[key] : undefined;
};

const withAgentTypes = (pollination) => {
  if (!Array.isArray(pollination.types) || !Array.isArray(pollination.agents)) {
    return pollination;
  }
  const types = [...pollination.types];
  const agents = [];
  for (const agent of pollination.agents) {
    const meaning = meaningOf(agent);
    if (meaning?.type !== undefined && !types.includes(meaning.type)) {
      types.push(meaning.type);
    }
    if (meaning === undefined || meaning.keep) agents.push(agent);
  }
  return { ...pollination, types, agents };
};

const withoutEmptyAgents = (pollination) => {
  if (!Array.isArray(pollination.agents) || pollination.agents.length > 0) {
    return pollination;
  }
  const rest = { ...pollination };
  delete rest.agents;
  return rest;
};

const pollinationTypesOf = (plant) => {
  const pollination = plant.phenology?.flowering?.pollination;
  if (pollination === undefined || pollination === null) return [];
  return toPollinationTypes(plant, pollination).types ?? [];
};

const reproducesBySpores = (plant) =>
  SPORE_GENERA.includes(genusOf(plant)) ||
  pollinationTypesOf(plant).includes('spore');

// `undefined`: the pollination is removed.
const normalizePollination = (plant, pollination) => {
  if (reproducesBySpores(plant)) return undefined;
  const next = withoutEmptyAgents(
    withAgentTypes(toPollinationTypes(plant, pollination))
  );
  if (next.types?.some((type) => NOT_POLLINATION.includes(type))) {
    return undefined;
  }
  checkPollination(plant, next);
  return JSON.stringify(next) === JSON.stringify(pollination)
    ? pollination
    : next;
};

// The seasons of the given months, in calendar order of the seasons.
const seasonsOf = (months) => {
  const seasons = new Set(months.map(monthSeason));
  return SEASONS.filter((season) => seasons.has(season));
};

const sporesMethod = (plant) => {
  const seasons = seasonsOf(plant.phenology?.flowering?.months ?? []);
  return seasons.length > 0 ? { seasons } : {};
};

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isPlainObject = (value) =>
  isRecord(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

// `null` (and `undefined`, which the driver writes as `null`) only means
// "absent": the field or list item is removed. Plain values only, so BSON
// types (ids, dates) are kept as they are.
const withoutNulls = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map(withoutNulls);
  }
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, field]) => field !== null && field !== undefined)
      .map(([key, field]) => [key, withoutNulls(field)])
  );
};

const isBlank = (value) => typeof value === 'string' && value.trim() === '';

const isRequiredText = (value) => typeof value === 'string' && !isBlank(value);

const checkRequiredText = (plant, value, label) => {
  if (!isRequiredText(value)) fail(plant, `missing or blank ${label}`);
};

const withResourceTypes = (plant, resources) => {
  const fixes = Object.hasOwn(RESOURCE_TYPE_FIXES, plant.slug)
    ? RESOURCE_TYPE_FIXES[plant.slug]
    : {};
  return resources.map((resource) =>
    isRecord(resource) &&
    resource.type === undefined &&
    Object.hasOwn(fixes, resource.url)
      ? { ...resource, type: fixes[resource.url] }
      : resource
  );
};

// Values the migration cannot fix without inventing data: they stop it.
// `resources` are the ones `withResourceTypes` returns.
const checkInvariants = (plant, resources) => {
  const { name, scientificName, family } = plant.identity ?? {};
  checkRequiredText(plant, name?.primary, 'primary name');
  checkRequiredText(plant, scientificName, 'scientific name');
  checkRequiredText(plant, family, 'family');
  const { rootSystem, watering, light } = plant.knowledge ?? {};
  if (rootSystem !== undefined) {
    checkRequiredText(plant, rootSystem?.type, 'root system type');
  }
  if (watering !== undefined) {
    checkRequiredText(plant, watering?.frequency, 'watering frequency');
  }
  if (light !== undefined) {
    checkRequiredText(plant, light?.type, 'light type');
    const hours = light?.hoursMin;
    if (typeof hours !== 'number' || !(hours >= 0 && hours <= HOURS_PER_DAY)) {
      fail(plant, `light hoursMin "${hours}" is not between 0 and 24`);
    }
  }
  resources.forEach((resource, index) => {
    checkRequiredText(plant, resource?.type, `resource ${index} type`);
    if (typeof resource?.url !== 'string' || !HTTP_URL.test(resource.url)) {
      fail(plant, `resource URL "${resource?.url}" is not http(s)`);
    }
  });
};

// After `withSeasons`: an entry the Plant model can load and the contract
// publishes (`PruningEntry`).
const checkPruningEntry = (plant, entry, index) => {
  if (!isRecord(entry)) {
    fail(plant, `pruning entry ${index} is not an object`);
  }
  const { type, intensity, seasons, frequencyPerYear } = entry;
  checkRequiredText(plant, type, `pruning entry ${index} type`);
  checkRequiredText(plant, intensity, `pruning entry ${index} intensity`);
  if (!Array.isArray(seasons) || seasons.length === 0) {
    fail(plant, `pruning entry ${index} without seasons`);
  }
  if (new Set(seasons).size !== seasons.length) {
    fail(plant, `pruning entry ${index} repeats a season`);
  }
  if (typeof frequencyPerYear !== 'number' || !(frequencyPerYear > 0)) {
    fail(
      plant,
      `pruning entry ${index} frequencyPerYear "${frequencyPerYear}" is not above zero`
    );
  }
};

// Every rewritten value goes through here, so the migration never writes a
// `null`.
const setIfChanged = (set, path, current, next) => {
  const value = withoutNulls(next);
  if (JSON.stringify(value) !== JSON.stringify(current)) set[path] = value;
};

const changesFor = (plant) => {
  const storedResources = plant.knowledge?.resources;
  const resources = Array.isArray(storedResources)
    ? withResourceTypes(plant, storedResources)
    : [];
  checkInvariants(plant, resources);

  const set = {};
  const unset = {};

  if (Array.isArray(storedResources)) {
    setIfChanged(set, 'knowledge.resources', storedResources, resources);
  }

  const pruning = plant.knowledge?.pruning;
  if (Array.isArray(pruning)) {
    const next = pruning.map((entry) => withSeasons(plant, entry));
    next.forEach((entry, index) => checkPruningEntry(plant, entry, index));
    setIfChanged(set, 'knowledge.pruning', pruning, next);
  }

  const methods = plant.knowledge?.propagation?.methods;
  const hasMethods = methods !== null && typeof methods === 'object';
  const nextMethods = hasMethods ? normalizeMethods(plant, methods) : {};
  if (reproducesBySpores(plant) && !Object.hasOwn(nextMethods, 'spores')) {
    nextMethods.spores = sporesMethod(plant);
  }
  if (hasMethods || Object.keys(nextMethods).length > 0) {
    setIfChanged(
      set,
      'knowledge.propagation.methods',
      hasMethods ? methods : undefined,
      nextMethods
    );
  }

  const pollination = plant.phenology?.flowering?.pollination;
  if (pollination === null) {
    unset['phenology.flowering.pollination'] = '';
  } else if (pollination !== undefined) {
    const next = normalizePollination(plant, withoutNulls(pollination));
    if (next === undefined) unset['phenology.flowering.pollination'] = '';
    else
      setIfChanged(set, 'phenology.flowering.pollination', pollination, next);
  }

  const description = plant.phenology?.harvest?.description;
  if (description === null || isBlank(description)) {
    unset['phenology.harvest.description'] = '';
  }

  const ecology = plant.knowledge?.ecology;
  if (isRecord(ecology) && Object.keys(ecology).length === 0) {
    unset['knowledge.ecology'] = '';
  }

  if (plant.status === undefined) set.status = 'ACTIVE';

  return { set, unset };
};

const toUpdate = ({ set, unset }, at) => {
  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    return undefined;
  }
  return {
    $set: {
      ...set,
      'metadata.updatedAt': at,
      'metadata.updatedBy': MIGRATION_USER
    },
    ...(Object.keys(unset).length > 0 && { $unset: unset }),
    $inc: { version: 1 }
  };
};

const updateEach = async (collection, changesOf, at = new Date()) => {
  const operations = [];

  // Every change is computed before anything is written, so an unexpected
  // value aborts the migration without leaving half the plants migrated. Only
  // the update operations are kept in memory, not the plants.
  for await (const plant of collection.find({})) {
    const update = toUpdate(changesOf(plant), at);
    if (update === undefined) continue;
    operations.push({
      updateOne: {
        // The version read: a plant changed meanwhile is not overwritten.
        filter: { _id: plant._id, version: plant.version },
        update
      }
    });
  }

  let matched = 0;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const result = await collection.bulkWrite(
      operations.slice(i, i + BATCH_SIZE)
    );
    matched += result.matchedCount;
  }

  if (matched !== operations.length) {
    throw new PlantsChangedWhileMigratingError(operations.length - matched);
  }
};

export const up = async (db) => {
  await updateEach(db.collection('plants'), changesFor);
};

// Partial rollback: only the shapes the previous code cannot load are
// reverted, keeping the first item of each list (season, pollination type).
// The other fixes are valid for that code too and stay in place.
const withSeason = (entry) => {
  if (entry === null || typeof entry !== 'object' || !('seasons' in entry)) {
    return entry;
  }
  const { seasons, ...rest } = entry;
  return { ...rest, season: seasons[0] };
};

const rollbackChangesFor = (plant) => {
  const set = {};
  const unset = {};

  const pruning = plant.knowledge?.pruning;
  if (Array.isArray(pruning)) {
    setIfChanged(set, 'knowledge.pruning', pruning, pruning.map(withSeason));
  }

  const methods = plant.knowledge?.propagation?.methods;
  if (methods && typeof methods === 'object') {
    const next = Object.fromEntries(
      Object.entries(methods).map(([name, method]) => [
        name,
        withSeason(method)
      ])
    );
    setIfChanged(set, 'knowledge.propagation.methods', methods, next);
  }

  const pollination = plant.phenology?.flowering?.pollination;
  if (
    pollination &&
    typeof pollination === 'object' &&
    'types' in pollination
  ) {
    const { types, ...rest } = pollination;
    setIfChanged(set, 'phenology.flowering.pollination', pollination, {
      type: types[0],
      ...rest
    });
  }

  return { set, unset };
};

export const down = async (db) => {
  await updateEach(db.collection('plants'), rollbackChangesFor);
};
