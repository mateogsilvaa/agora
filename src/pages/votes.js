import { t } from '../i18n.js';
import { h, mount, field, busy, section, empty, loading, badge, select, toast, fmtDate, fail } from '../ui.js';
import { createVote, updateVote, deleteVote, watchVote, castBallot, getBallots, applyElection, updateGroup, postNews, setLive } from '../data.js';
import { tally, dhondt, METHODS, MAX_POINTS, isYesNo } from '../tally.js';
import { hemicycle } from '../hemicycle.js';
import { majorityBar } from './group.js';
import { PARTY_COLORS } from '../ui.js';

// Votaciones de una persona = un voto (no cuentan escaños)
const perHead = v => ['election', 'leader', 'referendum'].includes(v.type);
// ︎: que se vean como texto monocromo, no como emoji de colores
const TYPE_ICON = Object.fromEntries(Object.entries({ yesno: '±', options: '☰', bill: '§', office: '♛', referendum: '✋', censure: '⚔', confidence: '⚖', election: '◔' })
    .map(([k, v]) => [k, v + '︎']));
const YN_COLORS = { yes: 'var(--green)', no: 'var(--red)', abstain: 'var(--dim)' };

const deadlineOf = v => v.deadline?.toDate?.() || null;
export const isFinished = v => v.status === 'closed' || (deadlineOf(v) && deadlineOf(v) <= new Date());
export const isOpen = v => v.status === 'open' && !isFinished(v);

function statusBadge(v) {
    if (v.type === 'bill') {
        if (v.status === 'amending') return badge(t('amending'), 'accent');
        if (v.status === 'final') return badge(t('finalVote'), 'blue');
    }
    if (isOpen(v)) return v.mode === 'live' ? h('span.badge.red.live', t('live')) : badge(t('open'), 'green');
    if (v.result) {
        if (v.result.passed === true) return badge(t('passed'), 'green');
        if (v.result.passed === false) return badge(t('rejected'), 'red');
    }
    return badge(t('closed'), 'ink');
}

function localInput(date) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000);

function timeLeft(date) {
    const m = Math.max(0, Math.round((date - Date.now()) / 60000));
    if (m < 60) return `${m} min`;
    if (m < 48 * 60) return `${Math.round(m / 60)} h`;
    return `${Math.round(m / 1440)} d`;
}

// Barra sí / no / abstención para la lista
function miniBar(c) {
    const tot = (c.yes || 0) + (c.no || 0) + (c.abstain || 0) || 1;
    return h('div.mini-bar', ['yes', 'no', 'abstain'].map(k => h('i', { style: { width: ((c[k] || 0) / tot) * 100 + '%', background: YN_COLORS[k] } })));
}

// ---------- Lista ----------
export function renderVotes(body, ctx) {
    const { d, gid } = ctx;
    const list = d.votes.filter(v => v.kind !== 'amendment');
    mount(body,
        h('div.row-between', { style: { marginBottom: '16px' } },
            h('span.sub', `${list.filter(isOpen).length} ${t('open').toLowerCase()}`),
            h('a.btn', { href: `#/g/${gid}/new` }, '+ ' + t('newVote'))),
        list.length ? h('div', list.map(v => h(`a.item${isOpen(v) ? '.is-open' : ''}`, { href: `#/g/${gid}/v/${v.id}` },
            h('div', { style: { flex: 1, minWidth: 0 } },
                h('h3', v.title),
                h('div.sub', [t('type_' + v.type), v.office, v.round > 1 ? t('round', { n: v.round }) : null,
                    isOpen(v) && deadlineOf(v) ? t('left', { x: timeLeft(deadlineOf(v)) })
                        : v.mode === 'async' && deadlineOf(v) ? `${t('ended')} ${fmtDate(v.deadline)}` : null,
                    v.secret ? t('secret') : null].filter(Boolean).join(' · ')),
                v.result?.counts && isYesNo(v) ? miniBar(v.result.counts) : null),
            statusBadge(v))))
            : h('div.empty-cta', h('p.empty', t('noVotesCta')), h('a.btn', { href: `#/g/${gid}/new` }, '+ ' + t('newVote'))),
    );
}

