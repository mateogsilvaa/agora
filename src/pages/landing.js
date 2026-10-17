// Portada para quien aún no tiene cuenta: tiene que entrar por los ojos y dejar probar sin registrarse.
import { lang } from '../i18n.js';
import { h, mount } from '../ui.js';
import { hemicycle } from '../hemicycle.js';
import { majorityOf } from '../tally.js';

const COPY = {
    es: {
        kicker: 'Diario de sesiones · nº 1',
        before: 'Tu', after: 'es un parlamento.',
        words: ['clase', 'cuadrilla', 'piso', 'equipo', 'peña', 'familia'],
        lede: 'Montad partidos, pactad, traicionad y votadlo todo: la cena del viernes, el delegado, el viaje de fin de curso. Con dos personas ya funciona. Con veinte, se pone serio.',
        ctaStart: 'Crear mi cuenta', ctaDemo: 'Probar una votación',
        liveTag: 'Escrutinio en directo', seats: 'escaños', majority: 'mayoría',
        coalition: 'Pacto', reaches: 'gobierna', short: 'se queda corto',
        ticker: [
            'APROBADA la cena del viernes por 6 votos a 3',
            'El Partido del Sofá rompe con la Coalición Playa',
            'Lucía, delegada en segunda vuelta',
            'Moción de censura al tesorero del piso: no prospera',
            'Referéndum: el grupo de WhatsApp cambia de nombre',
            'Los de la última fila fundan su propio partido',
            'Empate en la votación del destino: habrá desempate',
        ],
        demoKicker: 'Pruébalo, no hace falta cuenta',
        demoQ: '¿Dónde cenamos el viernes?',
        demoNote: 'Tú tienes 1 escaño. Los otros seis votan cuando votes tú.',
        demoOpts: ['Tacos', 'Pizza', 'Sushi'],
        demoWait: 'Contando votos…', demoWin: 'Gana', demoAgain: 'Otra vez', demoHeadline: x => `${x.toUpperCase()} SE IMPONE EN UNA NOCHE AJUSTADA`,
        howTitle: 'Cómo se monta',
        how: [
            ['Uno crea el grupo', 'Elige las reglas o deja que un test de cinco preguntas las elija por ti.'],
            ['Pasa el enlace por WhatsApp', 'Quien lo abre crea su cuenta y aparece sentado en la cámara.'],
            ['Y a votar', 'Propuestas, enmiendas, cargos, referéndums. En directo o con plazo.'],
        ],
        usesTitle: 'Para qué la usa la gente',
        uses: [
            ['En clase', 'delegado, fecha del examen, a dónde va el viaje'],
            ['Con amigos', 'planes, cenas, quién lleva el coche'],
            ['En el piso', 'turnos de limpieza, compras comunes, la tele nueva'],
            ['En un equipo', 'capitán, equipación, el bote de fin de temporada'],
        ],
        paperLine: 'Y todo lo que pasa sale en El Periódico del grupo, con portada y titulares.',
        joinTitle: 'Entra', joinText: 'Nombre, correo y contraseña. Nada más.',
    },
    en: {
        kicker: 'Hansard · issue no. 1',
        before: 'Your', after: 'is a parliament.',
        words: ['class', 'crew', 'flat', 'team', 'club', 'family'],
        lede: 'Form parties, make deals, betray them and vote on everything: Friday dinner, the class rep, the end-of-year trip. It works with two people. With twenty, it gets serious.',
        ctaStart: 'Create my account', ctaDemo: 'Try a vote',
        liveTag: 'Live count', seats: 'seats', majority: 'majority',
        coalition: 'Deal', reaches: 'governs', short: 'falls short',
        ticker: [
            'Friday dinner PASSES 6 votes to 3',
            'Sofa Party breaks with the Beach Coalition',
            'Lucy elected class rep in a run-off',
            'No-confidence motion against the flat treasurer fails',
            'Referendum: the group chat gets a new name',
            'Back-row students found their own party',
            'Deadlock on the trip destination: run-off called',
        ],
        demoKicker: 'Try it, no account needed',
        demoQ: 'Where do we eat on Friday?',
        demoNote: 'You have 1 seat. The other six vote once you do.',
        demoOpts: ['Tacos', 'Pizza', 'Sushi'],
        demoWait: 'Counting votes…', demoWin: 'Winner', demoAgain: 'Again', demoHeadline: x => `${x.toUpperCase()} WINS A TIGHT NIGHT`,
        howTitle: 'How it works',
        how: [
            ['Someone creates the group', 'Pick the rules or let a five-question quiz pick them for you.'],
            ['Share the link in the group chat', 'Whoever opens it signs up and takes a seat.'],
            ['Start voting', 'Motions, amendments, offices, referendums. Live or with a deadline.'],
        ],
        usesTitle: 'What people use it for',
        uses: [
            ['At school', 'class rep, exam date, where the trip goes'],
            ['With friends', 'plans, dinners, who drives'],
            ['In a flat', 'cleaning rota, shared shopping, the new TV'],
            ['In a team', 'captain, kit, the end-of-season kitty'],
        ],
        paperLine: 'And everything that happens makes the group’s Gazette, front page and all.',
        joinTitle: 'Get in', joinText: 'Name, email and password. That’s it.',
    },
};

const PARTIES = [['#a8321f', 'PRG'], ['#b8730b', 'CEN'], ['#1d7a52', 'VRD'], ['#1d4e89', 'AZL'], ['#6a3fa0', 'IND']];
const TOTAL = 31;

