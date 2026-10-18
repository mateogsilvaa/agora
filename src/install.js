// Web-app: service worker, modo "app instalada" y una sugerencia discreta para instalarla.
import { t } from './i18n.js';
import { h } from './ui.js';

const SNOOZE = 'agora.installSnooze';
const VISITS = 'agora.visits';
let deferred = null;

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isMobile = () => matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin storage */ } },
};

// Se puede instalar: Android/Chrome con el aviso guardado, o iOS (instrucciones a mano)
export const canInstall = () => !isStandalone() && (Boolean(deferred) || isIos());

export async function promptInstall() {
    if (deferred) {
        deferred.prompt();
        await deferred.userChoice.catch(() => {});
        deferred = null;
        document.getElementById('install')?.remove();
        return;
    }
    if (isIos()) showIosHelp();
}

function showIosHelp() {
    document.getElementById('install')?.remove();
    const close = () => sheet.remove();
    const sheet = h('div.install-sheet', { id: 'install', onclick: e => { if (e.target === sheet) close(); } }, h('div.install-card',
        h('h2', t('installTitle')),
        h('ol.ios-steps', h('li', t('iosStep1')), h('li', t('iosStep2')), h('li', t('iosStep3'))),
        h('button.btn.btn-sec', { onclick: close }, t('ok'))));
    document.body.append(sheet);
}

export function setupPwa() {
    // Modo app: la clase activa los ajustes de CSS (zonas seguras, sin pie, sin rebote…)
    const mark = () => document.documentElement.classList.toggle('standalone', isStandalone());
    mark();
    matchMedia('(display-mode: standalone)').addEventListener?.('change', mark);

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
        addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
    }
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; maybeSuggest(); });
    addEventListener('appinstalled', () => { deferred = null; document.getElementById('install')?.remove(); });

    // Cuenta visitas: la sugerencia solo sale a quien ya ha vuelto alguna vez
    store.set(VISITS, String(Number(store.get(VISITS) || 0) + 1));
    if (isIos()) setTimeout(maybeSuggest, 20000);
}

// Sugerencia discreta: una tarjetita abajo, a partir de la segunda visita, que se cierra y no vuelve en 2 semanas
function maybeSuggest() {
    if (!canInstall() || !isMobile() || document.getElementById('install')) return;
    if (Number(store.get(VISITS) || 0) < 2) return;
    if (Date.now() < Number(store.get(SNOOZE) || 0)) return;
    const close = () => { store.set(SNOOZE, String(Date.now() + 14 * 864e5)); chip.remove(); };
    const chip = h('div.install-chip', { id: 'install', role: 'dialog' },
        h('span.logo.mini', 'Á'),
        h('div', h('b', t('installShort')), h('span', t('installShortSub'))),
        h('button.btn.btn-sm', { onclick: () => { chip.remove(); promptInstall(); } }, t('installBtn')),
        h('button.chip-x', { 'aria-label': t('notNow'), onclick: close }, '×'));
    document.body.append(chip);
}
