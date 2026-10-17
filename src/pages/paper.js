// El Periódico: la crónica de todo lo que pasa en la cámara, maquetado como un diario de papel.
import { t, lang } from '../i18n.js';
import { h, mount, fmtDate } from '../ui.js';
import { hemicycle, chamberSeats } from '../hemicycle.js';
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

const P = {
    es: {
        price: 'Precio: 0,00 €', quiet: 'Sin más novedades por ahora. La redacción sigue de guardia.', founded: 'Fundado en', by: 'Por la Redacción', today: 'La cámara, hoy',
        weatherOpen: n => `Previsión: ${n} votación${n === 1 ? '' : 'es'} abierta${n === 1 ? '' : 's'}, posibilidad de sorpresas`,
        weatherCalm: 'Previsión: calma chicha en la cámara',
        seats: 'esc.', majority: 'Mayoría', indep: 'Indep.',
        body: {
            vote_result: d => d.outcome === 'passed' ? `La cámara dio luz verde a «${d.title}». El resultado, ${votesLine(d)}, deja poco margen a la interpretación.`
                : d.outcome === 'rejected' ? `«${d.title}» no salió adelante. Con ${votesLine(d)}, los partidarios tendrán que volver a intentarlo o buscar apoyos nuevos.`
                    : d.outcome === 'winner' ? `«${d.winner}» se impuso en la votación sobre «${d.title}». Habrá quien pida la revisión del recuento.`
                        : `La votación sobre «${d.title}» terminó sin ganador claro. Todas las miradas, en los próximos movimientos.`,
            coalition_signed: d => `${(d.parties || []).join(', ')} estampan su firma. Juntos suman ${d.seats} escaños; ahora toca ver cuánto dura.`,
            coalition_proposed: d => `Se pone sobre la mesa un acuerdo entre ${(d.parties || []).join(' y ')}. Faltan firmas.`,
            party_founded: d => `${d.who} da el paso y registra ${d.party}. Busca afiliados desde hoy mismo.`,
            leader_elected: d => `Las bases de ${d.short} han hablado: ${d.who} toma el mando del partido.`,
            office_appointed: d => `${d.who} asume el cargo de ${d.office}. Sus adversarios ya preparan la oposición.`,
            seats_allocated: d => `Tras el recuento, el reparto queda así: ${(d.alloc || []).map(a => `${a.short} ${a.seats}`).join(', ')}. Empieza la ronda de contactos.`,
            member_joined: d => `${d.who} se estrena en la cámara. Su primera votación se espera con interés.`,
            group_created: d => `Queda constituida la cámara «${d.name}». ${d.who} abre la sesión; faltan diputados, partidos y, sobre todo, polémica.`,
            live_started: d => `La sesión está en marcha y se vota en este momento.`,
        },
    },
    en: {
        price: 'Price: £0.00', quiet: 'Nothing else to report yet. The newsroom stays on call.', founded: 'Founded', by: 'By our staff', today: 'The chamber today',
        weatherOpen: n => `Forecast: ${n} open vote${n === 1 ? '' : 's'}, chance of surprises`,
        weatherCalm: 'Forecast: dead calm in the chamber',
        seats: 'seats', majority: 'Majority', indep: 'Indep.',
        body: {
            vote_result: d => d.outcome === 'passed' ? `The chamber backed “${d.title}”. The result, ${votesLine(d)}, leaves little room for doubt.`
                : d.outcome === 'rejected' ? `“${d.title}” failed. With ${votesLine(d)}, its supporters will have to try again or find new allies.`
                    : d.outcome === 'winner' ? `“${d.winner}” won the vote on “${d.title}”. Expect calls for a recount.`
                        : `The vote on “${d.title}” ended with no clear winner. All eyes on what comes next.`,
            coalition_signed: d => `${(d.parties || []).join(', ')} put pen to paper. Together they hold ${d.seats} seats; now let’s see how long it lasts.`,
            coalition_proposed: d => `A deal between ${(d.parties || []).join(' and ')} is on the table. Signatures pending.`,
            party_founded: d => `${d.who} takes the plunge and registers ${d.party}. Recruiting starts today.`,
            leader_elected: d => `The ${d.short} membership has spoken: ${d.who} takes charge.`,
            office_appointed: d => `${d.who} becomes ${d.office}. Rivals are already plotting.`,
            seats_allocated: d => `After the count: ${(d.alloc || []).map(a => `${a.short} ${a.seats}`).join(', ')}. Let the talks begin.`,
            member_joined: d => `${d.who} takes a seat. Their first vote is awaited with interest.`,
            group_created: d => `The chamber “${d.name}” is now in session. ${d.who} opens proceedings; still missing: members, parties and, above all, drama.`,
            live_started: () => `The session is under way and voting right now.`,
        },
    },
};

