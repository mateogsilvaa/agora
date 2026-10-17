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

    let createBlock;
    if (me.premium) {
        const name = h('input', { name: 'name', required: true, maxLength: 60 });
        const seatMode = select('seatMode', ['member', 'election', 'manual'].map(m => [m, t('seatMode_' + m)]), 'member');
        const discipline = select('discipline', ['free', 'bloc', 'choose'].map(m => [m, t('discipline_' + m)]), 'choose');
        const totalSeats = h('input', { type: 'number', name: 'totalSeats', min: 1, max: 1000, value: 11 });
        const seatsField = field(t('totalSeats'), totalSeats);
        seatsField.hidden = true;
        seatMode.onchange = () => { seatsField.hidden = seatMode.value !== 'election'; };
        const bipartisan = h('input', { type: 'checkbox' });
        let chatHours = 24;
        const btn = h('button.btn', { type: 'submit' }, t('create'));
        const help = h('button.btn.btn-sec', {
            type: 'button',
            onclick: () => openWizard(s => {
                seatMode.value = s.seatMode; discipline.value = s.discipline; totalSeats.value = s.totalSeats;
                bipartisan.checked = s.bipartisan; chatHours = s.chatHours;
                seatMode.onchange();
                name.focus();
            }),
        }, t('helpMeChoose'));
        createBlock = section(t('createGroup'), null, h('form.form', {
            onsubmit: e => {
                e.preventDefault();
                busy(btn, async () => {
                    const gid = await createGroup(me, {
                        name: name.value.trim(), seatMode: seatMode.value, discipline: discipline.value,
                        totalSeats: Number(totalSeats.value) || 11, bipartisan: bipartisan.checked, chatHours,
                    });
                    location.hash = `#/g/${gid}`;
                });
            },
        }, field(t('groupName'), name), h('div.row', help, h('span.sub', { style: { margin: 0 } }, t('helpMeChooseSub'))),
        h('div.fields', field(t('seatModeLabel'), seatMode), field(t('disciplineLabel'), discipline), seatsField),
        h('label.check', bipartisan, t('bipartisan')), h('div.row', btn)));
    } else {
        createBlock = section(t('createGroup'), badge(t('premium'), 'accent'), h('p.note.blue', t('premiumOnly')));
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
