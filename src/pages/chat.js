// Chat de una sala. Es un componente persistente: la página lo reutiliza entre repintados
// para no perder el scroll ni lo que estás escribiendo.
import { t } from '../i18n.js';
import { h, mount, busy, fmtDate } from '../ui.js';
import { watchRoom, sendMessage } from '../data.js';

export class Chat {
    constructor(gid, room, me) {
        this.gid = gid; this.room = room; this.me = me;
        this.name = me.name; this.hours = 24;
        this.list = h('div.chat-list');
        this.input = h('input', { maxLength: 500, autocomplete: 'off' });
        const btn = h('button.btn', { type: 'submit' }, t('send'));
        // data-live: este formulario no bloquea los repintados en directo
        this.form = h('form.chat-form', {
            'data-live': true,
            onsubmit: e => {
                e.preventDefault();
                const text = this.input.value.trim();
                if (!text) return;
                busy(btn, async () => {
                    await sendMessage(gid, room, me.id, this.name, text, this.hours);
                    this.input.value = '';
                    this.input.focus();
                });
            },
        }, this.input, btn);
        this.el = h('div.chat', this.list, this.form);
        this.unsub = watchRoom(gid, room, me.id, msgs => this.paint(msgs));
    }

    // La página le pasa el nombre del miembro y las horas de caducidad del grupo
    update(name, hours) {
        this.name = name || this.me.name;
        this.hours = hours || 24;
        this.input.placeholder = t('chatPlaceholder', { h: this.hours });
    }

    paint(msgs) {
        const atBottom = this.list.scrollHeight - this.list.scrollTop - this.list.clientHeight < 40;
        if (!msgs) return mount(this.list, h('p.empty', '—'));
        mount(this.list, msgs.length ? msgs.map(m => h(`div.msg${m.uid === this.me.id ? '.mine' : ''}`,
            h('div.msg-head', h('b', m.name), h('span', fmtDate(m.createdAt))),
            h('div.msg-text', m.text))) : h('p.empty', t('chatEmpty')));
        if (atBottom || !this.painted) this.list.scrollTop = this.list.scrollHeight;
        this.painted = true;
    }

    destroy() { this.unsub(); }
}
