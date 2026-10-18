// Todo el acceso a Firestore. Las páginas no importan firebase/firestore directamente.
import {
    doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch,
    serverTimestamp, arrayUnion, arrayRemove, query, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { fail, randomId } from './ui.js';
import { t } from './i18n.js';
import { dhondt, splitSeats } from './tally.js';

const ref = (...path) => doc(db, ...path);
const col = (...path) => collection(db, ...path);
const withId = s => ({ id: s.id, ...s.data() });

// ---------- El Periódico ----------
// Cada noticia es { kind, data, by, at }. El titular se compone al pintarla (así cambia de idioma).
// Con id fijo (p. ej. el resultado de una votación) solo se publica una vez aunque lo intenten dos.
export async function postNews(gid, uid, kind, data = {}, id = null) {
    const r = id ? ref('groups', gid, 'news', id) : doc(col('groups', gid, 'news'));
    try { await setDoc(r, { kind, data, by: uid, at: serverTimestamp() }); } catch { /* ya publicada o sin permiso: no es crítico */ }
}

export function watchNews(gid, n, cb) {
    return onSnapshot(query(col('groups', gid, 'news'), orderBy('at', 'desc'), limit(n)),
        s => cb(s.docs.map(withId), s.docChanges().filter(c => c.type === 'added').map(c => withId(c.doc))), () => cb([], []));
}

// ---------- Usuario ----------
export async function ensureUser(user, name) {
    const r = ref('users', user.uid);
    const s = await getDoc(r);
    if (s.exists()) return withId(s);
    const data = { name: name || user.email.split('@')[0], email: user.email, premium: false, groups: [], createdAt: serverTimestamp() };
    await setDoc(r, data);
    return { id: user.uid, ...data };
}

// Suscripciones de Web Push: una por navegador/dispositivo, con id = hash del endpoint
export async function savePushSub(uid, sub, lang) {
    const json = sub.toJSON();
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json.endpoint));
    const id = [...new Uint8Array(hash)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
    await setDoc(ref('users', uid, 'push', id), { endpoint: json.endpoint, keys: json.keys, lang, ua: navigator.userAgent.slice(0, 120), updatedAt: serverTimestamp() });
}

export function watchUser(uid, cb) {
    return onSnapshot(ref('users', uid), s => cb(s.exists() ? withId(s) : null));
}

// Quita de la lista los grupos de los que te han echado (sin permiso) o que se han borrado (no existen)
export async function pruneGroups(me) {
    const alive = [];
    for (const gid of me.groups) {
        try { if ((await getDoc(ref('groups', gid))).exists()) alive.push(gid); } catch { /* sin acceso: fuera */ }
    }
    if (alive.length !== me.groups.length) await updateDoc(ref('users', me.id), { groups: alive });
    return alive;
}

export async function getGroups(ids) {
    const out = [];
    for (const id of ids) {
        try { const s = await getDoc(ref('groups', id)); if (s.exists()) out.push(withId(s)); } catch { /* sin acceso */ }
    }
    return out;
}

// ---------- Grupos ----------
export async function createGroup(me, { name, seatMode, discipline, totalSeats, parties = false, bipartisan = false, chatHours = 24 }) {
    if (!me.premium && me.groups.length >= 1) throw fail(t('freeLimit'));
    const g = doc(col('groups'));
    const code = randomId(6);
    const b = writeBatch(db);
    b.set(g, { name, ownerId: me.id, code, seatMode, discipline, totalSeats: totalSeats || 11, offices: {}, chatHours, parties: parties || seatMode === 'election', bipartisan, createdAt: serverTimestamp() });
    b.set(ref('invites', code), { groupId: g.id, name });
    b.update(ref('users', me.id), { groups: arrayUnion(g.id) });
    b.set(ref('groups', g.id, 'members', me.id), { name: me.name, partyId: null, seats: seatMode === 'member' ? 1 : 0, joinedAt: serverTimestamp() });
    await b.commit();
    await postNews(g.id, me.id, 'group_created', { name, who: me.name });
    return g.id;
}

