import { t } from '../i18n.js';
import { h, mount, field, busy, section, empty, loading, badge, select, toast, pageHead, PARTY_COLORS } from '../ui.js';
import {
    watchGroup, leaveGroup, deleteGroup, updateGroup, setSeats, setAllSeats, kick, setParty, setMyName,
    createParty, deleteParty, createCoalition, signCoalition, deleteCoalition, createVote, applyLeader, postNews,
    roomOfParty, LEADERS_ROOM, inviteLink, renameInvite,
} from '../data.js';
import { hemicycle, chamberSeats } from '../hemicycle.js';
import { majorityOf, minimalWinning } from '../tally.js';
import { renderVotes, renderNewVote, VotePage, isFinished } from './votes.js';
import { renderPaper } from './paper.js';
import { Chat } from './chat.js';
import { openWizard } from '../wizard.js';
import { markSeen, unreadCount, notifButton, hasSeenPaper } from '../notify.js';

const ICONS = {
    chamber: 'M3 18h18M5 18a7 7 0 0 1 14 0M8.5 18a3.5 3.5 0 0 1 7 0',
    parties: 'M4 21V4h11l-1 4h6v9h-9l1-4H6',
    votes: 'M4 13l4 4L20 5',
    paper: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
};
const icon = d => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>`;
    return s;
};

// Datos derivados que usan todas las pestañas
export function derive(state, me) {
    const { group, members, parties, coalitions } = state;
    const partySeats = {};
    for (const m of members) if (m.partyId) partySeats[m.partyId] = (partySeats[m.partyId] || 0) + (m.seats || 0);
    const total = members.reduce((s, m) => s + (m.seats || 0), 0);
    const mine = members.find(m => m.id === me.id) || null;
    const party = id => parties.find(p => p.id === id) || null;
    const memberName = id => members.find(m => m.id === id)?.name || '—';
    const isOwner = group.ownerId === me.id;
    const ledParty = parties.find(p => p.leaderId === me.id && mine?.partyId === p.id) || null;
    const coalitionInfo = c => {
        const ps = c.parties.map(party).filter(Boolean);
        const seats = ps.reduce((s, p) => s + (partySeats[p.id] || 0), 0);
        return { ps, seats, active: ps.length >= 2 && ps.every(p => c.signed.includes(p.leaderId)) };
    };
    return { ...state, partySeats, total, majority: majorityOf(total), mine, party, memberName, isOwner, ledParty, coalitionInfo, coalitions };
}

export class GroupPage {
    constructor(gid, app) {
        this.gid = gid;
        this.app = app;
        this.state = null;
        this.voteView = null;
        this.chats = {};
        this.calc = new Set();
        this.unsub = watchGroup(gid, s => { this.state = s; app.refresh(); });
    }

    destroy() {
        this.unsub();
        this.voteView?.destroy();
        Object.values(this.chats).forEach(c => c.destroy());
        document.body.classList.remove('live-mode');
    }

    // Chat persistente por sala: se crea una vez y se vuelve a colocar en cada repintado
    chat(room, d) {
        this.chats[room] ||= new Chat(this.gid, room, this.app.me);
        this.chats[room].update(d.mine?.name, d.group.chatHours);
        return this.chats[room].el;
    }

    render(main, route) {
        const me = this.app.me;
        if (!this.state?.loaded) return mount(main, loading());
        if (!this.state.group) {
            // Borrado o te han echado: a inicio, que allí se limpia la lista
            toast(t('groupGone'), true);
            location.hash = '#/';
            return mount(main, loading());
        }
        const d = derive(this.state, me);
        const ctx = { gid: this.gid, me, d, app: this.app, page: this };
        const g = d.group;
        const tab = route.tab;

        if (tab !== 'v' && tab !== 'live') { this.voteView?.destroy(); this.voteView = null; }
        document.body.classList.toggle('live-mode', tab === 'live');

        // Pantalla del pleno: sin cabecera ni pestañas, para proyectar
        if (tab === 'live') {
            if (this.voteView?.vid !== route.arg) { this.voteView?.destroy(); this.voteView = new VotePage(this.gid, route.arg, this.app); }
            return this.voteView.renderLive(main, ctx);
        }

        if (tab === 'paper') markSeen(this.gid, d.news);
        const unread = unreadCount(this.gid, d.news, me.id);
        const liveVotes = d.votes.filter(v => v.mode === 'live' && v.status === 'open' && !isFinished(v));

        const tabs = [['chamber', t('chamber')], ['parties', t('parties')], ['votes', t('votes')], ['paper', t('paper')], ['settings', t('settings')]];
        const active = { v: 'votes', new: 'votes', p: 'parties' }[tab] || tab;
        const tabLink = (k, label, withIcon) => h(`a${k === active ? '.on' : ''}`, { href: `#/g/${this.gid}/${k}` },
            withIcon ? icon(ICONS[k]) : null, h('span', label),
            k === 'paper' && unread ? h('i.unread', unread) : null,
            k === 'votes' && liveVotes.length ? h('i.unread.red', '●') : null);
        const copy = h('button.btn.btn-sm', { onclick: () => shareInvite(g) }, t('share'));

        const body = h('div');
        mount(main,
            liveVotes.length ? h('a.live-strip', { href: `#/g/${this.gid}/v/${liveVotes[0].id}` }, h('span.live', t('liveNow')), liveVotes[0].title) : null,
            pageHead(t('seatMode_' + g.seatMode), g.name, null, h('span.invite', { title: t('inviteCode') }, g.code, copy)),
            h('nav.tabs', tabs.map(([k, label]) => tabLink(k, label))),
            h('nav.bottom-nav', tabs.map(([k, label]) => tabLink(k, label, true))),
            body,
        );

        if (tab === 'parties') return renderParties(body, ctx);
        if (tab === 'p') return renderPartyHQ(body, ctx, route.arg);
        if (tab === 'votes') return renderVotes(body, ctx);
        if (tab === 'new') return renderNewVote(body, ctx, route.arg);
        if (tab === 'paper') return renderPaper(body, ctx);
        if (tab === 'settings') return renderSettings(body, ctx);
        if (tab === 'v') {
            if (this.voteView?.vid !== route.arg) { this.voteView?.destroy(); this.voteView = new VotePage(this.gid, route.arg, this.app); }
            return this.voteView.render(body, ctx);
        }
        return renderChamber(body, ctx);
    }
}

