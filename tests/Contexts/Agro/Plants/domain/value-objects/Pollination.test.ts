import { PollinationType } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PollinationType.js';
import { Pollination } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/Pollination.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';

const { BAT, INSECT, SELF, WATER, WIND } = PollinationType;

// Tomato: self-pollinated, helped by bumblebees.
const tomato = (): Pollination =>
  new Pollination({ types: [SELF, INSECT], agents: ['bumblebees'] });

describe('Pollination (value object)', () => {
  it('should round-trip through its primitives', () => {
    const primitives = tomato().toPrimitives();

    expect(Pollination.fromPrimitives(primitives).toPrimitives()).toEqual(
      primitives
    );
  });

  it('should not share its lists with the primitives it came from', () => {
    const types = [INSECT];
    const agents = ['bee'];
    const pollination = new Pollination({ types, agents });

    types.push(WIND);
    agents.push('wasp');

    expect(pollination.toPrimitives()).toEqual({
      types: [INSECT],
      agents: ['bee']
    });
  });

  it.each([
    ['no types', []],
    ['a repeated type', [INSECT, INSECT]]
  ])('should reject %s', (_, types) => {
    expect(() => new Pollination({ types })).toThrow(InvalidArgumentException);
  });

  it.each([[[WIND]], [[SELF]], [[WATER]]])(
    'should reject agents for the types %j',
    (types) => {
      expect(() => new Pollination({ types, agents: ['bee'] })).toThrow(
        InvalidArgumentException
      );
    }
  );

  it('should take an empty list of agents as no agents', () => {
    expect(
      new Pollination({ types: [WIND], agents: [] }).toPrimitives()
    ).toEqual({ types: [WIND] });
  });

  it('should accept agents with an animal type among others', () => {
    expect(
      new Pollination({ types: [WIND, BAT], agents: ['fruit bat'] }).agents
    ).toEqual(['fruit bat']);
  });

  describe('start', () => {
    it('should require the types', () => {
      expect(() => Pollination.start({ agents: ['bee'] })).toThrow(
        InvalidArgumentException
      );
    });

    it('should leave out null agents', () => {
      expect(
        Pollination.start({ types: [WIND], agents: null }).toPrimitives()
      ).toEqual({ types: [WIND] });
    });
  });

  describe('update', () => {
    it('should replace the types', () => {
      expect(tomato().update({ types: [INSECT] }).types).toEqual([INSECT]);
    });

    it('should keep the agents while an animal type remains', () => {
      expect(tomato().update({ types: [INSECT] }).agents).toEqual([
        'bumblebees'
      ]);
    });

    it('should drop the agents when no animal type remains', () => {
      expect(
        tomato()
          .update({ types: [SELF] })
          .toPrimitives()
      ).toEqual({
        types: [SELF]
      });
    });

    it('should reject new agents without an animal type', () => {
      expect(() => tomato().update({ types: [WIND], agents: ['bee'] })).toThrow(
        InvalidArgumentException
      );
    });

    it('should keep the types when only the agents change', () => {
      expect(
        tomato()
          .update({ agents: ['bees'] })
          .toPrimitives()
      ).toEqual({
        types: [SELF, INSECT],
        agents: ['bees']
      });
    });

    it('should remove the agents on null', () => {
      expect(tomato().update({ agents: null }).agents).toBeUndefined();
    });
  });
});
