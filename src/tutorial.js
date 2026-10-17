// Mini tutorial al entrar por primera vez en un grupo (se puede reabrir con el botón "?")
import { lang } from './i18n.js';
import { h } from './ui.js';
import { hemicycle } from './hemicycle.js';

const SLIDES = {
    es: [
        ['La cámara', 'Esto es tu grupo visto como un parlamento. Cada persona tiene escaños; el semicírculo enseña quién manda y la línea del centro marca la mayoría.'],
        ['Partidos y pactos', 'Funda un partido o únete a uno. Los portavoces firman pactos y la calculadora te dice qué combinaciones llegan a la mayoría.'],
        ['Votaciones', 'Propuestas de sí o no, elegir entre opciones, enmiendas, cargos, referéndums y mociones de censura. Con plazo o en directo.'],
        ['El Periódico', 'Cada votación, pacto o traición sale publicada. Es lo primero que vas a querer leer al entrar.'],
        ['Falta gente', 'Un parlamento vacío no tiene gracia. Pasa el enlace por el grupo de WhatsApp y entran en un minuto.'],
    ],
    en: [
        ['The chamber', 'This is your group as a parliament. Everyone has seats; the semicircle shows who’s in charge and the centre line marks the majority.'],
        ['Parties and deals', 'Found a party or join one. Leaders sign deals and the calculator tells you which combinations reach a majority.'],
        ['Votes', 'Yes/no motions, multiple choice, amendments, offices, referendums and no-confidence motions. With a deadline or live.'],
        ['The Gazette', 'Every vote, deal or betrayal gets published. It’s the first thing you’ll want to read.'],
        ['Bring people in', 'An empty parliament is no fun. Drop the link in the group chat and they’re in within a minute.'],
    ],
};
const UI = {
    es: { next: 'Siguiente', back: 'Atrás', skip: 'Saltar', done: 'A la cámara', invite: 'Invitar ahora' },
    en: { next: 'Next', back: 'Back', skip: 'Skip', done: 'To the chamber', invite: 'Invite now' },
};

const KEY = gid => 'agora.tour.' + gid;
export function tourSeen(gid) { try { return Boolean(localStorage.getItem(KEY(gid))); } catch { return true; } }
const markSeen = gid => { try { localStorage.setItem(KEY(gid), '1'); } catch { /* */ } };

// Dibujos pequeños de cada diapositiva, hechos con las mismas piezas de la app
function art(i) {
    const P = [['#a8321f', 5], ['#b8730b', 2], ['#1d7a52', 3], ['#1d4e89', 4]];
    const seats = (dimFrom = 99) => P.flatMap(([c, n], k) => Array.from({ length: n }, () => ({ color: c, dim: k >= dimFrom })));
    if (i === 0) return h('div.hemi-wrap.small', hemicycle(seats(), { center: 14 }));
    if (i === 1) return h('div.hemi-wrap.small', hemicycle(seats(2), { center: '7+2' }));
    if (i === 2) return h('div.tut-yn', h('span.ok', 'SÍ 8'), h('span.bad', 'NO 5'), h('span', 'ABS 1'));
    if (i === 3) return h('div.tut-paper', h('small', 'EL PERIÓDICO'), h('b', 'APROBADA LA CENA DEL VIERNES'), h('i'), h('i'), h('i.short'));
    return h('div.tut-link', 'votagora.es/#/join/••••••');
}

export function openTutorial(gid, onInvite) {
    const slides = SLIDES[lang], ui = UI[lang];
    let i = 0;
    const card = h('div.install-card.tutorial');
    const close = () => { markSeen(gid); sheet.remove(); document.removeEventListener('keydown', onKey); };
    const sheet = h('div.install-sheet', { onclick: e => { if (e.target === sheet) close(); } }, card);
    const onKey = e => {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight' && i < slides.length - 1) { i++; paint(); }
        if (e.key === 'ArrowLeft' && i > 0) { i--; paint(); }
    };

    const paint = () => {
        const [title, text] = slides[i];
        const last = i === slides.length - 1;
        card.replaceChildren(
            h('div.row-between', h('span.eyebrow', `${i + 1} / ${slides.length}`), h('button.btn.btn-ghost.btn-sm', { onclick: close }, ui.skip)),
            h('div.tut-art', art(i)),
            h('h2', title),
            h('p', text),
            h('div.tut-dots', slides.map((_, k) => h(`button${k === i ? '.on' : ''}`, { 'aria-label': String(k + 1), onclick: () => { i = k; paint(); } }))),
            h('div.row-between',
                i > 0 ? h('button.btn.btn-ghost', { onclick: () => { i--; paint(); } }, '← ' + ui.back) : h('span'),
                last
                    ? h('div.row', h('button.btn.btn-sec', { onclick: close }, ui.done), h('button.btn', { onclick: () => { close(); onInvite(); } }, ui.invite))
                    : h('button.btn', { onclick: () => { i++; paint(); } }, ui.next + ' →')));
    };
    paint();
    document.addEventListener('keydown', onKey);
    document.body.append(sheet);
}