export async function joinGroup(me, rawCode) {
    const code = rawCode.trim().toUpperCase();
    const inv = await getDoc(ref('invites', code));
    if (!inv.exists()) throw fail(t('badCode'));
    const gid = inv.data().groupId;
    if (me.groups.includes(gid)) throw fail(t('alreadyIn'));
    if (!me.premium && me.groups.length >= 1) throw fail(t('freeLimit'));
    // Antes de entrar no podemos leer el grupo: el modo de escaños lo comprueban las reglas.
    // Probamos con 1 escaño (modo "1 persona = 1 escaño") y si no, con 0.
    for (const seats of [1, 0]) {
        const b = writeBatch(db);
        b.update(ref('users', me.id), { groups: arrayUnion(gid) });
        b.set(ref('groups', gid, 'members', me.id), { name: me.name, partyId: null, seats, joinedAt: serverTimestamp(), code });
        try { await b.commit(); break; } catch (e) { if (seats === 0) throw e; }
    }
    await postNews(gid, me.id, 'member_joined', { who: me.name });
    return gid;
}

export async function leaveGroup(me, gid, myName) {
    await postNews(gid, me.id, 'member_left', { who: myName || me.name });
    const b = writeBatch(db);
    b.delete(ref('groups', gid, 'members', me.id));
    b.update(ref('users', me.id), { groups: arrayRemove(gid) });
    await b.commit();
}

export async function deleteGroup(me, group) {
    // Las subcolecciones quedan huérfanas pero inaccesibles: sin el doc del grupo nadie es miembro
    const b = writeBatch(db);
    b.delete(ref('invites', group.code));
    b.delete(ref('groups', group.id, 'members', me.id));
    b.update(ref('users', me.id), { groups: arrayRemove(group.id) });
    await b.commit();
    await deleteDoc(ref('groups', group.id));
}

export const updateGroup = (gid, patch) => updateDoc(ref('groups', gid), patch);
export const renameInvite = (code, name) => updateDoc(ref('invites', code), { name }).catch(() => {});

// Enlace de invitación: lo que ve alguien que aún no tiene cuenta
export async function peekInvite(code) {
    try { const s = await getDoc(ref('invites', code.toUpperCase())); return s.exists() ? s.data() : null; } catch { return null; }
}
export const inviteLink = code => `${location.origin}/#/join/${code}`;
export function watchGroup(gid, cb) {
    // loaded: hasta que llega el doc del grupo no sabemos si existe (los demás pueden llegar antes)
    const state = { loaded: false, group: null, members: [], parties: [], coalitions: [], votes: [], news: [] };
    const fire = () => cb({ ...state });
    const unsubs = [
        onSnapshot(ref('groups', gid), s => { state.loaded = true; state.group = s.exists() ? withId(s) : null; fire(); }, () => { state.loaded = true; state.group = null; fire(); }),
        onSnapshot(query(col('groups', gid, 'members'), orderBy('joinedAt')), s => { state.members = s.docs.map(withId); fire(); }, () => {}),
        onSnapshot(query(col('groups', gid, 'parties'), orderBy('createdAt')), s => { state.parties = s.docs.map(withId); fire(); }, () => {}),
        onSnapshot(query(col('groups', gid, 'coalitions'), orderBy('createdAt')), s => { state.coalitions = s.docs.map(withId); fire(); }, () => {}),
        onSnapshot(query(col('groups', gid, 'votes'), orderBy('createdAt', 'desc')), s => { state.votes = s.docs.map(withId); fire(); }, () => {}),
        watchNews(gid, 60, news => { state.news = news; fire(); }),
    ];
    return () => unsubs.forEach(u => u());
}

// ---------- Miembros ----------
export const setMyName = (gid, uid, name) => updateDoc(ref('groups', gid, 'members', uid), { name });
export const setSeats = (gid, uid, seats) => updateDoc(ref('groups', gid, 'members', uid), { seats });
export const kick = (gid, uid) => deleteDoc(ref('groups', gid, 'members', uid));

export async function setParty(gid, uid, partyId, news) {
    await updateDoc(ref('groups', gid, 'members', uid), { partyId });
    if (news) await postNews(gid, uid, partyId ? 'party_joined' : 'party_left', news);
}

export async function setAllSeats(gid, members, seatsOf) {
    const b = writeBatch(db);
    for (const m of members) {
        const s = seatsOf(m);
        if (s !== m.seats) b.update(ref('groups', gid, 'members', m.id), { seats: s });
    }
    await b.commit();
}

