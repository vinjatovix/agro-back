import { embedFamilySummaries } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/embedFamilySummaries.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilySummaryReaderMock } from '../../__mocks__/FamilySummaryReaderMock.js';
import { FamilySummaryViewMother } from '../queries/FamilySummaryViewMother.js';
import { PlantReadViewMother } from '../queries/PlantReadViewMother.js';

const LEGACY_FAMILY_ID = 'fam_test';

describe('embedFamilySummaries', () => {
  let reader: FamilySummaryReaderMock;

  beforeEach(() => {
    reader = new FamilySummaryReaderMock();
  });

  it('reads the distinct families of the page in one call', async () => {
    const [first, second] = [
      FamilySummaryViewMother.random(),
      FamilySummaryViewMother.random()
    ];
    reader.add(first, second);
    const plants = [
      PlantReadViewMother.ofFamily(first.id),
      PlantReadViewMother.ofFamily(second.id),
      PlantReadViewMother.ofFamily(first.id)
    ];

    const embedded = await embedFamilySummaries(plants, reader);

    expect(embedded.map((plant) => plant.identity?.family)).toEqual([
      first,
      second,
      first
    ]);
    reader.assertCalledOnceWith([first.id, second.id]);
  });

  it('keeps the plain id of a family that is not found', async () => {
    const found = FamilySummaryViewMother.random();
    reader.add(found);
    const missing = PlantReadViewMother.ofFamily(random.uuid());

    const embedded = await embedFamilySummaries(
      [PlantReadViewMother.ofFamily(found.id), missing],
      reader
    );

    expect(embedded[0]?.identity?.family).toEqual(found);
    expect(embedded[1]).toBe(missing);
  });

  it('returns every plant when no family is found', async () => {
    const plants = [
      PlantReadViewMother.ofFamily(random.uuid()),
      PlantReadViewMother.ofFamily(random.uuid())
    ];

    await expect(embedFamilySummaries(plants, reader)).resolves.toEqual(plants);
  });

  it('drops ids that are not UUIDs before reading', async () => {
    const found = FamilySummaryViewMother.random();
    reader.add(found);
    const legacy = PlantReadViewMother.ofFamily(LEGACY_FAMILY_ID);

    const embedded = await embedFamilySummaries(
      [legacy, PlantReadViewMother.ofFamily(found.id)],
      reader
    );

    expect(embedded[0]).toBe(legacy);
    reader.assertCalledOnceWith([found.id]);
  });

  it('does not read when no plant has a UUID family id', async () => {
    const legacy = PlantReadViewMother.ofFamily(LEGACY_FAMILY_ID);

    await expect(embedFamilySummaries([legacy], reader)).resolves.toEqual([
      legacy
    ]);
    reader.assertNotCalled();
  });
});