// Alguna animación pequeña; se para sola cuando la portada deja de estar en pantalla
function every(ms, node, fn) {
    const id = setInterval(() => { if (!node.isConnected) clearInterval(id); else fn(); }, ms);
}

// Hemiciclo de "noche electoral": los escaños bailan y un pacto cambia de forma
function liveChamber(c) {
    let seats = [9, 4, 6, 10, 2];
    const box = h('div.land-hemi');
    const caption = h('div.land-cap');
    const wrap = h('figure.land-live', h('div.land-tag', h('span.live', c.liveTag)), box, caption);
    const maj = majorityOf(TOTAL);
    let pact = [0, 1];
    const paint = () => {
        const list = seats.flatMap((n, i) => Array.from({ length: n }, () => ({ color: PARTIES[i][0], dim: !pact.includes(i) })));
        mount(box, hemicycle(list, { center: TOTAL }));
        const sum = pact.reduce((s, i) => s + seats[i], 0);
        mount(caption,
            h('span', `${c.coalition} `, pact.map(i => PARTIES[i][1]).join(' + ')),
            h('b', ` ${sum}/${TOTAL} `),
            h('span' + (sum >= maj ? '.ok' : '.bad'), sum >= maj ? c.reaches : c.short));
    };
    paint();
    every(2600, wrap, () => {
        // Un escaño cambia de manos y, a veces, el pacto también
        const from = seats.findIndex((n, i) => n > 1 && Math.random() < 0.4 + i * 0.05);
        const to = Math.floor(Math.random() * seats.length);
        if (from >= 0 && from !== to) { seats[from]--; seats[to]++; }
        if (Math.random() < 0.35) {
            const order = seats.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
            pact = Math.random() < 0.5 ? [order[0], order[2]] : [order[1], order[2], order[3]];
        }
        paint();
    });
    return wrap;
}

function rotatingWord(words) {
    const span = h('span.land-word', words[0]);
    let i = 0;
    every(2200, span, () => {
        i = (i + 1) % words.length;
        span.classList.remove('in');
        void span.offsetWidth; // reinicia la animación
        span.textContent = words[i];
        span.classList.add('in');
    });
    return span;
}

function ticker(items) {
    const line = [...items, ...items].map(x => h('span', x));
    return h('div.land-ticker', { 'aria-hidden': 'true' }, h('div.land-ticker-in', line));
}

// Demo sin cuenta: votas tú y el resto del "grupo" vota después
function demo(c) {
    const box = h('div.land-demo-body');
    const draw = () => {
        mount(box,
            h('p.sub', c.demoNote),
            h('div.choices', c.demoOpts.map((o, i) => h('button.choice', { type: 'button', onclick: () => run(i) }, '○ ', o))));
    };
    const run = mine => {
        const colors = ['#a8321f', '#b8730b', '#1d4e89'];
        const votes = [mine];
        const render = done => {
            const counts = c.demoOpts.map((_, i) => votes.filter(v => v === i).length);
            const seats = c.demoOpts.flatMap((_, i) => Array.from({ length: counts[i] }, () => ({ color: colors[i] })))
                .concat(Array.from({ length: 7 - votes.length }, () => ({ empty: true })));
            const win = counts.indexOf(Math.max(...counts));
            mount(box,
                h('div.hemi-wrap.small', hemicycle(seats, { center: votes.length })),
                h('div.land-demo-rows', c.demoOpts.map((o, i) => h('div.result-row' + (done && i === win ? '.win' : ''),
                    h('span', o), h('div.bar', h('i', { style: { width: (counts[i] / 7) * 100 + '%', background: colors[i] } })), h('span.num', counts[i])))),
                done ? h('div.land-demo-end',
                    h('p.land-headline', c.demoHeadline(c.demoOpts[win])),
                    h('button.btn.btn-sec.btn-sm', { type: 'button', onclick: draw }, c.demoAgain))
                    : h('p.sub', c.demoWait));
        };
        render(false);
        // Seis votos más, con un poco de suspense
        const others = Array.from({ length: 6 }, () => (Math.random() < 0.45 ? mine : Math.floor(Math.random() * 3)));
        others.forEach((v, k) => setTimeout(() => { if (!box.isConnected) return; votes.push(v); render(votes.length === 7); }, 450 * (k + 1)));
    };
    draw();
    return h('section.land-demo', { id: 'demo' },
        h('div.eyebrow', c.demoKicker), h('h2.land-h2', c.demoQ), box);
}

export function renderLanding(main, form) {
    const c = COPY[lang];
    const go = id => () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    mount(main,
        h('section.land-hero',
            h('div.land-copy',
                h('div.eyebrow', c.kicker),
                h('h1.land-title', c.before, ' ', rotatingWord(c.words), h('br'), c.after),
                h('p.land-lede', c.lede),
                h('div.row', h('button.btn.btn-lg', { onclick: go('join') }, c.ctaStart), h('button.btn.btn-sec.btn-lg', { onclick: go('demo') }, c.ctaDemo))),
            liveChamber(c)),
        ticker(c.ticker),
        h('div.land-grid',
            demo(c),
            h('section.land-how',
                h('h2.land-h2', c.howTitle),
                h('ol.land-steps', c.how.map(([a, b]) => h('li', h('b', a), h('span', b)))))),
        h('section.land-uses',
            h('h2.land-h2', c.usesTitle),
            h('dl', c.uses.map(([a, b]) => [h('dt', a), h('dd', b)])),
            h('p.land-paperline', c.paperLine)),
        h('section.land-join', { id: 'join' },
            h('div', h('h2.land-h2', c.joinTitle), h('p', c.joinText)),
            form));
}
