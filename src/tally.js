// Recuento de votaciones. Funciones puras: sin Firebase, se prueban en test/.
//
// Una papeleta (ballot) es { weight, partyId, leader, data } donde data depende del método:
//   yesno     → { choice: 'yes' | 'no' | 'abstain' }
//   plurality → { choice: optionId }
//   approval  → { approved: [optionId] }
//   ranked    → { ranking: [optionId, ...] }   (de más a menos preferida)
//   points    → { scores: { optionId: 0..5 } }

export const METHODS = ['plurality', 'approval', 'ranked', 'points'];

// Tipos que se votan con sí / no / abstención
export const YES_NO = ['yesno', 'referendum', 'censure', 'confidence'];
export const isYesNo = v => YES_NO.includes(v?.type);
export const MAX_POINTS = 5;

// D'Hondt: reparte `seats` escaños según los votos de cada partido.
export function dhondt(votesByParty, seats) {
    const result = {};
    const parties = Object.keys(votesByParty).filter(p => votesByParty[p] > 0);
    parties.forEach(p => { result[p] = 0; });
    for (let i = 0; i < seats && parties.length; i++) {
        let best = null, bestQ = -1;
        for (const p of parties) {
            const q = votesByParty[p] / (result[p] + 1);
            // Empate: gana el partido con más votos totales, luego el orden alfabético (estable)
            if (q > bestQ || (q === bestQ && votesByParty[p] > votesByParty[best])) { best = p; bestQ = q; }
        }
        result[best]++;
    }
    return result;
}

// Reparte los escaños de un partido entre sus miembros en el orden de la lista (el primero, el líder).
export function splitSeats(seats, memberIds) {
    const out = {};
    if (!memberIds.length) return out;
    const base = Math.floor(seats / memberIds.length);
    const extra = seats % memberIds.length;
    memberIds.forEach((id, i) => { out[id] = base + (i < extra ? 1 : 0); });
    return out;
}

// Disciplina de voto "bloc": si el líder de un partido ha votado, su papeleta vale todos los
// escaños del partido y las de los demás miembros del partido no cuentan.
export function applyDiscipline(ballots, discipline, partySeats) {
    if (discipline !== 'bloc') return ballots.map(b => ({ ...b, counted: true }));
    const leaderOf = {};
    for (const b of ballots) if (b.leader && b.partyId) leaderOf[b.partyId] = b;
    return ballots.map(b => {
        if (!b.partyId || !leaderOf[b.partyId]) return { ...b, counted: true };
        if (b === leaderOf[b.partyId]) return { ...b, counted: true, weight: partySeats[b.partyId] ?? b.weight };
        return { ...b, counted: false };
    });
}

function top(counts) {
    let max = -Infinity, ids = [];
    for (const [id, n] of Object.entries(counts)) {
        if (n > max) { max = n; ids = [id]; } else if (n === max) ids.push(id);
    }
    return { max, ids };
}

function zeroCounts(optionIds) {
    return Object.fromEntries(optionIds.map(id => [id, 0]));
}

// Mayoría necesaria según el umbral. `base` es el total de escaños de la cámara.
export function threshold(kind, base, yes, no) {
    if (kind === 'absolute') return yes > base / 2;
    if (kind === 'twoThirds') return yes >= Math.ceil((2 * base) / 3);
    return yes > no; // simple
}

export function tallyYesNo(ballots, { majority = 'simple', totalSeats }) {
    const counts = { yes: 0, no: 0, abstain: 0 };
    for (const b of ballots) if (b.counted !== false && counts[b.data.choice] !== undefined) counts[b.data.choice] += b.weight;
    return { counts, passed: threshold(majority, totalSeats, counts.yes, counts.no) };
}

export function tallyPlurality(ballots, optionIds, { majority = 'simple', totalSeats } = {}) {
    const counts = zeroCounts(optionIds);
    for (const b of ballots) if (b.counted !== false && counts[b.data.choice] !== undefined) counts[b.data.choice] += b.weight;
    const { max, ids } = top(counts);
    let winner = ids.length === 1 && max > 0 ? ids[0] : null;
    // En cargos con mayoría absoluta, ganar no basta: hay que superar la mitad de la cámara
    if (winner && majority === 'absolute' && !(max > totalSeats / 2)) winner = null;
    return { counts, winner, tie: ids.length > 1 && max > 0 ? ids : [] };
}

export function tallyApproval(ballots, optionIds) {
    const counts = zeroCounts(optionIds);
    for (const b of ballots) {
        if (b.counted === false) continue;
        for (const id of new Set(b.data.approved || [])) if (counts[id] !== undefined) counts[id] += b.weight;
    }
    const { max, ids } = top(counts);
    return { counts, winner: ids.length === 1 && max > 0 ? ids[0] : null, tie: ids.length > 1 && max > 0 ? ids : [] };
}

