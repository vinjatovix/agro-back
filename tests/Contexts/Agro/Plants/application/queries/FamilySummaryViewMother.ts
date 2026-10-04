import type { FamilySummaryView } from '../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import { random } from '../../../../shared/fixtures/random.js';

/** Family summaries as the family read side returns them. */
export const FamilySummaryViewMother = {
  random(): FamilySummaryView {
    const name = random.word({ min: 4, max: 12 });

    return { id: random.uuid(), name, slug: name.toLowerCase() };
  }
};
