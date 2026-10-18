import './styles.css';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, configured } from './firebase.js';
import { t, lang, setLang } from './i18n.js';
import { h, mount, loading, toast } from './ui.js';
import { watchUser, ensureUser, pruneGroups, getGroups, peekInvite, joinGroup } from './data.js';
import { watchAll, onFeed, feedItems, unreadTotal, markAllSeen, newsUrl, notifButton, setPushUser, syncPush } from './notify.js';
import { headline } from './pages/paper.js';
import { setupPwa, canInstall, promptInstall } from './install.js';
import { renderAuth } from './pages/auth.js';
import { renderHome } from './pages/home.js';
import { GroupPage } from './pages/group.js';

const top = document.getElementById('top');
const main = document.getElementById('main');

const app = { user: null, me: null, page: null, groups: [], refresh: () => refresh(), clean: () => clean() };

// Si hay un formulario a medio escribir, los cambios en directo esperan a que se envíe o se limpie
let dirty = false, pending = false;
main.addEventListener('input', e => { if (e.target.closest('form:not([data-live])')) dirty = true; });
function clean() { dirty = false; if (pending) { pending = false; render(); } }
function refresh() { if (dirty) pending = true; else render(); }

// Cabecera: marca · grupo actual (con selector) · idioma · menú de cuenta
function header() {
    const r = route();
    const gid = r.name === 'group' ? r.gid : null;
    const current = gid ? app.groups.find(g => g.id === gid) : null;
    const others = app.groups.filter(g => g.id !== gid);

    const switcher = app.me && app.groups.length ? h('details.menu.crumb',
        h('summary', h('span.crumb-sep', '/'), h('span.crumb-name', current?.name || t('myGroups')), h('span.caret', '▾')),
        h('div.menu-pop',
            others.map(g => h('a', { href: `#/g/${g.id}` }, h('span.brand-mark.tiny', g.name.slice(0, 1).toUpperCase()), g.name)),
            h('a.menu-foot', { href: '#/' }, '+ ' + t('joinGroup')))) : null;

    const langs = h('div.seg', ['es', 'en'].map(l => h(`button${l === lang ? '.on' : ''}`, {
        onclick: () => { if (l !== lang) { setLang(l); header(); render(); } },
    }, l.toUpperCase())));

    // Campana: novedades de todos tus grupos
    const bell = app.me ? bellMenu() : null;

    const account = app.me ? h('details.menu.account',
        h('summary', { title: app.me.name }, h('span.avatar', app.me.name.slice(0, 1).toUpperCase())),
        h('div.menu-pop.right',
            h('div.menu-head', h('b', app.me.name), h('span', app.me.email), h('span.badge' + (app.me.premium ? '.accent' : ''), app.me.premium ? t('premium') : t('free'))),
            h('a', { href: '#/' }, t('myGroups')),
            canInstall() ? h('button', { onclick: () => promptInstall() }, t('installApp')) : null,
            h('button', { onclick: () => signOut(auth) }, t('logout')))) : null;

    mount(top, h('nav.nav',
        h('a.logo', { href: '#/', 'aria-label': 'Ágora' }, 'ÁGORA'),
        switcher,
        h('span.nav-sp'),
        langs,
        bell,
        account));
}

