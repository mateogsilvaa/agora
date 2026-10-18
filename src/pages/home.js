import { t } from '../i18n.js';
import { h, mount, field, busy, section, empty, loading, badge, select } from '../ui.js';
import { getGroups, joinGroup, createGroup, pruneGroups } from '../data.js';
import { notifButton } from '../notify.js';
import { openWizard } from '../wizard.js';

export async function renderHome(main, app) {
    const me = app.me;
    const list = h('div', loading());

    const code = h('input', { name: 'code', required: true, maxLength: 12, placeholder: 'ABC234', style: { textTransform: 'uppercase', fontFamily: 'var(--mono)', letterSpacing: '.2em' } });
    const joinBtn = h('button.btn', { type: 'submit' }, t('join'));
    const full = !me.premium && me.groups.length >= 1;
    const joinForm = h('form.form', {
        onsubmit: e => {
            e.preventDefault();
            busy(joinBtn, async () => { const gid = await joinGroup(me, code.value); location.hash = `#/g/${gid}`; });
        },
    },
        full ? h('p.note', t('freeLimit')) : null,
        h('div.inline-form', code, joinBtn),
    );
    code.setAttribute('aria-label', t('inviteCode'));
    if (full) { code.disabled = true; joinBtn.disabled = true; }

    // Crear grupo: nombre y listo. Lo demás (escaños, disciplina, partidos…) en "Más opciones".
    let createBlock;
    const room = me.premium || me.groups.length === 0;
    if (room) {
        const name = h('input', { name: 'name', required: true, maxLength: 60, placeholder: t('groupNamePh') });
        const seatMode = select('seatMode', ['member', 'election', 'manual'].map(m => [m, t('seatMode_' + m)]), 'member');
        const discipline = select('discipline', ['free', 'bloc', 'choose'].map(m => [m, t('discipline_' + m)]), 'free');
        const totalSeats = h('input', { type: 'number', name: 'totalSeats', min: 1, max: 1000, value: 11 });
        const seatsField = field(t('totalSeats'), totalSeats);
        const parties = h('input', { type: 'checkbox' });
        const bipartisan = h('input', { type: 'checkbox' });
        const sync = () => {
            seatsField.hidden = seatMode.value !== 'election';
            // Con elecciones los partidos hacen falta
            if (seatMode.value === 'election') parties.checked = true;
            bipartisan.closest('label').hidden = !parties.checked;
        };
        seatMode.onchange = sync; parties.onchange = sync;
        let chatHours = 24;
        const btn = h('button.btn', { type: 'submit' }, t('create'));
        const more = h('details.more',
            h('summary', t('moreOptions')),
            h('div.form', { style: { marginTop: '12px' } },
                h('div.row', h('button.btn.btn-sec.btn-sm', {
                    type: 'button',
                    onclick: () => openWizard(s => {
                        seatMode.value = s.seatMode; discipline.value = s.discipline; totalSeats.value = s.totalSeats;
                        parties.checked = s.parties; bipartisan.checked = s.bipartisan; chatHours = s.chatHours;
                        sync(); more.open = true; name.focus();
                    }),
                }, t('helpMeChoose')), h('span.sub', { style: { margin: 0 } }, t('helpMeChooseSub'))),
                h('label.check', parties, t('partiesOn')),
                h('label.check', bipartisan, t('bipartisan')),
                h('div.fields', field(t('seatModeLabel'), seatMode), field(t('disciplineLabel'), discipline), seatsField)));
        sync();
        createBlock = section(t('createGroup'), null, h('form.form', {
            onsubmit: e => {
                e.preventDefault();
                busy(btn, async () => {
                    const gid = await createGroup(me, {
                        name: name.value.trim(), seatMode: seatMode.value, discipline: discipline.value,
                        totalSeats: Number(totalSeats.value) || 11, parties: parties.checked,
                        bipartisan: parties.checked && bipartisan.checked, chatHours,
                    });
                    location.hash = `#/g/${gid}`;
                });
            },
        }, h('div.inline-form', name, btn), more));
    } else {
        createBlock = section(t('createGroup'), null, h('p.note.blue', t('freeLimit')));
    }
    mount(main,
        h('div.page-head', h('div', h('div.eyebrow', new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })), h('h1', me.name))),
        h('div.grid.grid-side',
            section(t('myGroups'), h('span', `${me.groups.length}/${me.premium ? '∞' : 1}`), list),
            h('div.stack', section(t('joinGroup'), null, joinForm), createBlock, section(t('notifications'), null, notifButton()))),
    );

    const groups = await getGroups(me.groups);
    // Te han echado o lo han borrado: libera el hueco (la lista se repinta sola al cambiar el usuario)
    if (groups.length < me.groups.length) pruneGroups(me).catch(() => {});
    mount(list, groups.length
        ? groups.map(g => h('a.item', { href: `#/g/${g.id}` },
            h('span.brand-mark', g.name.slice(0, 1).toUpperCase()),
            h('div', { style: { flex: 1 } }, h('h3', g.name), h('div.sub', t('seatMode_' + g.seatMode))),
            g.ownerId === me.id ? badge(t('owner'), 'ink') : null))
        : empty(t('noGroups')));
}
