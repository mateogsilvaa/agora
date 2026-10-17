// El Periódico: la crónica de todo lo que pasa en la cámara, maquetado como un diario.
import { t, lang } from '../i18n.js';
import { h, mount, fmtDate } from '../ui.js';
import { hemicycle } from '../hemicycle.js';
import { isYesNo } from '../tally.js';

// Sección a la que pertenece cada noticia (el "cintillo" sobre el titular)
const SECTION = {
    group_created: 'chamber', member_joined: 'chamber', member_left: 'chamber', seats_allocated: 'elections', office_appointed: 'chamber',
    party_founded: 'parties', party_dissolved: 'parties', party_joined: 'parties', party_left: 'parties', leader_elected: 'parties',
    coalition_proposed: 'deals', coalition_signed: 'deals',
    vote_opened: 'votes', amendment_tabled: 'votes', vote_result: 'votes', live_started: 'votes',
};
const SECTION_LABEL = {
    es: { chamber: 'Cámara', elections: 'Elecciones', parties: 'Partidos', deals: 'Pactos', votes: 'Votaciones' },
    en: { chamber: 'Chamber', elections: 'Elections', parties: 'Parties', deals: 'Deals', votes: 'Votes' },
};
// Lo que merece portada
const WEIGHT = { vote_result: 5, seats_allocated: 6, coalition_signed: 5, leader_elected: 4, office_appointed: 4, live_started: 3, party_founded: 3, coalition_proposed: 2 };

export function headline(n) {
    const d = n.data || {};
    if (n.kind === 'vote_result') {
        const key = { passed: 'n_vote_passed', rejected: 'n_vote_rejected', winner: 'n_vote_winner', tie: 'n_vote_tie' }[d.outcome] || 'n_vote_nowinner';
        return t(key, { title: d.title, winner: d.winner || '' });
    }
    if (n.kind === 'seats_allocated') return t('n_seats_allocated', { alloc: (d.alloc || []).map(a => `${a.short} ${a.seats}`).join(', ') });
    if (n.kind === 'coalition_proposed' || n.kind === 'coalition_signed') return t('n_' + n.kind, { ...d, parties: (d.parties || []).join(' + ') });
    return t('n_' + n.kind, d);
}

function deck(n) {
    const d = n.data || {};
    if (n.kind === 'vote_result' && d.counts && isYesNo(d)) {
        return t('votesFor', { y: d.counts.yes || 0, n: d.counts.no || 0, a: d.counts.abstain || 0 });
    }
    if (n.kind === 'vote_result' && d.counts) return Object.entries(d.labels || {}).map(([id, l]) => `${l}: ${d.counts[id] || 0}`).join(' · ');
    return null;
}

const kicker = n => SECTION_LABEL[lang][SECTION[n.kind] || 'chamber'];

function story(n, gid, size) {
    const d = n.data || {};
    const href = d.vid ? `#/g/${gid}/v/${d.vid}` : null;
    const title = h(href ? 'a' : 'span', href ? { href } : null, headline(n));
    const art = h(`article.story.story-${size}`,
        h('div.kicker', d.color ? h('i.swatch', { style: { background: d.color } }) : null, kicker(n)),
        h(size === 'lead' ? 'h2' : 'h3', title),
        deck(n) ? h('p.deck', deck(n)) : null,
        h('div.byline', fmtDate(n.at)));
    if (size === 'lead' && n.kind === 'seats_allocated') {
        const seats = (d.alloc || []).flatMap(a => Array.from({ length: a.seats }, () => ({ color: a.color, title: a.short })));
        art.append(h('div.hemi-wrap', { style: { maxWidth: '380px' } }, hemicycle(seats)));
    }
    return art;
}

export function renderPaper(body, ctx) {
    const { d, gid } = ctx;
    const news = d.news.filter(n => n.at);
    const date = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const masthead = h('header.masthead',
        h('div.mast-top', h('span', date), h('span', t('edition', { n: news.length || 1 })), h('span', `${d.total} ${t('seats').toLowerCase()}`)),
        h('h1.mast-title', t('paperOf', { g: d.group.name })),
        h('div.mast-bottom', h('span', t('chronicle'))));

    if (!news.length) return mount(body, h('div.paper', masthead, h('p.empty', { style: { textAlign: 'center' } }, t('noNews'))));

    // Portada: la noticia de más peso entre las 8 últimas; el resto, por orden
    const recent = news.slice(0, 8);
    const lead = recent.reduce((best, n) => ((WEIGHT[n.kind] || 0) > (WEIGHT[best.kind] || 0) ? n : best), recent[0]);
    const rest = news.filter(n => n !== lead);
    const latest = rest.slice(0, 4);
    const brief = rest.slice(4);

    mount(body, h('div.paper',
        masthead,
        h('div.front',
            h('div.front-lead', story(lead, gid, 'lead')),
            h('aside.front-side', h('div.col-head', t('latest')), latest.map(n => story(n, gid, 'mid')))),
        brief.length ? h('section', h('div.col-head', t('inBrief')), h('div.briefs', brief.map(n => story(n, gid, 'brief')))) : null));
}
