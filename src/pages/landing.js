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
        lede: 'Montad partidos, pactad, traicionad y votadlo todo: el delegado, el viaje de fin de curso, quién se queda la habitación grande. Con dos personas ya funciona. Con veinte, se pone serio.',
        ctaStart: 'Crear mi cuenta', ctaDemo: 'Probar a pactar',
        liveTag: 'Escrutinio en directo', party: 'Partido',
        coalition: 'Pacto', reaches: 'gobierna', short: 'se queda corto',
        ticker: [
            'Lucía, delegada en segunda vuelta',
            'Se rompe el pacto del piso de arriba',
            'Moción de censura al tesorero del piso: no prospera',
            'Referéndum: el grupo de WhatsApp cambia de nombre',
            'Los de la última fila fundan su propio partido',
            'Empate en el destino del viaje: habrá desempate',
            'APROBADO el cuadrante de limpieza con dos enmiendas',
        ],
        demoKicker: 'Pruébalo, no hace falta cuenta',
        demoQ: 'Forma gobierno en 2ºB',
        demoNote: 'Hubo elecciones a delegado y nadie llegó a la mayoría: 25 escaños, hacen falta 13. Tú lideras Última Fila. Elige socios.',
        demoYou: 'tú', demoAsks: 'Pide',
        demoParties: [
            ['Última Fila', 7, '#a8321f', null],
            ['Los Puntuales', 8, '#1d4e89', 'que nunca haya examen en lunes'],
            ['Los del Recreo', 5, '#1d7a52', '10 minutos más de recreo'],
            ['Club de Debate', 3, '#b8730b', 'la portavocía de la clase'],
            ['Marta, por libre', 2, '#6a3fa0', 'elegir el destino del viaje'],
        ],
        demoNeed: n => `Te faltan ${n}`, demoGov: 'Hay gobierno', demoDeal: 'A cambio',
        demoSpare: x => `Te sobra ${x}: podrías gobernar sin ese apoyo y sin pagar lo que pide.`,
        demoAgain: 'Empezar de nuevo',
        howTitle: 'Cómo se monta',
        how: [
            ['Uno crea el grupo', 'Elige las reglas o deja que un test de cinco preguntas las elija por ti.'],
            ['Pasa el enlace por WhatsApp', 'Quien lo abre crea su cuenta y aparece sentado en la cámara.'],
            ['Y a votar', 'Propuestas, enmiendas, cargos, referéndums. En directo o con plazo.'],
        ],
        usesTitle: 'Para qué la usa la gente',
        uses: [
            ['En clase', 'delegado, fecha del examen, a dónde va el viaje'],
            ['Con amigos', 'planes, quién organiza, el bote común'],
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
        lede: 'Form parties, make deals, betray them and vote on everything: the class rep, the end-of-year trip, who gets the big bedroom. It works with two people. With twenty, it gets serious.',
        ctaStart: 'Create my account', ctaDemo: 'Try making a deal',
        liveTag: 'Live count', party: 'Party',
        coalition: 'Deal', reaches: 'governs', short: 'falls short',
        ticker: [
            'Lucy elected class rep in a run-off',
            'Upstairs flat deal collapses',
            'No-confidence motion against the flat treasurer fails',
            'Referendum: the group chat gets a new name',
            'Back-row students found their own party',
            'Deadlock on the trip destination: run-off called',
            'Cleaning rota PASSES with two amendments',
        ],
        demoKicker: 'Try it, no account needed',
        demoQ: 'Form a government in Year 10',
        demoNote: 'The class rep election left nobody with a majority: 25 seats, 13 needed. You lead the Back Row. Pick your partners.',
        demoYou: 'you', demoAsks: 'Wants',
        demoParties: [
            ['Back Row', 7, '#a8321f', null],
            ['The Punctuals', 8, '#1d4e89', 'no exams on Mondays, ever'],
            ['Break Time Crew', 5, '#1d7a52', '10 more minutes of break'],
            ['Debate Club', 3, '#b8730b', 'to be the class spokesperson'],
            ['Marta, on her own', 2, '#6a3fa0', 'to choose where the trip goes'],
        ],
        demoNeed: n => `${n} short`, demoGov: 'We have a government', demoDeal: 'In exchange',
        demoSpare: x => `You don't need ${x}: you could govern without them and without paying their price.`,
        demoAgain: 'Start over',
        howTitle: 'How it works',
        how: [
            ['Someone creates the group', 'Pick the rules or let a five-question quiz pick them for you.'],
            ['Share the link in the group chat', 'Whoever opens it signs up and takes a seat.'],
            ['Start voting', 'Motions, amendments, offices, referendums. Live or with a deadline.'],
        ],
        usesTitle: 'What people use it for',
        uses: [
            ['At school', 'class rep, exam date, where the trip goes'],
            ['With friends', 'plans, who organises, the shared kitty'],
            ['In a flat', 'cleaning rota, shared shopping, the new TV'],
            ['In a team', 'captain, kit, the end-of-season kitty'],
        ],
        paperLine: 'And everything that happens makes the group’s Gazette, front page and all.',
        joinTitle: 'Get in', joinText: 'Name, email and password. That’s it.',
    },
};

