// Avisos: noticias sin leer por grupo y notificaciones del sistema cuando llega algo nuevo.
// Funcionan con la app abierta o en segundo plano (pestaña o app instalada). Para avisos con la
// app cerrada del todo haría falta Cloud Messaging + Cloud Functions (plan Blaze).
import { t } from './i18n.js';
import { h, busy, toast } from './ui.js';
import { watchNews } from './data.js';
import { headline } from './pages/paper.js';

const KEY = 'agora.seen';
const readSeen = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const ms = n => n.at?.toMillis?.() || 0;

export function markSeen(gid, news) {
    const seen = readSeen();
    const last = Math.max(seen[gid] || 0, ...news.map(ms));
    if (last === seen[gid]) return;
    seen[gid] = last;
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* sin storage */ }
}

export const hasSeenPaper = gid => readSeen()[gid] !== undefined;

export function unreadCount(gid, news, uid) {
    const seen = readSeen()[gid];
    if (!seen) return 0; // primera visita: no asustamos con todo el historial
    return news.filter(n => ms(n) > seen && n.by !== uid).length;
}

export const canNotify = () => 'Notification' in window;

async function show(title, body, url, tag) {
    if (!canNotify() || Notification.permission !== 'granted') return false;
    try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) await reg.showNotification(title, { body, tag, data: { url }, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
        else new Notification(title, { body, tag });
        return true;
    } catch { return false; }
}

// Escucha las últimas noticias de cada grupo del usuario
let unsubs = [];
export function watchAll(me, groupNames) {
    unsubs.forEach(u => u());
    unsubs = me.groups.map(gid => {
        let first = true;
        return watchNews(gid, 5, (all, added) => {
            if (first) { first = false; return; }
            for (const n of added) {
                if (n.by === me.id || !n.at) continue;
                const here = location.hash.startsWith(`#/g/${gid}`) && !document.hidden;
                const text = headline(n);
                const url = n.data?.vid ? `/#/g/${gid}/v/${n.data.vid}` : `/#/g/${gid}/paper`;
                if (here) toast(text);
                else show(groupNames[gid] || 'Ágora', text, url, n.id).then(ok => { if (!ok && !document.hidden) toast(text); });
            }
        });
    });
}

export function notifButton() {
    if (!canNotify()) return h('p.empty', '—');
    if (Notification.permission === 'granted') return h('p.note.blue', '✓ ' + t('notifsOn'));
    if (Notification.permission === 'denied') return h('p.note', t('notifsBlocked'));
    const btn = h('button.btn', {
        onclick: () => busy(btn, async () => {
            const p = await Notification.requestPermission();
            if (p === 'granted') { btn.replaceWith(h('p.note.blue', '✓ ' + t('notifsOn'))); show('Ágora', t('notifsOn'), '/', 'hello'); }
            else toast(t('notifsBlocked'), true);
        }),
    }, t('enableNotifs'));
    return btn;
}
