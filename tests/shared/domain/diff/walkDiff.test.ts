import { walkDiff } from '../../../../src/shared/domain/diff/walkDiff.js';

describe('walkDiff', () => {
  it('iterates all keys from both objects', () => {
    const current = { a: 1 };
    const updated = { b: 2 };

    const visited: string[] = [];

    walkDiff(current, updated, '', (_, __, ___, path) => {
      visited.push(path);
    });

    expect(visited).toEqual(expect.arrayContaining(['a', 'b']));
  });
});
