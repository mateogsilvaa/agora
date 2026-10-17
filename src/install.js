// Web-app: registra el service worker e insiste (con educación) en instalarla en el móvil.
import { t } from './i18n.js';
import { h } from './ui.js';

const SNOOZE = 'agora.installSnooze';
let deferred = null;

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isMobile = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function setupPwa() {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
        addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
    }
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; nag(); });
    addEventListener('appinstalled', () => { deferred = null; document.getElementById('install')?.remove(); });
    if (isIos()) setTimeout(nag, 1500);
}

async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    document.getElementById('install')?.remove();
}

function snoozed() {
    try { return Date.now() < Number(localStorage.getItem(SNOOZE) || 0); } catch { return false; }
}

// En el navegador del móvil: hoja grande al entrar (se pospone 12 h) y una franja fija mientras tanto
function nag() {
    if (isStandalone() || !isMobile() || document.getElementById('install')) return;
    if (!deferred && !isIos()) return;
    const action = deferred
        ? h('button.btn.btn-lg', { onclick: install }, t('installBtn'))
        : h('p.note.blue', t('installIos'));
    if (snoozed()) {
        document.body.append(h('div.install-strip', { id: 'install', onclick: () => { try { localStorage.removeItem(SNOOZE); } catch { /* */ } document.getElementById('install').remove(); nag(); } },
            '↓ ', t('installTitle')));
        return;
    }
    const sheet = h('div.install-sheet', { id: 'install' }, h('div.install-card',
        h('div.brand-mark.big', 'Á'),
        h('h2', t('installTitle')),
        h('p', t('installText')),
        action,
        h('button.btn.btn-ghost', {
            onclick: () => {
                try { localStorage.setItem(SNOOZE, String(Date.now() + 12 * 3600 * 1000)); } catch { /* */ }
                sheet.remove(); nag();
            },
        }, t('notNow'))));
    document.body.append(sheet);
}