function votesLine(d) {
    const c = d.counts || {};
    return t('votesFor', { y: c.yes || 0, n: c.no || 0, a: c.abstain || 0 });
}

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
    if (n.kind === 'vote_result' && d.counts && isYesNo(d)) return votesLine(d);
    if (n.kind === 'vote_result' && d.counts) return Object.entries(d.labels || {}).map(([id, l]) => `${l}: ${d.counts[id] || 0}`).join(' · ');
    return null;
}

const body = n => P[lang].body[n.kind]?.(n.data || {}) || null;
const kicker = n => SECTION_LABEL[lang][SECTION[n.kind] || 'chamber'];

function story(n, gid, size) {
    const d = n.data || {};
    const href = d.vid ? `#/g/${gid}/v/${d.vid}` : null;
    const title = h(href ? 'a' : 'span', href ? { href } : null, headline(n));
    const text = body(n);
    return h(`article.np-story.np-${size}`,
        h('div.np-kicker', d.color ? h('i.swatch', { style: { background: d.color } }) : null, kicker(n)),
        h(size === 'lead' ? 'h2' : 'h3', title),
        deck(n) && size !== 'brief' ? h('p.np-deck', deck(n)) : null,
        size === 'lead' ? h('div.np-byline', P[lang].by, ' · ', fmtDate(n.at)) : null,
        text && size !== 'brief' ? h('p.np-body' + (size === 'lead' ? '.np-drop' : '') + (size === 'lead' && text.length > 260 ? '.np-cols' : ''), text) : null,
        size !== 'lead' ? h('div.np-time', fmtDate(n.at)) : null);
}

// Recuadro de datos: cómo está la cámara hoy
function todayBox(d) {
    const rows = d.parties.filter(p => d.partySeats[p.id]).sort((a, b) => d.partySeats[b.id] - d.partySeats[a.id]);
    const indep = d.total - rows.reduce((s, p) => s + d.partySeats[p.id], 0);
    return h('aside.np-box',
        h('div.np-box-title', P[lang].today),
        h('figure.np-figure', hemicycle(chamberSeats(d.members, d.parties), { center: d.total || null })),
        h('table', h('tbody',
            rows.map(p => h('tr', h('td', h('i.swatch', { style: { background: p.color } }), ' ', p.short), h('td', d.partySeats[p.id]))),
            indep ? h('tr', h('td', P[lang].indep), h('td', indep)) : null,
            h('tr.np-maj', h('td', P[lang].majority), h('td', d.majority)))));
}

export function renderPaper(body_, ctx) {
    const { d, gid } = ctx;
    const pp = P[lang];
    const news = d.news.filter(n => n.at);
    const date = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const open = d.votes.filter(v => v.status === 'open').length;
    const founded = d.group.createdAt?.toDate?.().getFullYear?.() || new Date().getFullYear();

    const masthead = h('header.np-mast',
        h('div.np-ears', h('span', open ? pp.weatherOpen(open) : pp.weatherCalm), h('span', pp.price)),
        h('h1.np-title', t('paperOf', { g: d.group.name })),
        h('div.np-dateline', h('span', `${pp.founded} ${founded}`), h('span.np-date', date), h('span', t('edition', { n: news.length || 1 }))));

    if (!news.length) return mount(body_, h('div.np', masthead, h('p.np-empty', t('noNews'))));

    // Portada: la noticia de más peso entre las 8 últimas; el resto, por orden
    const recent = news.slice(0, 8);
    const lead = recent.reduce((best, n) => ((WEIGHT[n.kind] || 0) > (WEIGHT[best.kind] || 0) ? n : best), recent[0]);
    const rest = news.filter(n => n !== lead);

    mount(body_, h('div.np',
        masthead,
        h('div.np-front',
            h('div.np-lead', story(lead, gid, 'lead')),
            h('div.np-side', h('div.np-col-head', t('latest')), rest.length ? rest.slice(0, 4).map(n => story(n, gid, 'mid')) : h('p.np-time', pp.quiet)),
            todayBox(d)),
        rest.length > 4 ? h('section.np-briefs-wrap', h('div.np-col-head', t('inBrief')),
            h('div.np-briefs', rest.slice(4).map(n => story(n, gid, 'brief')))) : null));
}
