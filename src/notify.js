// Avisos: noticias sin leer por grupo y notificaciones del sistema cuando llega algo nuevo.
// Funcionan con la app abierta o en segundo plano (pestaña o app instalada). Para avisos con la
// app cerrada del todo haría falta Cloud Messaging + Cloud Functions (plan Blaze).
import { t } from './i18n.js';
import { h, busy, toast } from './ui.js';
import { watchNews, savePushSub } from './data.js';
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
    emit();
}

export const hasSeenPaper = gid => readSeen()[gid] !== undefined;

export function unreadCount(gid, news, uid) {
    const seen = readSeen()[gid];
    if (!seen) return 0; // primera visita: no asustamos con todo el historial
    return news.filter(n => ms(n) > seen && n.by !== uid).length;
}

export const canNotify = () => 'Notification' in window;

// ---------- Web Push (avisos con la app cerrada) ----------
// Los manda el worker de GitHub Actions (worker/avisos.mjs) cada pocos minutos.
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
let pushUid = null;
export const setPushUser = uid => { pushUid = uid; };

function keyBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// Se suscribe (o renueva la suscripción) y la guarda en el perfil. Sin service worker (modo dev) no hace nada.
export async function syncPush() {
    if (!pushUid || !VAPID || !canNotify() || Notification.permission !== 'granted' || !('PushManager' in window)) return;
    try {
        // El worker se registra al cargar la página: lo esperamos un poco (en dev no existe y no llega nunca)
        const reg = await Promise.race([navigator.serviceWorker?.ready, new Promise(r => setTimeout(() => r(null), 8000))]);
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) });
        await savePushSub(pushUid, sub, document.documentElement.lang);
    } catch (e) { console.warn('push', e); }
}

async function show(title, body, url, tag) {
    if (!canNotify() || Notification.permission !== 'granted') return false;
    try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) await reg.showNotification(title, { body, tag, data: { url }, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
        else new Notification(title, { body, tag });
        return true;
    } catch { return false; }
}

// ---------- Bandeja de avisos (la campana de la cabecera) ----------
// Últimas noticias de todos tus grupos; "sin leer" = posteriores a la última vez que miraste.
const feed = {};
let names = {}, myId = null;
const listeners = new Set();
export const onFeed = cb => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach(cb => cb());

export function feedItems() {
    const seen = readSeen();
    return Object.entries(feed)
        .flatMap(([gid, list]) => list.map(n => ({ ...n, gid, group: names[gid] || '', unread: n.by !== myId && ms(n) > (seen[gid] ?? Infinity) })))
        .sort((a, b) => ms(b) - ms(a))
        .slice(0, 20);
}
export const unreadTotal = () => feedItems().filter(n => n.unread).length;

export function markAllSeen() {
    const seen = readSeen();
    for (const [gid, list] of Object.entries(feed)) seen[gid] = Math.max(seen[gid] || 0, ...list.map(ms));
    try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* sin storage */ }
    emit();
}

export const newsUrl = n => n.data?.vid ? `#/g/${n.gid}/v/${n.data.vid}` : `#/g/${n.gid}/paper`;

// Escucha las últimas noticias de cada grupo del usuario
let unsubs = [];
export function watchAll(me, groupNames) {
    unsubs.forEach(u => u());
    names = groupNames; myId = me.id;
    for (const k of Object.keys(feed)) if (!me.groups.includes(k)) delete feed[k];
    unsubs = me.groups.map(gid => {
        let first = true;
        return watchNews(gid, 15, (all, added) => {
            feed[gid] = all.filter(n => n.at);
            // Primera vez que vemos este grupo: lo de antes no cuenta como nuevo
            if (first && readSeen()[gid] === undefined) markSeen(gid, feed[gid]);
            emit();
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
            if (p === 'granted') { btn.replaceWith(h('p.note.blue', '✓ ' + t('notifsOn'))); show('Ágora', t('notifsOn'), '/', 'hello'); syncPush(); }
            else toast(t('notifsBlocked'), true);
        }),
    }, t('enableNotifs'));
    return btn;
}