// ---------- Partidos ----------
export async function createParty(gid, uid, who, { name, short, color }) {
    const p = doc(col('groups', gid, 'parties'));
    await setDoc(p, { name, short: short.toUpperCase(), color, leaderId: uid, createdAt: serverTimestamp() });
    await setParty(gid, uid, p.id);
    await postNews(gid, uid, 'party_founded', { party: name, short: short.toUpperCase(), color, who });
}
export const updateParty = (gid, pid, patch) => updateDoc(ref('groups', gid, 'parties', pid), patch);
export async function deleteParty(gid, uid, party) {
    await deleteDoc(ref('groups', gid, 'parties', party.id));
    await postNews(gid, uid, 'party_dissolved', { party: party.name, short: party.short, color: party.color });
}

// El nuevo portavoz lo pone cualquier afiliado, citando la votación interna que lo eligió (las reglas la comprueban)
export async function applyLeader(gid, uid, party, vote, winnerName) {
    await updateDoc(ref('groups', gid, 'parties', party.id), { leaderId: vote.result.winner, leaderVoteId: vote.id });
    await postNews(gid, uid, 'leader_elected', { party: party.name, short: party.short, color: party.color, who: winnerName }, 'leader_' + vote.id);
}

// ---------- Coaliciones ----------
export async function createCoalition(gid, uid, { name, parties, labels }) {
    await setDoc(doc(col('groups', gid, 'coalitions')), { name, parties, signed: [uid], createdBy: uid, createdAt: serverTimestamp() });
    await postNews(gid, uid, 'coalition_proposed', { name, parties: labels });
}
export const signCoalition = (gid, cid, uid, on) =>
    updateDoc(ref('groups', gid, 'coalitions', cid), { signed: on ? arrayUnion(uid) : arrayRemove(uid) });
export const deleteCoalition = (gid, cid) => deleteDoc(ref('groups', gid, 'coalitions', cid));

// ---------- Votaciones ----------
export async function createVote(gid, uid, v) {
    const r = doc(col('groups', gid, 'votes'));
    await setDoc(r, {
        type: v.type, title: v.title, text: v.text || '', method: v.method || 'plurality',
        majority: v.majority || 'simple', options: v.options || [], mode: v.mode || 'async',
        deadline: v.mode === 'async' && v.deadline ? Timestamp.fromDate(new Date(v.deadline)) : null,
        secret: Boolean(v.secret), discipline: v.discipline || 'free',
        status: v.type === 'bill' ? 'amending' : 'open',
        parentId: v.parentId || null, kind: v.kind || null, office: v.office || null, round: v.round || 1,
        partyId: v.partyId || null,
        createdBy: uid, createdAt: serverTimestamp(), result: null,
    });
    await postNews(gid, uid, v.kind === 'amendment' ? 'amendment_tabled' : 'vote_opened',
        { title: v.title, type: v.type, vid: r.id, live: v.mode === 'live', party: v.partyLabel || null });
    return r.id;
}
export const updateVote = (gid, vid, patch) => updateDoc(ref('groups', gid, 'votes', vid), patch);
export const deleteVote = (gid, vid) => deleteDoc(ref('groups', gid, 'votes', vid));

// Pasar una votación abierta a directo (o devolverla a plazo)
export async function setLive(gid, uid, vote, on) {
    await updateVote(gid, vote.id, { mode: on ? 'live' : 'async' });
    if (on) await postNews(gid, uid, 'live_started', { title: vote.title, vid: vote.id }, 'live_' + vote.id);
}