export function tallyPoints(ballots, optionIds) {
    const counts = zeroCounts(optionIds);
    for (const b of ballots) {
        if (b.counted === false) continue;
        for (const [id, s] of Object.entries(b.data.scores || {})) {
            if (counts[id] !== undefined) counts[id] += b.weight * Math.max(0, Math.min(MAX_POINTS, Number(s) || 0));
        }
    }
    const { max, ids } = top(counts);
    return { counts, winner: ids.length === 1 && max > 0 ? ids[0] : null, tie: ids.length > 1 && max > 0 ? ids : [] };
}

// Voto preferencial con eliminación (segunda vuelta instantánea) + comprobación Condorcet.
export function tallyRanked(ballots, optionIds) {
    const counted = ballots.filter(b => b.counted !== false);
    const alive = new Set(optionIds);
    const rounds = [];
    let winner = null, tie = [];
    while (alive.size) {
        const counts = Object.fromEntries([...alive].map(id => [id, 0]));
        let valid = 0;
        for (const b of counted) {
            const pick = (b.data.ranking || []).find(id => alive.has(id));
            if (pick) { counts[pick] += b.weight; valid += b.weight; }
        }
        rounds.push(counts);
        if (!valid) break;
        const { max, ids } = top(counts);
        if (max > valid / 2) { winner = ids[0]; break; }
        let min = Infinity;
        for (const n of Object.values(counts)) min = Math.min(min, n);
        const losers = Object.keys(counts).filter(id => counts[id] === min);
        // Si eliminar a los últimos dejaría la sala vacía, es empate entre los que quedan
        if (losers.length === alive.size) { tie = losers; break; }
        losers.forEach(id => alive.delete(id));
    }
    return { counts: rounds[0] || zeroCounts(optionIds), rounds, winner, tie, condorcet: condorcet(counted, optionIds) };
}

// Opción que gana a todas las demás en duelos uno contra uno (o null si no existe).
export function condorcet(ballots, optionIds) {
    const rankOf = b => {
        const r = {};
        (b.data.ranking || []).forEach((id, i) => { r[id] = i; });
        return r;
    };
    const ranks = ballots.map(b => [b.weight, rankOf(b)]);
    for (const a of optionIds) {
        let beatsAll = true;
        for (const c of optionIds) {
            if (a === c) continue;
            let ac = 0, ca = 0;
            for (const [w, r] of ranks) {
                const ra = r[a] ?? Infinity, rc = r[c] ?? Infinity;
                if (ra < rc) ac += w; else if (rc < ra) ca += w;
            }
            if (!(ac > ca)) { beatsAll = false; break; }
        }
        if (beatsAll) return a;
    }
    return null;
}

// Punto de entrada: decide el método según el tipo de votación.
export function tally(vote, rawBallots, { totalSeats, partySeats = {} }) {
    const ballots = applyDiscipline(rawBallots, vote.discipline, partySeats);
    const optionIds = (vote.options || []).map(o => o.id);
    const turnout = ballots.filter(b => b.counted).reduce((s, b) => s + b.weight, 0);
    let r;
    if (isYesNo(vote)) r = tallyYesNo(ballots, { majority: vote.majority, totalSeats });
    else if (vote.method === 'approval') r = tallyApproval(ballots, optionIds);
    else if (vote.method === 'ranked') r = tallyRanked(ballots, optionIds);
    else if (vote.method === 'points') r = tallyPoints(ballots, optionIds);
    else r = tallyPlurality(ballots, optionIds, { majority: vote.majority, totalSeats });
    return { ...r, turnout, totalSeats, ballots };
}

// Escaños necesarios para la mayoría absoluta.
export const majorityOf = total => Math.floor(total / 2) + 1;

// Coaliciones mínimas ganadoras: combinaciones que llegan a la mayoría y en las que sobra
// cualquier partido que se vaya (si se va uno, ya no llegan). Ordenadas de menos a más partidos.
export function minimalWinning(partySeats, majority, mustInclude = null) {
    const ids = Object.keys(partySeats).filter(id => partySeats[id] > 0);
    if (ids.length > 14) ids.sort((a, b) => partySeats[b] - partySeats[a]).splice(14);
    const out = [];
    for (let mask = 1; mask < 1 << ids.length; mask++) {
        const set = ids.filter((_, i) => mask & (1 << i));
        if (mustInclude && !set.includes(mustInclude)) continue;
        const seats = set.reduce((s, id) => s + partySeats[id], 0);
        if (seats < majority) continue;
        if (set.every(id => seats - partySeats[id] < majority)) out.push({ parties: set, seats });
    }
    return out.sort((a, b) => a.parties.length - b.parties.length || b.seats - a.seats);
}
