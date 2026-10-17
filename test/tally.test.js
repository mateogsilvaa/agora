import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dhondt, splitSeats, applyDiscipline, tally, condorcet, majorityOf, minimalWinning } from '../src/tally.js';

test('coaliciones mínimas ganadoras', () => {
    const seats = { A: 5, B: 4, C: 2, D: 0 };
    const all = minimalWinning(seats, 6);
    assert.deepEqual(all.map(c => c.parties.sort().join('')), ['AB', 'AC', 'BC']);
    assert.deepEqual(minimalWinning(seats, 6, 'C').map(c => c.parties.sort().join('')), ['AC', 'BC']);
    assert.deepEqual(minimalWinning({ A: 7, B: 1 }, 5).map(c => c.parties.join('')), ['A']);
});

const b = (data, weight = 1, extra = {}) => ({ data, weight, ...extra });

test('dhondt reparte como en un congreso', () => {
    assert.deepEqual(dhondt({ A: 340000, B: 280000, C: 160000, D: 60000 }, 7), { A: 3, B: 3, C: 1, D: 0 });
    assert.deepEqual(dhondt({ A: 2, B: 1 }, 11), { A: 8, B: 3 });
    assert.deepEqual(dhondt({ A: 0, B: 3 }, 5), { B: 5 });
});

test('splitSeats da el resto a los primeros de la lista', () => {
    assert.deepEqual(splitSeats(7, ['a', 'b', 'c']), { a: 3, b: 2, c: 2 });
    assert.deepEqual(splitSeats(0, ['a']), { a: 0 });
});

test('sí/no con mayoría simple y absoluta', () => {
    const ballots = [b({ choice: 'yes' }, 2), b({ choice: 'no' }), b({ choice: 'abstain' })];
    assert.equal(tally({ type: 'yesno', majority: 'simple' }, ballots, { totalSeats: 5 }).passed, true);
    assert.equal(tally({ type: 'yesno', majority: 'absolute' }, ballots, { totalSeats: 5 }).passed, false);
    assert.equal(tally({ type: 'yesno', majority: 'absolute' }, ballots, { totalSeats: 3 }).passed, true);
});

test('grupo de 2 empata y no hay ganador', () => {
    const opts = { type: 'options', method: 'plurality', options: [{ id: 'x' }, { id: 'y' }] };
    const r = tally(opts, [b({ choice: 'x' }), b({ choice: 'y' })], { totalSeats: 2 });
    assert.equal(r.winner, null);
    assert.deepEqual(r.tie.sort(), ['x', 'y']);
});

test('aprobación y puntos', () => {
    const options = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
    const ap = tally({ type: 'options', method: 'approval', options },
        [b({ approved: ['x', 'y'] }), b({ approved: ['y'] }), b({ approved: ['z', 'y'] })], { totalSeats: 3 });
    assert.equal(ap.winner, 'y');
    const pt = tally({ type: 'options', method: 'points', options },
        [b({ scores: { x: 5, y: 3 } }), b({ scores: { y: 4, z: 9 } })], { totalSeats: 2 });
    assert.deepEqual(pt.counts, { x: 5, y: 7, z: 5 });
    assert.equal(pt.winner, 'y');
});

test('preferencial elimina y transfiere', () => {
    const options = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const ballots = [
        b({ ranking: ['a', 'c'] }, 4), b({ ranking: ['b', 'c'] }, 3), b({ ranking: ['c', 'b'] }, 2),
    ];
    const r = tally({ type: 'options', method: 'ranked', options }, ballots, { totalSeats: 9 });
    assert.equal(r.rounds.length, 2);
    assert.equal(r.winner, 'b');
    assert.equal(condorcet(ballots, ['a', 'b', 'c']), 'c');
});

test('disciplina en bloque: el líder vota por todo el partido', () => {
    const ballots = [
        b({ choice: 'yes' }, 1, { partyId: 'P', leader: true }),
        b({ choice: 'no' }, 1, { partyId: 'P' }),
        b({ choice: 'no' }, 2, { partyId: 'Q' }),
    ];
    const eff = applyDiscipline(ballots, 'bloc', { P: 3, Q: 2 });
    assert.deepEqual(eff.map(x => [x.weight, x.counted]), [[3, true], [1, false], [2, true]]);
    const r = tally({ type: 'yesno', discipline: 'bloc' }, ballots, { totalSeats: 5, partySeats: { P: 3, Q: 2 } });
    assert.deepEqual(r.counts, { yes: 3, no: 2, abstain: 0 });
    const free = tally({ type: 'yesno', discipline: 'free' }, ballots, { totalSeats: 5 });
    assert.deepEqual(free.counts, { yes: 1, no: 3, abstain: 0 });
});

test('cargo con mayoría absoluta exige más de la mitad de la cámara', () => {
    const vote = { type: 'office', method: 'plurality', majority: 'absolute', options: [{ id: 'u1' }, { id: 'u2' }] };
    const ballots = [b({ choice: 'u1' }, 4), b({ choice: 'u2' }, 3)];
    assert.equal(tally(vote, ballots, { totalSeats: 10 }).winner, null);
    assert.equal(tally(vote, ballots, { totalSeats: 7 }).winner, 'u1');
    assert.equal(majorityOf(7), 4);
    assert.equal(majorityOf(10), 6);
});