export function watchVote(gid, vid, cb) {
    const state = { vote: null, ballots: [], voters: [], ballotsHidden: false };
    const fire = () => cb({ ...state });
    let ballotsUnsub = () => {};
    const subBallots = () => {
        ballotsUnsub();
        ballotsUnsub = onSnapshot(col('groups', gid, 'votes', vid, 'ballots'),
            s => { state.ballots = s.docs.map(withId); state.ballotsHidden = false; fire(); },
            () => { state.ballots = []; state.ballotsHidden = true; fire(); });
    };
    let lastStatus;
    const u1 = onSnapshot(ref('groups', gid, 'votes', vid), s => {
        state.vote = s.exists() ? withId(s) : null;
        // Al cerrarse una secreta, las papeletas pasan a ser legibles: volvemos a suscribirnos
        if (state.vote && state.vote.status !== lastStatus) { lastStatus = state.vote.status; subBallots(); }
        fire();
    });
    const u2 = onSnapshot(col('groups', gid, 'votes', vid, 'voters'), s => { state.voters = s.docs.map(d => d.id); fire(); });
    // Las de plazo se abren a la lectura al vencer: reintenta cuando llega la hora
    const timer = setInterval(() => {
        const d = state.vote?.deadline?.toDate?.();
        if (state.ballotsHidden && d && d <= new Date()) subBallots();
    }, 15000);
    return () => { u1(); u2(); ballotsUnsub(); clearInterval(timer); };
}

export async function castBallot(gid, vote, me, member, parties, data) {
    const party = parties.find(p => p.id === member.partyId);
    const bid = vote.secret ? doc(col('groups', gid, 'votes', vote.id, 'ballots')).id : me.id;
    const ballot = {
        weight: ['election', 'leader', 'referendum'].includes(vote.type) ? 1 : member.seats,
        partyId: member.partyId || null,
        leader: Boolean(party && party.leaderId === me.id),
        data,
        createdAt: serverTimestamp(),
    };
    if (!vote.secret) { ballot.uid = me.id; ballot.name = member.name; }
    const b = writeBatch(db);
    b.set(ref('groups', gid, 'votes', vote.id, 'ballots', bid), ballot);
    b.set(ref('groups', gid, 'votes', vote.id, 'voters', me.id), { ballotId: bid });
    await b.commit();
}

export async function getBallots(gid, vid) {
    return (await getDocs(col('groups', gid, 'votes', vid, 'ballots'))).docs.map(withId);
}

// Elecciones: D'Hondt entre partidos y luego reparto dentro del partido (portavoz primero)
export async function applyElection(gid, uid, group, members, parties, counts, vid) {
    const bySeats = dhondt(counts, group.totalSeats || 11);
    const seatsOf = {};
    for (const p of parties) {
        const list = members.filter(m => m.partyId === p.id)
            .sort((a, b) => (a.id === p.leaderId ? -1 : b.id === p.leaderId ? 1 : 0));
        Object.assign(seatsOf, splitSeats(bySeats[p.id] || 0, list.map(m => m.id)));
    }
    await setAllSeats(gid, members, m => seatsOf[m.id] || 0);
    const alloc = parties.filter(p => bySeats[p.id]).map(p => ({ short: p.short, color: p.color, seats: bySeats[p.id] }))
        .sort((a, b) => b.seats - a.seats);
    await postNews(gid, uid, 'seats_allocated', { alloc, total: group.totalSeats || 11 }, 'seats_' + vid);
}

// ---------- Chats (partido y sala de portavoces) ----------
// Los mensajes llevan expireAt: con la política TTL de Firestore se borran solos. Por si no está
// configurada, cada cliente borra también sus propios mensajes caducados al abrir la sala.
export const roomOfParty = pid => 'p_' + pid;
export const LEADERS_ROOM = 'leaders';

export async function sendMessage(gid, room, uid, name, text, hours = 24) {
    await setDoc(doc(col('groups', gid, 'rooms', room, 'messages')), {
        uid, name, text, createdAt: serverTimestamp(),
        expireAt: Timestamp.fromDate(new Date(Date.now() + hours * 3600 * 1000)),
    });
}

export function watchRoom(gid, room, uid, cb) {
    let swept = false;
    return onSnapshot(query(col('groups', gid, 'rooms', room, 'messages'), orderBy('createdAt', 'desc'), limit(80)), s => {
        const now = new Date();
        const all = s.docs.map(withId);
        if (!swept) {
            swept = true;
            for (const m of all) if (m.uid === uid && m.expireAt?.toDate() < now) deleteDoc(ref('groups', gid, 'rooms', room, 'messages', m.id)).catch(() => {});
        }
        cb(all.filter(m => !m.expireAt || m.expireAt.toDate() > now).reverse());
    }, () => cb(null));
}
