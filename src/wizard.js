// "Ayúdame a elegir": cinco preguntas y una propuesta de ajustes que luego se puede retocar.
import { lang } from './i18n.js';
import { h } from './ui.js';

const Q = {
    es: [
        ['size', '¿Cuántos sois?', [['small', 'De 2 a 5'], ['mid', 'De 6 a 15'], ['big', 'Más de 15']]],
        ['purpose', '¿Para qué lo vais a usar?', [['friends', 'Amigos: planes, cenas, viajes'], ['class', 'Clase o curso'], ['org', 'Trabajo, piso o asociación'], ['sim', 'Simular un parlamento de verdad']]],
        ['parties', '¿Queréis partidos y pactos?', [['lots', 'Sí, con todo el salseo'], ['light', 'Algo ligero'], ['none', 'No, cada uno a lo suyo']]],
        ['discipline', 'Cuando un partido vota…', [['free', 'Cada uno vota lo que quiere'], ['bloc', 'Manda el portavoz'], ['choose', 'Depende de la votación']]],
        ['sides', '¿Cuántos bandos?', [['two', 'Dos: gobierno y oposición'], ['many', 'Los que salgan']]],
    ],
    en: [
        ['size', 'How many of you?', [['small', '2 to 5'], ['mid', '6 to 15'], ['big', 'More than 15']]],
        ['purpose', 'What is it for?', [['friends', 'Friends: plans, dinners, trips'], ['class', 'A class or course'], ['org', 'Work, flat or club'], ['sim', 'Simulating a real parliament']]],
        ['parties', 'Do you want parties and deals?', [['lots', 'Yes, all the drama'], ['light', 'Something light'], ['none', 'No, everyone on their own']]],
        ['discipline', 'When a party votes…', [['free', 'Everyone votes as they like'], ['bloc', 'The leader decides'], ['choose', 'Depends on the vote']]],
        ['sides', 'How many sides?', [['two', 'Two: government and opposition'], ['many', 'As many as appear']]],
    ],
};

const TXT = {
    es: { title: 'Ayúdame a elegir', step: 'Pregunta {n} de {t}', result: 'Te proponemos', apply: 'Usar estos ajustes', back: 'Atrás', close: 'Cerrar', edit: 'Puedes cambiar cualquier cosa después.' },
    en: { title: 'Help me choose', step: 'Question {n} of {t}', result: 'Our suggestion', apply: 'Use these settings', back: 'Back', close: 'Close', edit: 'You can change anything afterwards.' },
};

const WHY = {
    es: {
        election: 'Elecciones internas con D\'Hondt: los partidos compiten por los escaños.',
        member: '1 persona = 1 escaño: simple y justo para un grupo así.',
        seats: n => `${n} escaños en la cámara para que haya mayorías y minorías claras.`,
        free: 'Voto libre: nadie obliga a nadie.', bloc: 'Voto en bloque: el portavoz vota por su partido.', choose: 'La disciplina se decide en cada votación.',
        bip: 'Bipartidismo: solo dos partidos, gobierno y oposición.',
        chat: h => `Los chats se borran a las ${h} h.`,
    },
    en: {
        election: 'Internal elections with D\'Hondt: parties compete for seats.',
        member: '1 person = 1 seat: simple and fair for a group like this.',
        seats: n => `${n} seats in the chamber so majorities are clear.`,
        free: 'Free vote: nobody forces anybody.', bloc: 'Bloc vote: the leader votes for the party.', choose: 'Discipline is chosen per vote.',
        bip: 'Two-party system: only two parties, government and opposition.',
        chat: h => `Chats are deleted after ${h} h.`,
    },
};

export function suggest(a) {
    const politics = a.purpose === 'sim' || (a.parties === 'lots' && a.size !== 'small');
    const s = {
        seatMode: politics && a.parties !== 'none' ? 'election' : 'member',
        totalSeats: { small: 11, mid: 25, big: 51 }[a.size] || 11,
        discipline: a.parties === 'none' ? 'free' : a.discipline || 'choose',
        bipartisan: a.sides === 'two' && a.parties !== 'none',
        chatHours: { friends: 24, class: 12, org: 72, sim: 48 }[a.purpose] || 24,
    };
    const w = WHY[lang];
    s.reasons = [
        s.seatMode === 'election' ? w.election : w.member,
        s.seatMode === 'election' ? w.seats(s.totalSeats) : null,
        w[s.discipline],
        s.bipartisan ? w.bip : null,
        w.chat(s.chatHours),
    ].filter(Boolean);
    return s;
}

export function openWizard(onApply) {
    const qs = Q[lang], tx = TXT[lang];
    const answers = {};
    let i = 0;
    const card = h('div.install-card.wizard');
    const sheet = h('div.install-sheet', { onclick: e => { if (e.target === sheet) sheet.remove(); } }, card);

    const paint = () => {
        card.replaceChildren();
        if (i < qs.length) {
            const [key, question, opts] = qs[i];
            card.append(
                h('div.eyebrow', tx.step.replace('{n}', i + 1).replace('{t}', qs.length)),
                h('div.wiz-bar', h('i', { style: { width: `${(i / qs.length) * 100}%` } })),
                h('h2', question),
                h('div.choices', opts.map(([v, label]) => h(`button.choice${answers[key] === v ? '.on' : ''}`, {
                    type: 'button', onclick: () => { answers[key] = v; i++; paint(); },
                }, label))),
                h('div.row-between', i > 0 ? h('button.btn.btn-ghost', { onclick: () => { i--; paint(); } }, '← ' + tx.back) : h('span'),
                    h('button.btn.btn-ghost', { onclick: () => sheet.remove() }, tx.close)));
        } else {
            const s = suggest(answers);
            card.append(
                h('div.eyebrow', tx.title),
                h('h2', tx.result),
                h('ul.wiz-result', s.reasons.map(r => h('li', r))),
                h('p.sub', tx.edit),
                h('button.btn.btn-xl', { onclick: () => { sheet.remove(); onApply(s); } }, tx.apply),
                h('button.btn.btn-ghost', { onclick: () => { i--; paint(); } }, '← ' + tx.back));
        }
    };
    paint();
    document.body.append(sheet);
}