// ---------- Nueva votación ----------
export function renderNewVote(body, ctx) {
    const { d, gid, me, app } = ctx;
    const g = d.group;
    const offices = Object.entries(g.offices || {}).filter(([, o]) => o?.uid);
    const types = ['yesno', 'options', 'bill', 'office', 'referendum'];
    if (offices.length) types.push('censure', 'confidence');
    if (d.isOwner && g.seatMode === 'election') types.push('election');

    const type = select('type', types.map(x => [x, t('type_' + x)]), 'yesno');
    // Selector visual de tipo: tarjetas con icono y para qué sirve cada una
    const typeCards = h('div.type-cards', types.map(x => h('button.type-card', {
        type: 'button', 'data-type': x,
        onclick: () => { type.value = x; sync(); form.dispatchEvent(new Event('input', { bubbles: true })); },
    }, h('span.type-ico', TYPE_ICON[x]), h('b', t('type_' + x)), h('small', t('typeDesc_' + x)))));
    const officeSel = select('officeSel', offices.map(([n, o]) => [n, `${n} · ${o.name}`]), offices[0]?.[0]);
    const challenger = select('challenger', d.members.map(m => [m.id, m.name]), d.members.find(m => m.id !== offices[0]?.[1]?.uid)?.id);
    const title = h('input', { maxLength: 140 });
    const text = h('textarea', { maxLength: 5000 });
    const method = select('method', METHODS.map(m => [m, t('method_' + m)]), 'plurality');
    const majority = select('majority', ['simple', 'absolute', 'twoThirds'].map(m => [m, t('majority_' + m)]), 'simple');
    const office = h('input', { maxLength: 40, placeholder: 'Presidencia' });
    const mode = select('mode', ['async', 'live'].map(m => [m, t('mode_' + m)]), 'async');
    const deadline = h('input', { type: 'datetime-local', value: localInput(tomorrow()) });
    const secret = h('input', { type: 'checkbox' });
    const discipline = select('discipline', [['free', t('freeVote')], ['bloc', t('bloc')]], 'free');

    const optionList = h('div.choices');
    const addOption = (value = '') => optionList.append(h('div.row', h('input', { maxLength: 80, value, placeholder: t('option') }),
        h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: e => e.target.parentElement.remove() }, '×')));
    addOption(); addOption();

    const candidates = d.members.map(m => h('input', { type: 'checkbox', value: m.id }));

    const f = {
        title: field(t('title'), title),
        text: field(t('text'), text),
        options: h('div', h('label', t('options')), optionList,
            h('button.btn.btn-sec.btn-sm', { type: 'button', style: { marginTop: '8px' }, onclick: () => addOption() }, '+ ' + t('addOption'))),
        method: field(t('methodLabel'), method),
        majority: field(t('majorityLabel'), majority),
        office: field(t('officeName'), office),
        candidates: h('div', h('label', t('candidates')),
            h('div.row', d.members.map((m, i) => h('label.check', candidates[i], m.name)))),
        officeSel: field(t('officeName'), officeSel),
        challenger: field(t('challenger'), challenger),
        deadline: field(t('deadline'), deadline),
        discipline: field(t('disciplineThis'), discipline),
    };

    const sync = () => {
        const ty = type.value;
        typeCards.querySelectorAll('.type-card').forEach(b => b.classList.toggle('on', b.dataset.type === ty));
        const auto = ['election', 'censure', 'confidence'].includes(ty);
        f.title.hidden = auto;
        f.text.hidden = ty === 'office' || ty === 'election';
        f.officeSel.hidden = !['censure', 'confidence'].includes(ty);
        f.challenger.hidden = ty !== 'censure';
        f.options.hidden = ty !== 'options';
        f.method.hidden = ty !== 'options';
        f.majority.hidden = !['yesno', 'bill', 'office'].includes(ty);
        f.office.hidden = f.candidates.hidden = ty !== 'office';
        f.deadline.hidden = mode.value !== 'async';
        f.discipline.hidden = g.discipline !== 'choose' || ty === 'election';
        // Un cargo solo admite mayoría simple o absoluta
        majority.querySelector('[value=twoThirds]').hidden = ty === 'office';
        if (ty === 'office' && majority.value === 'twoThirds') majority.value = 'absolute';
    };
    type.onchange = sync; mode.onchange = sync;
    sync();

    const btn = h('button.btn.btn-lg', { type: 'submit' }, t('create'));
    const form = h('form.form', {
        onsubmit: e => {
            e.preventDefault();
            busy(btn, async () => {
                const ty = type.value;
                const v = {
                    type: ty, title: title.value.trim(), text: text.value.trim(), majority: majority.value,
                    mode: mode.value, deadline: mode.value === 'async' ? deadline.value : null, secret: secret.checked,
                    discipline: g.discipline === 'choose' ? discipline.value : g.discipline,
                };
                if (v.mode === 'async' && (!v.deadline || new Date(v.deadline) <= new Date())) throw fail(t('deadline') + '?');
                if (ty === 'options') {
                    const labels = [...optionList.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
                    if (labels.length < 2) throw fail(t('options') + ' ≥ 2');
                    v.options = labels.map((label, i) => ({ id: 'o' + i, label }));
                    v.method = method.value;
                } else if (ty === 'office') {
                    v.office = office.value.trim() || 'Presidencia';
                    v.options = d.members.filter((m, i) => candidates[i].checked).map(m => ({ id: m.id, label: m.name }));
                    if (!v.options.length) throw fail(t('candidates') + '?');
                    if (!v.title) v.title = v.office;
                } else if (ty === 'censure' || ty === 'confidence') {
                    const [name, holder] = offices.find(([n]) => n === officeSel.value) || [];
                    if (!name) throw fail(t('officeName') + '?');
                    v.office = name;
                    // Moción constructiva (a la española): hay que proponer quién entra; se aprueba con mayoría absoluta
                    if (ty === 'censure') {
                        if (challenger.value === holder.uid) throw fail(t('challenger') + '?');
                        v.options = [{ id: challenger.value, label: d.memberName(challenger.value) }];
                        v.majority = 'absolute';
                        v.title = `${t('type_censure')}: ${holder.name} → ${d.memberName(challenger.value)} (${name})`;
                    } else {
                        v.options = [{ id: holder.uid, label: holder.name }];
                        v.majority = 'simple';
                        v.title = `${t('type_confidence')}: ${holder.name} (${name})`;
                    }
                } else if (ty === 'referendum') {
                    v.majority = 'simple';
                } else if (ty === 'election') {
                    if (d.parties.length < 1) throw fail(t('noParties'));
                    v.options = d.parties.map(p => ({ id: p.id, label: `${p.short} · ${p.name}` }));
                    v.title = `${t('type_election')} · ${fmtDate(new Date())}`;
                    v.discipline = 'free';
                }
                if (!v.title) throw fail(t('title') + '?');
                const vid = await createVote(gid, me.id, v);
                app.clean();
                location.hash = `#/g/${gid}/v/${vid}`;
            });
        },
    },
    h('div', h('label', t('voteType')), typeCards), f.title, f.text, f.options, f.office, f.candidates, f.officeSel, f.challenger,
    h('div.fields', f.method, f.majority, field(t('modeLabel'), mode), f.deadline, f.discipline),
    h('label.check', secret, t('secret')),
    h('div.row', btn, h('a.btn.btn-ghost', { href: `#/g/${gid}/votes` }, t('cancel'))));

    // Plantillas: un toque y la votación está lista para lanzar
    const setOptions = labels => { optionList.replaceChildren(); labels.forEach(l => addOption(l)); };
    const later = hours => localInput(new Date(Date.now() + hours * 3600 * 1000));
    const templates = [
        ['tplDinner', 'tplDinnerSub', () => { type.value = 'options'; title.value = t('tplDinner'); method.value = 'approval'; mode.value = 'async'; deadline.value = later(24); setOptions(['', '', '']); }],
        ['tplDate', 'tplDateSub', () => {
            type.value = 'options'; title.value = t('tplDate'); method.value = 'approval'; mode.value = 'async'; deadline.value = later(48);
            const days = Array.from({ length: 4 }, (_, i) => new Date(Date.now() + (i + 1) * 864e5).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' }));
            setOptions(days);
        }],
        ['tplDelegate', 'tplDelegateSub', () => { type.value = 'office'; office.value = t('tplDelegate').replace(/^\S+\s/, ''); majority.value = 'absolute'; secret.checked = true; mode.value = 'live'; candidates.forEach(c => { c.checked = true; }); }],
        ['tplQuick', 'tplQuickSub', () => { type.value = 'yesno'; title.value = ''; majority.value = 'simple'; mode.value = 'live'; title.focus(); }],
        ['tplTrip', 'tplTripSub', () => { type.value = 'bill'; title.value = t('tplTrip'); majority.value = 'simple'; mode.value = 'async'; deadline.value = later(72); text.focus(); }],
    ];
    const tplBox = h('div.templates', templates.map(([a, b, fn]) => h('button.template', {
        type: 'button', onclick: () => { fn(); sync(); form.dispatchEvent(new Event('input', { bubbles: true })); },
    }, t(a), h('small', t(b)))));

    mount(body, section(t('templates'), null, tplBox), section(t('newVote'), null, form));
}

// ---------- Una votación ----------
export class VotePage {
    constructor(gid, vid, app) {
        this.gid = gid; this.vid = vid; this.app = app;
        this.state = null;
        this.draft = {};
        this.saving = false;
        this.unsub = watchVote(gid, vid, s => { this.state = s; app.refresh(); });
    }

    destroy() { this.unsub(); }

    render(body, ctx) {
        if (!this.state) return mount(body, loading());
        const { vote } = this.state;
        if (!vote) return mount(body, empty('—'), h('a.btn.btn-sec', { href: `#/g/${this.gid}/votes` }, t('back')));
        const { d, me } = ctx;
        const canManage = vote.createdBy === me.id || d.isOwner;
        const finished = isFinished(vote);
        const iVoted = this.state.voters.includes(me.id);

        const parent = vote.parentId ? d.votes.find(v => v.id === vote.parentId) : null;
        const meta = [t('type_' + vote.type), vote.round > 1 ? t('round', { n: vote.round }) : null,
            `${t('by')} ${d.memberName(vote.createdBy)}`, fmtDate(vote.createdAt),
            vote.mode === 'async' && deadlineOf(vote) ? `${finished ? t('ended') : t('ends')} ${fmtDate(vote.deadline)}` : null,
            vote.secret ? t('secret') : t('nominal'), vote.discipline === 'bloc' ? t('bloc') : null].filter(Boolean).join(' · ');

        const head = h('div', { style: { marginBottom: '22px' } },
            parent ? h('a.sub', { href: `#/g/${this.gid}/v/${parent.id}` }, '← ' + parent.title) : h('a.sub', { href: `#/g/${this.gid}/votes` }, '← ' + t('votes')),
            h('div.row-between', { style: { marginTop: '10px' } }, h('h2', { style: { fontSize: '30px', margin: 0 } }, vote.title), statusBadge(vote)),
            h('p.sub', meta));

        if (vote.type === 'bill') return mount(body, head, this.renderBill(ctx, vote, canManage));

        const ballots = this.state.ballots;
        const visible = !this.state.ballotsHidden && (!vote.secret || finished);
        const r = visible ? tally(vote, ballots, { totalSeats: d.total, partySeats: d.partySeats }) : null;

        // Al acabar, quien gestiona guarda el resultado (sirve para la lista y para las enmiendas)
        if (finished && r && !vote.result && canManage && !this.saving) {
            this.saving = true;
            this.saveResult(vote, r).finally(() => { this.saving = false; });
        }

        const ballotBox = isOpen(vote) ? this.renderBallotBox(ctx, vote, iVoted) : null;
        const voterNames = this.state.voters.map(id => d.memberName(id));

        const actions = h('div.row', { style: { marginTop: '16px' } },
            isOpen(vote) && canManage ? h('button.btn' + (vote.mode === 'live' ? '.btn-sec' : ''), {
                onclick: e => busy(e.target, () => setLive(this.gid, ctx.me.id, vote, vote.mode !== 'live')),
            }, vote.mode === 'live' ? t('stopLive') : h('span.live', t('goLive'))) : null,
            h('a.btn.btn-sec', { href: `#/g/${this.gid}/live/${vote.id}` }, t('liveView')),
            isOpen(vote) && canManage ? h('button.btn.btn-sec', {
                onclick: e => confirm(t('closeVote') + '?') && busy(e.target, () => updateVote(this.gid, vote.id, { status: 'closed', closedAt: new Date() })),
            }, t('closeVote')) : null,
            ...(finished && r ? this.followUps(ctx, vote, r, canManage) : []),
            canManage ? h('button.btn.btn-ghost', {
                onclick: e => confirm(t('confirmDelete')) && busy(e.target, async () => { await deleteVote(this.gid, vote.id); location.hash = `#/g/${this.gid}/votes`; }),
            }, t('delete')) : null);

        mount(body, head,
            h('div.grid.grid-side',
                h('div.stack',
                    vote.text ? h('div.text-box', vote.text) : null,
                    ballotBox ? section(t('vote'), null, ballotBox) : null,
                    r ? section(t('result'), isOpen(vote) ? badge(t('provisional'), 'accent') : null, this.renderResult(ctx, vote, r))
                        : h('p.note.blue', t('secretUntil')),
                    actions),
                h('div.stack',
                    section(t('voters', { n: voterNames.length }), null,
                        voterNames.length ? h('p.small', voterNames.join(', ')) : empty('—')),
                    r && !vote.secret && ballots.length ? section(t('nominal'), null, this.renderNominal(ctx, vote, r)) : null)));
    }

    async saveResult(vote, r) {
        const result = { winner: r.winner ?? null, passed: r.passed ?? null, counts: r.counts, turnout: r.turnout };
        try { await updateVote(this.gid, vote.id, { status: 'closed', result }); } catch { return; }
        const labels = this.optionLabels(vote);
        const outcome = isYesNo(vote) ? (r.passed ? 'passed' : 'rejected') : r.winner ? 'winner' : r.tie.length ? 'tie' : 'nowinner';
        // Las enmiendas no salen en portada: las cuenta la votación final
        if (vote.kind !== 'amendment') {
            await postNews(this.gid, this.app.me.id, 'vote_result',
                { title: vote.title, vid: vote.id, type: vote.type, outcome, winner: r.winner ? labels[r.winner] : null, counts: r.counts, labels: isYesNo(vote) ? null : labels },
                'result_' + vote.id);
        }
        // La votación final de una propuesta cierra la propuesta
        if (vote.kind === 'final' && vote.parentId) await updateVote(this.gid, vote.parentId, { status: 'closed', result: { passed: r.passed } }).catch(() => {});
    }

    // Pantalla del pleno: hemiciclo que se va llenando con cada voto, marcador grande y veredicto
    renderLive(main, ctx) {
        if (!this.state) return mount(main, loading());
        const { vote, ballots, voters } = this.state;
        if (!vote) return mount(main, empty('—'));
        const { d, me } = ctx;
        const finished = isFinished(vote);
        const visible = !this.state.ballotsHidden && (!vote.secret || finished);
        const labels = this.optionLabels(vote);
        const ids = Object.keys(labels);
        const colorOf = id => isYesNo(vote) ? YN_COLORS[id]
            : vote.type === 'election' ? d.party(id)?.color : PARTY_COLORS[ids.indexOf(id) % PARTY_COLORS.length];
        const byUid = Object.fromEntries(ballots.filter(b => b.uid).map(b => [b.uid, b]));
        const fresh = Date.now() - 4000;

        // Escaños por miembro en orden de partido; cada uno se pinta con lo que ha votado
        const electors = d.members.filter(m => vote.type !== 'leader' || m.partyId === vote.partyId);
        const ordered = [...d.parties.flatMap(p => electors.filter(m => m.partyId === p.id)), ...electors.filter(m => !d.party(m.partyId))];
        const seats = [];
        for (const m of ordered) {
            const n = perHead(vote) ? 1 : m.seats || 0;
            const b = byUid[m.id];
            const voted = voters.includes(m.id);
            const pick = b?.data?.choice ?? b?.data?.ranking?.[0] ?? b?.data?.approved?.[0];
            for (let i = 0; i < n; i++) {
                seats.push(voted
                    ? { color: !vote.secret && pick ? colorOf(pick) : 'var(--ink)', title: m.name, fresh: b?.createdAt?.toMillis?.() > fresh }
                    : { empty: true, title: m.name });
            }
        }
        const r = visible ? tally(vote, ballots, { totalSeats: d.total, partySeats: d.partySeats }) : null;
        if (finished && r && !vote.result && (vote.createdBy === me.id || d.isOwner) && !this.saving) {
            this.saving = true;
            this.saveResult(vote, r).finally(() => { this.saving = false; });
        }
        const castSeats = seats.filter(s => !s.empty).length;

        let verdict = null;
        if (finished && r) {
            verdict = isYesNo(vote)
                ? h(`div.live-verdict.${r.passed ? 'ok' : 'bad'}`, r.passed ? t('passed') : t('rejected'))
                : h('div.live-verdict', r.winner ? labels[r.winner] : r.tie.length ? t('tie') : t('noWinner'));
        }

        mount(main, h('div.live-screen',
            h('div.live-top',
                h('a.btn.btn-ghost.btn-sm', { href: `#/g/${this.gid}/v/${vote.id}` }, '← ' + t('back')),
                finished ? badge(t('closed'), 'ink') : h('span.badge.red.live', t('live')),
                isOpen(vote) && (vote.createdBy === me.id || d.isOwner) ? h('button.btn.btn-sm', {
                    onclick: e => confirm(t('closeVote') + '?') && busy(e.target, () => updateVote(this.gid, vote.id, { status: 'closed', closedAt: new Date() })),
                }, t('closeVote')) : null),
            h('div.live-kicker', d.group.name),
            h('h1.live-title', vote.title),
            h('div.live-hemi', hemicycle(seats)),
            h('div.live-count', h('b', castSeats), h('span', `/ ${seats.length}`)),
            verdict,
            r ? h('div.live-scores', ids.map(id => h('div.live-score', { style: { '--c': colorOf(id) || 'var(--ink)' } },
                h('b', r.counts[id] || 0), h('span', labels[id])))) : h('p.sub', { style: { textAlign: 'center' } }, t('secretUntil')),
            isYesNo(vote) && r ? h('div.live-bar', majorityBar(d, r.counts.yes, 'var(--green)')) : null));
    }

    optionLabels(vote) {
        if (isYesNo(vote)) return { yes: t('yes'), no: t('no'), abstain: t('abstain') };
        return Object.fromEntries((vote.options || []).map(o => [o.id, o.label]));
    }

    renderBallotBox(ctx, vote, iVoted) {
        const { d, me } = ctx;
        const mine = d.mine;
        if (iVoted) return h('p.note.blue', '✓ ' + t('voted'));
        if (vote.type === 'leader' && mine?.partyId !== vote.partyId) return h('p.note', `${t('type_leader')} · ${d.party(vote.partyId)?.short || ''}`);
        if (!perHead(vote) && !(mine?.seats > 0)) return h('p.note', t('cantVote'));
        const dr = this.draft;
        const rerender = () => this.app.refresh();
        let ui;
        const labels = this.optionLabels(vote);
        const method = isYesNo(vote) ? 'yesno' : vote.method;

        if (method === 'yesno') {
            ui = h('div.yn', ['yes', 'no', 'abstain'].map(c => h(`button.choice${dr.choice === c ? '.on' : ''}`,
                { type: 'button', onclick: () => { dr.choice = c; rerender(); } }, labels[c])));
        } else if (method === 'approval') {
            dr.approved ||= [];
            ui = h('div.choices', vote.options.map(o => {
                const on = dr.approved.includes(o.id);
                return h(`button.choice${on ? '.on' : ''}`, {
                    type: 'button', onclick: () => { dr.approved = on ? dr.approved.filter(x => x !== o.id) : [...dr.approved, o.id]; rerender(); },
                }, on ? '☑' : '☐', o.label);
            }));
        } else if (method === 'ranked') {
            dr.ranking ||= [];
            ui = h('div', h('p.sub', t('rank')), h('div.choices', vote.options.map(o => {
                const pos = dr.ranking.indexOf(o.id);
                return h(`button.choice${pos >= 0 ? '.on' : ''}`, {
                    type: 'button', onclick: () => { dr.ranking = pos >= 0 ? dr.ranking.filter(x => x !== o.id) : [...dr.ranking, o.id]; rerender(); },
                }, h('span.pos', pos >= 0 ? pos + 1 : '·'), o.label);
            })));
        } else if (method === 'points') {
            dr.scores ||= {};
            ui = h('div.choices', vote.options.map(o => h('div.choice', o.label,
                h('input', { type: 'number', min: 0, max: MAX_POINTS, value: dr.scores[o.id] ?? 0, oninput: e => { dr.scores[o.id] = Number(e.target.value) || 0; } }))));
        } else {
            ui = h('div.choices', vote.options.map(o => h(`button.choice${dr.choice === o.id ? '.on' : ''}`,
                { type: 'button', onclick: () => { dr.choice = o.id; rerender(); } }, dr.choice === o.id ? '◉' : '○', o.label)));
        }

        const ready = method === 'approval' ? dr.approved.length > 0
            : method === 'ranked' ? dr.ranking.length > 0
                : method === 'points' ? true : Boolean(dr.choice);
        const data = method === 'approval' ? { approved: dr.approved }
            : method === 'ranked' ? { ranking: dr.ranking }
                : method === 'points' ? { scores: dr.scores } : { choice: dr.choice };
        const btn = h('button.btn.btn-lg', {
            disabled: !ready,
            onclick: e => busy(e.target, () => castBallot(this.gid, vote, me, mine, d.parties, data)),
        }, t('vote') + (!perHead(vote) ? ` · ${mine.seats} ${t('seat')}${mine.seats === 1 ? '' : 's'}` : ''));

        return h('div', vote.discipline === 'bloc' ? h('p.note', t('blocNote')) : null, ui, h('div.row', { style: { marginTop: '12px' } }, btn));
    }

    renderResult(ctx, vote, r) {
        const { d } = ctx;
        const labels = this.optionLabels(vote);
        const ids = Object.keys(labels);
        const max = Math.max(1, ...Object.values(r.counts));
        const unit = vote.method === 'points' && !isYesNo(vote) ? t('points').toLowerCase() : '';
        const color = id => isYesNo(vote) ? { yes: 'var(--green)', no: 'var(--red)', abstain: 'var(--dim)' }[id]
            : vote.type === 'election' ? d.party(id)?.color || 'var(--ink)' : 'var(--ink)';

        let verdict;
        if (isYesNo(vote)) verdict = h(`div.verdict.${r.passed ? 'ok' : 'bad'}`, r.passed ? t('passed') : t('rejected'));
        else if (r.winner) verdict = h('div.verdict', `${t('winner')}: ${labels[r.winner]}`);
        else if (r.tie.length) verdict = h('div.verdict', `${t('tie')}: ${r.tie.map(id => labels[id]).join(' / ')}`);
        else verdict = h('div.verdict', t('noWinner'));

        const rows = ids.map(id => h(`div.result-row${id === r.winner ? '.win' : ''}`,
            h('span', labels[id]),
            h('div.bar', h('i', { style: { width: ((r.counts[id] || 0) / max) * 100 + '%', background: color(id) } })),
            h('span.num', `${r.counts[id] || 0}${unit ? ' ' + unit : ''}`)));

        const extra = [];
        if (isYesNo(vote) || vote.majority === 'absolute') {
            extra.push(h('div', { style: { marginTop: '12px' } }, majorityBar(d, isYesNo(vote) ? r.counts.yes : Math.max(0, ...Object.values(r.counts)), 'var(--green)')));
        }
        if (vote.method === 'ranked' && !isYesNo(vote) && r.rounds?.length > 1) {
            extra.push(h('div', { style: { marginTop: '12px' } }, r.rounds.map((round, i) => h('p.sub',
                `${t('round', { n: i + 1 })}: ` + Object.entries(round).map(([id, n]) => `${labels[id]} ${n}`).join(' · ')))));
        }
        if (vote.method === 'ranked' && r.condorcet) extra.push(h('p.sub', t('condorcet', { x: labels[r.condorcet] })));
        if (vote.type === 'election') {
            const alloc = dhondt(r.counts, d.group.totalSeats || 11);
            const seats = d.parties.flatMap(p => Array.from({ length: alloc[p.id] || 0 }, () => ({ color: p.color, title: p.short })));
            extra.push(section(t('projection'), h('span', d.group.totalSeats || 11),
                h('div.hemi-wrap', hemicycle(seats)),
                h('div.legend', d.parties.filter(p => alloc[p.id]).map(p => h('span', h('i.dot', { style: { background: p.color } }), p.short, h('b', alloc[p.id]))))));
        }

        const turnout = perHead(vote) ? t('voters', { n: r.ballots.length }) : t('turnout', { n: r.turnout, t: d.total });
        return h('div', verdict, rows, h('p.sub', turnout), ...extra);
    }

    renderNominal(ctx, vote, r) {
        const { d } = ctx;
        const labels = this.optionLabels(vote);
        const show = b => {
            const x = b.data;
            if (x.choice) return labels[x.choice] || '—';
            if (x.approved) return x.approved.map(id => labels[id]).join(', ');
            if (x.ranking) return x.ranking.map(id => labels[id]).join(' > ');
            if (x.scores) return Object.entries(x.scores).filter(([, s]) => s > 0).map(([id, s]) => `${labels[id]} ${s}`).join(', ');
            return '—';
        };
        return h('div.table-scroll', h('table.table', h('tbody', r.ballots.map(b => {
            const p = d.party(b.partyId);
            return h('tr', { style: { opacity: b.counted ? 1 : 0.45 } },
                h('td', p ? h('i.swatch', { style: { background: p.color, height: '14px' } }) : null, ' ', b.name || '—', b.leader ? ' ★' : ''),
                h('td', show(b)),
                h('td.num', b.counted ? b.weight : '—'));
        }))));
    }

    // Lo que se puede hacer cuando una votación acaba
    followUps(ctx, vote, r, canManage) {
        const { d, gid, me } = { ...ctx, gid: this.gid };
        const out = [];
        if (vote.type === 'office') {
            const hasRunoff = d.votes.some(v => v.parentId === vote.id && v.kind === 'runoff');
            if (!r.winner && canManage && !hasRunoff && (vote.options || []).length > 1) {
                out.push(h('button.btn', {
                    onclick: e => busy(e.target, async () => {
                        const top2 = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => id);
                        const vid = await createVote(gid, me.id, {
                            type: 'office', title: `${vote.office} · ${t('runoffOf')}`, office: vote.office, method: 'plurality', majority: 'simple',
                            options: vote.options.filter(o => top2.includes(o.id)), mode: vote.mode,
                            deadline: vote.mode === 'async' ? tomorrow() : null, secret: vote.secret, discipline: vote.discipline,
                            parentId: vote.id, kind: 'runoff', round: (vote.round || 1) + 1,
                        });
                        location.hash = `#/g/${gid}/v/${vid}`;
                    }),
                }, t('secondRound')));
            }
            const holder = d.group.offices?.[vote.office];
            if (r.winner && d.isOwner) {
                const done = holder?.uid === r.winner;
                out.push(h('button.btn', {
                    disabled: done,
                    onclick: e => busy(e.target, async () => {
                        await updateGroup(gid, { offices: { ...(d.group.offices || {}), [vote.office]: { uid: r.winner, name: d.memberName(r.winner) } } });
                        await postNews(gid, me.id, 'office_appointed', { who: d.memberName(r.winner), office: vote.office, vid: vote.id }, 'office_' + vote.id);
                        toast(t('appointed'));
                    }),
                }, done ? '✓ ' + t('appointed') : `${t('appoint')}: ${d.memberName(r.winner)}`));
            }
        }
        if (vote.type === 'election' && d.isOwner) {
            out.push(h('button.btn', {
                onclick: e => confirm(t('applySeats') + '?') && busy(e.target, async () => {
                    await applyElection(gid, me.id, d.group, d.members, d.parties, r.counts, vote.id);
                    toast(t('seatsApplied'));
                }),
            }, t('applySeats')));
        }
        // Censura aprobada: entra el candidato. Confianza perdida: el cargo queda vacante.
        const holder = d.group.offices?.[vote.office];
        const censureWon = vote.type === 'censure' && r.passed;
        const confidenceLost = vote.type === 'confidence' && !r.passed;
        if ((censureWon || confidenceLost) && d.isOwner) {
            const newHolder = censureWon ? { uid: vote.options[0].id, name: vote.options[0].label } : null;
            const done = censureWon ? holder?.uid === newHolder.uid : !holder?.uid;
            out.push(h('button.btn', {
                disabled: done,
                onclick: e => busy(e.target, async () => {
                    await updateGroup(gid, { offices: { ...(d.group.offices || {}), [vote.office]: newHolder } });
                    if (newHolder) await postNews(gid, me.id, 'office_appointed', { who: newHolder.name, office: vote.office, vid: vote.id }, 'office_' + vote.id);
                    toast(t('saved'));
                }),
            }, done ? '✓ ' + t('saved') : censureWon ? `${t('appoint')}: ${newHolder.name}` : t('vacateOffice')));
        }
        if (vote.type === 'leader' && r.winner && vote.status === 'closed' && d.party(vote.partyId)?.leaderId !== r.winner) {
            out.push(h('a.btn', { href: `#/g/${gid}/p/${vote.partyId}` }, t('applyLeader', { x: d.memberName(r.winner) })));
        }
        return out;
    }

    // Propuesta con enmiendas: cada enmienda es una votación sí/no hija; después, votación final
    renderBill(ctx, bill, canManage) {
        const { d, me, app } = ctx;
        const gid = this.gid;
        const amendments = d.votes.filter(v => v.parentId === bill.id && v.kind === 'amendment').reverse();
        const final = d.votes.find(v => v.parentId === bill.id && v.kind === 'final');

        const amendList = amendments.length ? h('div', amendments.map(a => h('a.item', { href: `#/g/${gid}/v/${a.id}` },
            h('div', { style: { flex: 1, minWidth: 0 } }, h('div', a.text || a.title), h('div.sub', `${t('by')} ${d.memberName(a.createdBy)}`)),
            statusBadge(a)))) : empty('—');

        let form = null;
        if (bill.status === 'amending') {
            const txt = h('textarea', { required: true, maxLength: 2000 });
            const btn = h('button.btn', { type: 'submit' }, t('proposeAmendment'));
            form = h('form.form', {
                onsubmit: e => {
                    e.preventDefault();
                    busy(btn, async () => {
                        const text = txt.value.trim();
                        const dl = deadlineOf(bill);
                        await createVote(gid, me.id, {
                            type: 'yesno', kind: 'amendment', parentId: bill.id, title: text.slice(0, 120), text,
                            majority: 'simple', mode: bill.mode, secret: bill.secret, discipline: bill.discipline,
                            deadline: bill.mode === 'async' ? (dl && dl > new Date() ? dl : tomorrow()) : null,
                        });
                        app.clean();
                    });
                },
            }, field(t('amendmentText'), txt), h('div.row', btn));
        }

        const closeBtn = bill.status === 'amending' && canManage ? h('button.btn.btn-lg', {
            onclick: e => busy(e.target, async () => {
                if (amendments.some(a => !isFinished(a))) throw fail(t('notFinished'));
                const accepted = [];
                for (const a of amendments) {
                    let passed = a.result?.passed;
                    if (passed == null) passed = tally(a, await getBallots(gid, a.id), { totalSeats: d.total, partySeats: d.partySeats }).passed;
                    if (passed) accepted.push(a.text || a.title);
                }
                const text = bill.text + (accepted.length ? `\n\n— ${t('amendments')} (${t('accepted').toLowerCase()}) —\n` + accepted.map((x, i) => `${i + 1}. ${x}`).join('\n') : '');
                const dl = deadlineOf(bill);
                const vid = await createVote(gid, me.id, {
                    type: 'yesno', kind: 'final', parentId: bill.id, title: `${t('finalVote')}: ${bill.title}`.slice(0, 140), text,
                    majority: bill.majority, mode: bill.mode, secret: bill.secret, discipline: bill.discipline,
                    deadline: bill.mode === 'async' ? (dl && dl > new Date() ? dl : tomorrow()) : null,
                });
                await updateVote(gid, bill.id, { status: 'final', finalId: vid });
                location.hash = `#/g/${gid}/v/${vid}`;
            }),
        }, t('closeAmendments')) : null;

        return h('div.grid.grid-side',
            h('div.stack',
                h('div.text-box', bill.text || '—'),
                final ? h('a.item', { href: `#/g/${gid}/v/${final.id}` }, h('h3', { style: { flex: 1 } }, t('finalVote')), statusBadge(final)) : null,
                closeBtn ? h('div.row', closeBtn) : null,
                canManage ? h('div.row', h('button.btn.btn-ghost', {
                    onclick: e => confirm(t('confirmDelete')) && busy(e.target, async () => { await deleteVote(gid, bill.id); location.hash = `#/g/${gid}/votes`; }),
                }, t('delete'))) : null),
            h('div.stack',
                section(t('amendments'), h('span', amendments.length), amendList),
                form ? section(t('proposeAmendment'), null, form) : null));
    }
}