// ---------- Piezas comunes ----------
// Invitar: en el móvil, la hoja nativa de compartir; si no hay, WhatsApp y copiar enlace
export async function shareInvite(g) {
    const url = inviteLink(g.code);
    const text = t('shareText', { g: g.name });
    if (navigator.share) {
        try { await navigator.share({ title: 'Ágora · ' + g.name, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const close = () => sheet.remove();
    const sheet = h('div.install-sheet', { onclick: e => { if (e.target === sheet) close(); } }, h('div.install-card',
        h('h2', t('share')),
        h('p.code', { style: { fontSize: '13px', overflowWrap: 'anywhere' } }, url),
        h('a.btn.btn-xl', { href: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, target: '_blank', rel: 'noopener', onclick: close }, t('whatsapp')),
        h('button.btn.btn-sec.btn-xl', { onclick: () => { navigator.clipboard?.writeText(url); toast(t('copied')); close(); } }, t('copyLink')),
        h('button.btn.btn-ghost', { onclick: close }, t('cancel'))));
    document.body.append(sheet);
}

function firstSteps(ctx) {
    const { d, gid } = ctx;
    const steps = [
        [d.members.length >= 2, 'step1', 'step1t', h('button.btn.btn-sm', { onclick: () => shareInvite(d.group) }, t('share'))],
        [Boolean(d.party(d.mine?.partyId)), 'step2', 'step2t', h('a.btn.btn-sm.btn-sec', { href: `#/g/${gid}/parties` }, '→')],
        [d.votes.length > 0, 'step3', 'step3t', h('a.btn.btn-sm.btn-sec', { href: `#/g/${gid}/new` }, '→')],
        [hasSeenPaper(gid), 'step4', 'step4t', h('a.btn.btn-sm.btn-sec', { href: `#/g/${gid}/paper` }, '→')],
    ];
    if (steps.every(s => s[0])) return null;
    return section(t('firstSteps'), h('span', `${steps.filter(s => s[0]).length}/4`),
        h('ol.steps', steps.map(([done, a, b, btn]) => h(`li${done ? '.done' : ''}`,
            h('div.grow', h('b', t(a)), h('span.small.muted', t(b))), done ? null : btn))));
}
function legend(d, members = d.members) {
    const items = d.parties.map(p => [p.color, p.short, d.partySeats[p.id] || 0]).filter(x => x[2] > 0);
    const indep = members.filter(m => !m.partyId || !d.party(m.partyId)).reduce((s, m) => s + (m.seats || 0), 0);
    if (indep) items.push(['var(--dim)', t('independent'), indep]);
    return h('div.legend', items.map(([c, n, s]) => h('span', h('i.dot', { style: { background: c } }), n, h('b', s))));
}

export function majorityBar(d, seats, color = 'var(--ink)') {
    const pct = d.total ? Math.min(100, (seats / d.total) * 100) : 0;
    const line = d.total ? (d.majority / d.total) * 100 : 50;
    return h('div',
        h('div.bar', h('i', { style: { width: pct + '%', background: color } }), h('span.line', { style: { left: `calc(${line}% - 1px)` } })),
        h('div.bar-label', h('span', `${seats} / ${d.total}`),
            h('span', seats >= d.majority ? t('reachesMajority') : t('short', { n: d.majority - seats }))));
}

const partyChip = (p, d, on, onclick) => h(`button.chip${on ? '.on' : ''}`, { type: 'button', onclick, style: { '--c': p.color } },
    h('i.dot', { style: { background: p.color } }), p.short, h('b', d.partySeats[p.id] || 0));

// Calculadora de pactos: suma escaños de los partidos marcados y enseña las mayorías posibles.
// Con `own`, la calculadora es la de un partido: siempre lo incluye y busca sus socios.
function calculator(ctx, { own = null } = {}) {
    const { d, page, app, gid, me } = ctx;
    const sel = page.calc;
    if (own) sel.add(own.id);
    for (const id of [...sel]) if (!d.party(id)) sel.delete(id);
    const seats = [...sel].reduce((s, id) => s + (d.partySeats[id] || 0), 0);
    const reaches = d.total > 0 && seats >= d.majority;
    const options = minimalWinning(d.partySeats, d.majority, own?.id).slice(0, 6);
    const canPropose = d.ledParty && sel.size >= 2 && sel.has(d.ledParty.id);

    const toggle = id => () => { if (own && id === own.id) return; sel.has(id) ? sel.delete(id) : sel.add(id); app.refresh(); };
    const pick = parties => () => { sel.clear(); parties.forEach(id => sel.add(id)); app.refresh(); };
    const label = ids => ids.map(id => d.party(id)?.short).join(' + ');

    return h('div.calc',
        h('p.sub', t('calcHint')),
        h('div.chips', d.parties.filter(p => d.partySeats[p.id] > 0 || sel.has(p.id)).map(p => partyChip(p, d, sel.has(p.id), toggle(p.id)))),
        h('div.calc-sum',
            h('div.hemi-wrap.small', hemicycle(chamberSeats(d.members, d.parties, { highlight: sel }))),
            h('div.calc-total', h('b', seats), h('span', '/ ' + d.majority)),
            majorityBar(d, seats, reaches ? 'var(--green)' : 'var(--accent)')),
        canPropose ? h('div.row', h('button.btn.btn-sm', {
            onclick: e => busy(e.target, async () => {
                const ids = [...sel];
                await createCoalition(gid, me.id, { name: 'Pacto ' + label(ids), parties: ids, labels: ids.map(id => d.party(id).short) });
                toast(t('saved'));
            }),
        }, t('proposeThis'))) : null,
        h('div.block-title', { style: { marginTop: '18px' } }, h('h3', own ? t('yourOptions') : t('reachesMajority'))),
        options.length
            ? h('ol.options', options.map(o => h('li', h('button.link', { onclick: pick(o.parties) },
                o.parties.length === 1 ? `${label(o.parties)} · ${t('alone')}` : label(o.parties)), h('span.mono', o.seats))))
            : h('p.empty', t('noOptions')));
}

// ---------- Cámara ----------
function renderChamber(body, ctx) {
    const { d, me, gid } = ctx;
    const g = d.group;
    const activeCoalitions = d.coalitions.filter(c => d.coalitionInfo(c).active);
    const offices = Object.entries(g.offices || {});

    const seatInput = m => {
        const inp = h('input', { type: 'number', min: 0, max: 1000, value: m.seats, style: { width: '76px' } });
        inp.onchange = () => busy(inp, async () => { await setSeats(gid, m.id, Math.max(0, Math.round(Number(inp.value) || 0))); toast(t('saved')); });
        return inp;
    };

    mount(body,
        firstSteps(ctx),
        h('div.stats',
            [[d.members.length, t('members')], [d.total, t('seats')], [d.total ? d.majority : '—', t('majority')],
                [d.parties.length, t('parties')], [activeCoalitions.length, t('coalitions')]]
                .map(([n, l]) => h('div.stat', h('b', n), h('span', l)))),
        g.seatMode === 'election' && d.total === 0 ? h('p.note', t('firstElection')) : null,
        h('div.grid.grid-side',
            h('div.stack',
                h('figure.chamber-fig', h('div.hemi-wrap', hemicycle(chamberSeats(d.members, d.parties), { label: g.name, center: d.total || null })), legend(d)),
                section(t('members'), h('span', d.members.length),
                    h('div.table-scroll', h('table.table',
                        h('thead', h('tr', h('th', t('name')), h('th', t('parties')), h('th.num', t('seats')), d.isOwner ? h('th') : null)),
                        h('tbody', d.members.map(m => {
                            const p = d.party(m.partyId);
                            return h(`tr${m.id === me.id ? '.me' : ''}`,
                                h('td', m.name, m.id === g.ownerId ? ' ★' : ''),
                                h('td', p ? h('a.row', { href: `#/g/${gid}/p/${p.id}` }, h('i.swatch', { style: { background: p.color } }), p.short) : h('span.muted', t('independent'))),
                                h('td.num', d.isOwner && g.seatMode === 'manual' ? seatInput(m) : m.seats),
                                d.isOwner ? h('td.num', m.id !== me.id ? h('button.btn.btn-ghost.btn-sm', {
                                    onclick: e => confirm(t('confirmDelete')) && busy(e.target, () => kick(gid, m.id)),
                                }, t('kick')) : null) : null);
                        })))))),
            h('div.stack',
                d.parties.length ? section(t('calculator'), null, calculator(ctx)) : null,
                section(t('offices'), null, offices.length
                    ? h('ul.list', offices.map(([name, o]) => h('li', h('b.grow', name), h('span', o?.name || t('vacant')))))
                    : empty('—')),
                section(t('coalitions'), h('a', { href: `#/g/${gid}/parties` }, '→'), d.coalitions.length
                    ? h('ul.list', d.coalitions.map(c => coalitionItem(ctx, c, false)))
                    : empty(t('noCoalitions'))))),
    );
}

function coalitionItem(ctx, c, full) {
    const { d, me, gid } = ctx;
    const info = d.coalitionInfo(c);
    const myParty = d.ledParty && c.parties.includes(d.ledParty.id);
    const signed = c.signed.includes(me.id);
    return h('li', h('div.grow',
        h('div.row-between', h('b', c.name), badge(info.active ? t('coalitionActive') : t('coalitionPending'), info.active ? 'green' : 'accent')),
        h('div.row.small', info.ps.map(p => h('span.row', h('i.dot', { style: { background: p.color } }), p.short, c.signed.includes(p.leaderId) ? ' ✓' : ' …'))),
        full ? h('div.hemi-wrap.small', { style: { margin: '8px 0' } }, hemicycle(chamberSeats(d.members, d.parties, { highlight: new Set(c.parties) }))) : null,
        majorityBar(d, info.seats, info.active ? 'var(--green)' : 'var(--accent)'),
        full ? h('div.row', { style: { marginTop: '8px' } },
            myParty ? h('button.btn.btn-sm' + (signed ? '.btn-sec' : ''), {
                onclick: e => busy(e.target, async () => {
                    await signCoalition(gid, c.id, me.id, !signed);
                    // Si con esta firma ya firman todos, sale en el periódico
                    const nowSigned = signed ? c.signed.filter(x => x !== me.id) : [...c.signed, me.id];
                    if (!signed && info.ps.every(p => nowSigned.includes(p.leaderId))) {
                        await postNews(gid, me.id, 'coalition_signed', { name: c.name, parties: info.ps.map(p => p.short), seats: info.seats }, 'coal_' + c.id);
                    }
                }),
            }, signed ? t('unsign') : t('sign')) : null,
            c.createdBy === me.id || d.isOwner ? h('button.btn.btn-ghost.btn-sm', { onclick: e => confirm(t('confirmDelete')) && busy(e.target, () => deleteCoalition(gid, c.id)) }, t('delete')) : null) : null));
}

// ---------- Partidos y pactos ----------
function renderParties(body, ctx) {
    const { d, me, gid, app, page } = ctx;
    const mine = d.mine;

    const partyList = d.parties.length ? h('ul.list', d.parties.map(p => {
        const ms = d.members.filter(m => m.partyId === p.id);
        const inIt = mine?.partyId === p.id;
        return h('li',
            h('i.swatch', { style: { background: p.color, height: '34px' } }),
            h('a.grow', { href: `#/g/${gid}/p/${p.id}` },
                h('div.row', h('b', p.name), h('span.badge', p.short)),
                h('div.small.muted', `${t('leader')}: ${d.memberName(p.leaderId)} · ${ms.length} ${t('partyMembers').toLowerCase()}`)),
            h('span.mono', `${d.partySeats[p.id] || 0}`),
            inIt ? badge(p.leaderId === me.id ? t('leader') : t('you'), 'ink')
                : h('button.btn.btn-sm', { onclick: e => busy(e.target, () => setParty(gid, me.id, p.id, { who: mine.name, short: p.short, color: p.color })) }, t('joinParty')),
        );
    })) : empty(t('noParties'));

    const pName = h('input', { required: true, maxLength: 50 });
    const pShort = h('input', { required: true, maxLength: 6, style: { textTransform: 'uppercase' } });
    const pColor = h('input', { type: 'color', value: PARTY_COLORS[d.parties.length % PARTY_COLORS.length] });
    const pBtn = h('button.btn', { type: 'submit' }, t('newParty'));
    const full = d.group.bipartisan && d.parties.length >= 2;
    const partyForm = d.ledParty ? null : full ? h('p.note', t('bipartisanFull')) : h('form.form', {
        onsubmit: e => {
            e.preventDefault();
            busy(pBtn, async () => { await createParty(gid, me.id, mine.name, { name: pName.value.trim(), short: pShort.value.trim(), color: pColor.value }); app.clean(); });
        },
    }, h('div.fields', field(t('partyName'), pName), field(t('partyShort'), pShort), field(t('color'), pColor)), h('div.row', pBtn));

    const coalitionList = d.coalitions.length ? h('ul.list', d.coalitions.map(c => coalitionItem(ctx, c, true))) : empty(t('noCoalitions'));

    let coalitionForm = null;
    if (d.ledParty && d.parties.length >= 2) {
        const cName = h('input', { required: true, maxLength: 60 });
        const boxes = d.parties.map(p => h('input', { type: 'checkbox', value: p.id, checked: p.id === d.ledParty.id }));
        const cBtn = h('button.btn', { type: 'submit' }, t('newCoalition'));
        coalitionForm = h('form.form', {
            onsubmit: e => {
                e.preventDefault();
                const parties = boxes.filter(b => b.checked).map(b => b.value);
                if (parties.length < 2) return toast(t('pickParties'), true);
                busy(cBtn, async () => { await createCoalition(gid, me.id, { name: cName.value.trim(), parties, labels: parties.map(id => d.party(id).short) }); app.clean(); });
            },
        }, field(t('coalitionName'), cName),
        h('div.row', d.parties.map((p, i) => h('label.check', boxes[i], h('i.dot', { style: { background: p.color } }), p.short))),
        h('div.row', cBtn));
    }

    mount(body, h('div.grid.grid-2',
        h('div.stack',
            section(t('parties'), h('span', d.parties.length), partyList),
            partyForm ? section(t('newParty'), null, partyForm) : null,
            d.ledParty ? section(t('leadersRoom'), h('span', '★'), page.chat(LEADERS_ROOM, d)) : null),
        h('div.stack', section(t('coalitions'), h('span', d.coalitions.length), coalitionList), coalitionForm ? section(t('newCoalition'), null, coalitionForm) : null)));
}

// ---------- Sede de un partido ----------
function renderPartyHQ(body, ctx, pid) {
    const { d, me, gid, page } = ctx;
    const p = d.party(pid);
    if (!p) return mount(body, empty('—'), h('a.btn.btn-sec', { href: `#/g/${gid}/parties` }, t('back')));
    const ms = d.members.filter(m => m.partyId === p.id);
    const inIt = d.mine?.partyId === p.id;
    const isLeader = p.leaderId === me.id;
    const leaderVotes = d.votes.filter(v => v.type === 'leader' && v.partyId === p.id);

    // Elección interna: un afiliado = un voto, candidatos todos los afiliados
    let electForm = null;
    if (inIt && ms.length > 1) {
        const mode = select('mode', ['live', 'async'].map(m => [m, t('mode_' + m)]), 'live');
        const secret = h('input', { type: 'checkbox' });
        const btn = h('button.btn', { type: 'submit' }, t('leaderElection'));
        electForm = h('form.form', {
            onsubmit: e => {
                e.preventDefault();
                busy(btn, async () => {
                    const vid = await createVote(gid, me.id, {
                        type: 'leader', partyId: p.id, partyLabel: p.short, title: `${t('type_leader')} · ${p.short}`,
                        options: ms.map(m => ({ id: m.id, label: m.name })), method: 'plurality', majority: 'simple',
                        mode: mode.value, deadline: mode.value === 'async' ? new Date(Date.now() + 864e5) : null, secret: secret.checked, discipline: 'free',
                    });
                    ctx.app.clean();
                    location.hash = `#/g/${gid}/v/${vid}`;
                });
            },
        }, h('div.fields', field(t('modeLabel'), mode)), h('label.check', secret, t('secret')), h('div.row', btn));
    }

    const pending = leaderVotes.find(v => isFinished(v) && v.result?.winner && v.result.winner !== p.leaderId && v.status === 'closed');

    mount(body,
        h('div.party-band', { style: { '--c': p.color } },
            h('div', h('div.eyebrow', t('partyPage')), h('h2.party-name', p.name), h('div.sub', `${p.short} · ${t('leader')}: ${d.memberName(p.leaderId)}`)),
            h('div.party-seats', h('b', d.partySeats[p.id] || 0), h('span', t('seats')))),
        h('div.grid.grid-2',
            h('div.stack',
                section(t('partyMembers'), h('span', ms.length), h('ul.list', ms.map(m => h('li', h('span.grow', m.name, m.id === p.leaderId ? ' ★' : ''), h('span.mono', m.seats))))),
                h('div.row',
                    inIt && !isLeader ? h('button.btn.btn-sec.btn-sm', { onclick: e => busy(e.target, () => setParty(gid, me.id, null, { who: d.mine.name, short: p.short, color: p.color })) }, t('leaveParty')) : null,
                    !inIt ? h('button.btn.btn-sm', { onclick: e => busy(e.target, () => setParty(gid, me.id, p.id, { who: d.mine.name, short: p.short, color: p.color })) }, t('joinParty')) : null,
                    (isLeader || d.isOwner) ? h('button.btn.btn-ghost.btn-sm', {
                        onclick: e => confirm(t('confirmDelete')) && busy(e.target, async () => {
                            if (d.isOwner) for (const m of ms) await setParty(gid, m.id, null);
                            else await setParty(gid, me.id, null);
                            await deleteParty(gid, me.id, p);
                            location.hash = `#/g/${gid}/parties`;
                        }),
                    }, t('delete')) : null),
                pending && inIt ? h('p.note', h('button.btn.btn-sm', {
                    onclick: e => busy(e.target, () => applyLeader(gid, me.id, p, pending, d.memberName(pending.result.winner))),
                }, t('applyLeader', { x: d.memberName(pending.result.winner) }))) : null,
                electForm ? section(t('leaderElection'), null, electForm) : null,
                leaderVotes.length ? section(t('type_leader'), null, h('div', leaderVotes.map(v => h('a.item', { href: `#/g/${gid}/v/${v.id}` },
                    h('span', { style: { flex: 1 } }, v.title), v.result?.winner ? h('span.small', '★ ' + d.memberName(v.result.winner)) : null)))) : null),
            h('div.stack',
                inIt ? section(t('partyChat'), null, page.chat(roomOfParty(p.id), d)) : null,
                section(t('calculator'), null, calculator(ctx, { own: p })))),
    );
}

// ---------- Ajustes ----------
function renderSettings(body, ctx) {
    const { d, me, gid, app } = ctx;
    const g = d.group;

    const myName = h('input', { required: true, maxLength: 40, value: d.mine?.name || '' });
    const nameBtn = h('button.btn.btn-sec', { type: 'submit' }, t('save'));
    const nameForm = h('form.form', {
        onsubmit: e => { e.preventDefault(); busy(nameBtn, async () => { await setMyName(gid, me.id, myName.value.trim()); app.clean(); toast(t('saved')); }); },
    }, field(t('name'), myName), h('div.row', nameBtn));

    let ownerForm = null;
    if (d.isOwner) {
        const name = h('input', { required: true, maxLength: 60, value: g.name });
        const seatMode = select('seatMode', ['member', 'election', 'manual'].map(m => [m, t('seatMode_' + m)]), g.seatMode);
        const discipline = select('discipline', ['free', 'bloc', 'choose'].map(m => [m, t('discipline_' + m)]), g.discipline);
        const totalSeats = h('input', { type: 'number', min: 1, max: 1000, value: g.totalSeats || 11 });
        const chatHours = h('input', { type: 'number', min: 1, max: 168, value: g.chatHours || 24 });
        const bipartisan = h('input', { type: 'checkbox', checked: Boolean(g.bipartisan) });
        const btn = h('button.btn', { type: 'submit' }, t('save'));
        const help = h('button.btn.btn-sec', {
            type: 'button',
            onclick: () => openWizard(s => {
                seatMode.value = s.seatMode; discipline.value = s.discipline; totalSeats.value = s.totalSeats;
                bipartisan.checked = s.bipartisan; chatHours.value = s.chatHours;
                btn.closest('form').dispatchEvent(new Event('input', { bubbles: true }));
            }),
        }, '? ' + t('helpMeChoose'));
        ownerForm = h('form.form', {
            onsubmit: e => {
                e.preventDefault();
                busy(btn, async () => {
                    const mode = seatMode.value;
                    await updateGroup(gid, {
                        name: name.value.trim(), seatMode: mode, discipline: discipline.value,
                        totalSeats: Number(totalSeats.value) || 11, chatHours: Math.min(168, Math.max(1, Number(chatHours.value) || 24)),
                        bipartisan: bipartisan.checked,
                    });
                    if (name.value.trim() !== g.name) renameInvite(g.code, name.value.trim());
                    // Pasar a "1 persona = 1 escaño" iguala a todos
                    if (mode === 'member' && g.seatMode !== 'member') await setAllSeats(gid, d.members, () => 1);
                    app.clean(); toast(t('saved'));
                });
            },
        }, field(t('groupName'), name), h('div.row', help),
        h('div.fields', field(t('seatModeLabel'), seatMode), field(t('totalSeats'), totalSeats), field(t('disciplineLabel'), discipline), field(t('chatHours'), chatHours)),
        h('label.check', bipartisan, t('bipartisan')),
        h('div.row', btn));
    }

    mount(body, h('div.grid.grid-2',
        h('div.stack', section(t('name'), null, nameForm), section(t('notifications'), null, notifButton()), ownerForm ? section(t('settings'), null, ownerForm) : null),
        section(d.isOwner ? t('deleteGroup') : t('leaveGroup'), null,
            h('button.btn.btn-danger', {
                onclick: e => confirm(t('confirmDelete')) && busy(e.target, async () => {
                    if (d.isOwner) await deleteGroup(me, g); else await leaveGroup(me, gid, d.mine?.name);
                    location.hash = '#/';
                }),
            }, d.isOwner ? t('deleteGroup') : t('leaveGroup')))));
}
