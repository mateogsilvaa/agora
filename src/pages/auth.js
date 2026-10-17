import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase.js';
import { t } from '../i18n.js';
import { h, mount, field, busy, toast } from '../ui.js';
import { hemicycle } from '../hemicycle.js';
import { peekInvite } from '../data.js';
import { renderLanding } from './landing.js';

const DEMO = [['#a8321f', 6], ['#b8730b', 3], ['#1d7a52', 4], ['#1d4e89', 7], ['#8d8a83', 1]]
    .flatMap(([color, n]) => Array.from({ length: n }, () => ({ color })));

// Con invitación pendiente se empieza en "crear cuenta": quien llega por un enlace casi nunca tiene cuenta
let mode = null;

export async function renderAuth(main, pendingCode) {
    if (!mode) mode = pendingCode ? 'register' : 'login';
    const invite = pendingCode ? await peekInvite(pendingCode) : null;

    const email = h('input', { type: 'email', name: 'email', required: true, autocomplete: 'email', inputMode: 'email' });
    const password = h('input', { type: 'password', name: 'password', required: true, minLength: 6, autocomplete: mode === 'login' ? 'current-password' : 'new-password' });
    // Ojo para ver la contraseña mientras se escribe
    const EYE = 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z';
    const EYE_OFF = 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6C3.8 8.3 2 12 2 12s3.6 6 10 6c1.7 0 3.2-.4 4.5-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2';
    const eyeIcon = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8"/>`; return s; };
    const eye = h('button.pass-eye', {
        type: 'button', 'aria-label': t('showPassword'), title: t('showPassword'),
        onclick: () => {
            const show = password.type === 'password';
            password.type = show ? 'text' : 'password';
            eye.replaceChildren(eyeIcon(show ? EYE_OFF : EYE));
            eye.setAttribute('aria-pressed', String(show));
            password.focus();
        },
    }, eyeIcon(EYE));
    const name = h('input', { name: 'name', required: true, maxLength: 40, autocomplete: 'nickname' });
    const submit = h('button.btn.btn-xl', { type: 'submit' }, mode === 'login' ? t('login') : invite ? t('joinAndEnter') : t('register'));

    const form = h('form.form.auth-box', {
        onsubmit: e => {
            e.preventDefault();
            busy(submit, async () => {
                if (mode === 'register') {
                    sessionStorage.setItem('agora.pendingName', name.value.trim());
                    await createUserWithEmailAndPassword(auth, email.value.trim(), password.value);
                } else {
                    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
                }
            });
        },
    },
        invite ? h('div.premium-card', h('div.eyebrow', t('invitedTo')), h('h3', invite.name || pendingCode), h('p', { style: { margin: 0 } }, t('invitedText'))) : null,
        mode === 'register' ? field(t('name'), name) : null,
        field(t('email'), email),
        field(t('password'), h('div.pass', password, eye)),
        submit,
        h('button.link', { type: 'button', onclick: () => { mode = mode === 'login' ? 'register' : 'login'; renderAuth(main, pendingCode); } },
            mode === 'login' ? t('noAccount') : t('haveAccount')),
        mode === 'login' ? h('button.link', {
            type: 'button',
            onclick: e => {
                if (!email.value) return email.focus();
                busy(e.target, async () => { await sendPasswordResetEmail(auth, email.value.trim()); toast(t('resetSent')); });
            },
        }, t('forgot')) : null,
    );

    // Invitado: directo al formulario. Si no, la portada completa con el formulario al final.
    if (invite) {
        return mount(main, h('div.grid.grid-2',
            form,
            h('div', h('div.hemi-wrap', hemicycle(DEMO, { label: 'Ágora' })), h('p.sub', { style: { textAlign: 'center' } }, t('heroText')))));
    }
    renderLanding(main, form);
}