// Partidos de la portada: solo letras, para no evocar a nadie
const PARTIES = [['#a8321f', 'A'], ['#b8730b', 'B'], ['#1d7a52', 'C'], ['#1d4e89', 'D'], ['#6a3fa0', 'E']];
const TOTAL = 31;

// Alguna animación pequeña; se para sola cuando la portada deja de estar en pantalla
function every(ms, node, fn) {
    const id = setInterval(() => { if (!node.isConnected) clearInterval(id); else fn(); }, ms);
}

// Hemiciclo de "noche electoral": los escaños bailan y un pacto cambia de forma
function liveChamber(c) {
    const seats = [9, 4, 6, 10, 2];
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

// Demo sin cuenta: formar gobierno eligiendo socios. Enseña lo que hace distinta a Ágora: los pactos.
function demo(c) {
    const parties = c.demoParties;
    const total = parties.reduce((s, p) => s + p[1], 0);
    const maj = majorityOf(total);
    const picked = new Set([0]);
    const box = h('div.land-demo-body');

    const paint = () => {
        const seats = parties.flatMap(([name, n, color], i) => Array.from({ length: n }, () => ({ color, title: name, dim: !picked.has(i) })));
        const sum = [...picked].reduce((s, i) => s + parties[i][1], 0);
        const gov = sum >= maj;
        // Socios que sobran: si se van, seguís llegando a la mayoría
        const spare = gov ? [...picked].filter(i => i !== 0 && sum - parties[i][1] >= maj) : [];

        mount(box,
            h('p.sub', c.demoNote),
            h('div.demo-chamber', hemicycle(seats, { center: `${sum}/${maj}` })),
            h('div.demo-parties', parties.map(([name, n, color, asks], i) => h(`button.demo-party${picked.has(i) ? '.on' : ''}`, {
                type: 'button', disabled: i === 0, style: { '--c': color },
                onclick: () => { picked.has(i) ? picked.delete(i) : picked.add(i); paint(); },
            },
                h('span.demo-party-head', h('i.dot', { style: { background: color } }), h('b', name), h('span.mono', n)),
                h('small', i === 0 ? c.demoYou : `${c.demoAsks}: ${asks}`)))),
            gov
                ? h('div.demo-result.ok',
                    h('b', `${c.demoGov} · ${sum}/${total}`),
                    h('span', `${c.demoDeal}: `, [...picked].filter(i => i !== 0).map(i => parties[i][3]).join('; ') + '.'),
                    spare.length ? h('span.demo-spare', c.demoSpare(spare.map(i => parties[i][0]).join(', '))) : null,
                    h('button.link', { type: 'button', onclick: () => { picked.clear(); picked.add(0); paint(); } }, c.demoAgain))
                : h('div.demo-result', h('b', c.demoNeed(maj - sum))));
    };
    paint();
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