const BELL = 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0';
function bellMenu() {
    const items = feedItems();
    const unread = items.filter(n => n.unread).length;
    const ico = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ico.setAttribute('viewBox', '0 0 24 24');
    ico.innerHTML = `<path d="${BELL}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
    const menu = h('details.menu.bell',
        h('summary', { 'aria-label': t('notifications') }, h('span.bell-ico', ico, unread ? h('i.bell-count', unread > 9 ? '9+' : unread) : null)),
        h('div.menu-pop.right.bell-pop',
            h('div.bell-head', h('b', t('notifications')), unread ? h('button.link', { onclick: () => markAllSeen() }, t('markRead')) : null),
            items.length
                ? items.map(n => h(`a.bell-item${n.unread ? '.unread' : ''}`, { href: newsUrl(n) },
                    h('span.bell-group', n.group), h('span.bell-text', headline(n))))
                : h('p.empty', { style: { padding: '12px 14px' } }, t('noNotifs')),
            h('div.bell-foot', notifButton())));
    // Al abrir la bandeja se da todo por leído
    menu.addEventListener('toggle', () => { if (!menu.open && unreadTotal()) markAllSeen(); });
    return menu;
}

// Las novedades repintan la cabecera (salvo con un menú abierto, para no cerrarlo de golpe)
let headerPending = false;
onFeed(() => { if (document.querySelector('details.menu[open]')) headerPending = true; else header(); });
document.addEventListener('toggle', e => { if (headerPending && e.target.matches?.('details.menu') && !e.target.open) { headerPending = false; header(); } }, true);

// Los menús desplegables se cierran al tocar fuera o al elegir algo
document.addEventListener('click', e => {
    document.querySelectorAll('details.menu[open]').forEach(d => {
        if (!d.contains(e.target) || (e.target.closest('a,button') && !e.target.closest('summary'))) d.open = false;
    });
});

function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'join' && parts[1]) return { name: 'join', code: parts[1].toUpperCase() };
    if (parts[0] === 'g' && parts[1]) return { name: 'group', gid: parts[1], tab: parts[2] || 'chamber', arg: parts[3] };
    return { name: 'home' };
}

// Los chats se reutilizan entre repintados: si estabas escribiendo, recupera el foco
function render() {
    const focused = document.activeElement?.closest?.('.chat-form') ? document.activeElement : null;
    const caret = focused?.selectionStart;
    paint();
    if (focused?.isConnected) { focused.focus(); try { focused.setSelectionRange(caret, caret); } catch { /* no es texto */ } }
}

function paint() {
    dirty = false; pending = false;
    if (!configured) return mount(main, h('p.note', t('configMissing')));
    const r = route();
    // Enlace de invitación: se guarda el código y, en cuanto hay sesión, se entra solo
    if (r.name === 'join') { try { localStorage.setItem('agora.join', r.code); } catch { /* */ } }
    let pendingCode = null;
    try { pendingCode = localStorage.getItem('agora.join'); } catch { /* */ }
    if (!app.user) { app.page?.destroy(); app.page = null; return renderAuth(main, pendingCode); }
    if (!app.me) return mount(main, loading());
    if (pendingCode) return autoJoin(pendingCode);
    if (r.name === 'group') {
        if (app.page?.gid !== r.gid) { app.page?.destroy(); app.page = new GroupPage(r.gid, app); }
        return app.page.render(main, r);
    }
    app.page?.destroy(); app.page = null;
    renderHome(main, app);
}

let joining = false;
async function autoJoin(code) {
    if (joining) return;
    joining = true;
    mount(main, loading());
    try { localStorage.removeItem('agora.join'); } catch { /* */ }
    try {
        const inv = await peekInvite(code);
        const gid = inv && app.me.groups.includes(inv.groupId) ? inv.groupId : await joinGroup(app.me, code);
        location.hash = `#/g/${gid}`;
    } catch (e) {
        toast(e.userMessage || t('error'), true);
        location.hash = '#/';
    } finally { joining = false; render(); }
}

// Al cambiar de pantalla, un fundido corto (no en cada actualización en directo)
window.addEventListener('hashchange', () => {
    window.scrollTo(0, 0); header(); render();
    main.classList.remove('nav-in'); void main.offsetWidth; main.classList.add('nav-in');
});
header();

if (configured) {
    let unsubUser = () => {};
    onAuthStateChanged(auth, async user => {
        unsubUser();
        app.user = user; app.me = null;
        header(); render();
        if (!user) return;
        await ensureUser(user, sessionStorage.getItem('agora.pendingName'));
        // Avisos push: si ya los tenía activados en este navegador, renueva la suscripción
        setPushUser(user.uid);
        syncPush();
        sessionStorage.removeItem('agora.pendingName');
        let pruned = false, watchedKey = null;
        unsubUser = watchUser(user.uid, async me => {
            app.me = me;
            if (me && !pruned) { pruned = true; await pruneGroups(me).catch(() => {}); }
            // Avisos de todos tus grupos (se rehace solo si cambia la lista)
            const key = me?.groups.join(',');
            if (me && key !== watchedKey) {
                watchedKey = key;
                getGroups(me.groups).then(gs => {
                    app.groups = gs;
                    header();
                    watchAll(me, Object.fromEntries(gs.map(g => [g.id, g.name])));
                });
            }
            header(); refresh();
        });
    });
} else render();

setupPwa();
