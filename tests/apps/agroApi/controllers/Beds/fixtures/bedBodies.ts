import { random } from '../../../../../Contexts/shared/fixtures/random.js';

type Body = Record<string, unknown>;

export const buildCreateBedBody = (overrides: Body = {}): Body => ({
  id: random.uuid(),
  name: 'Raised bed',
  width: 120,
  height: 240,
  depth: 30.5,
  ...overrides
});

export const buildUpdateBedBody = (overrides: Body = {}): Body => ({
  name: 'Renamed bed',
  width: 150,
  height: 250,
  depth: 40,
  ...overrides
});
