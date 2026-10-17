import { t, lang } from './i18n.js';

// h('div.clase', { onclick }, ...hijos): crea nodos sin plantillas de texto (sin XSS)
export function h(tag, attrs, ...children) {
    const [name, ...classes] = tag.split('.');
    const el = document.createElement(name || 'div');
    if (classes.length) el.className = classes.join(' ');
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
        children.unshift(attrs);
        attrs = null;
    }
    for (const [k, v] of Object.entries(attrs || {})) {
        if (v == null || v === false) continue;
        if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k in el && k !== 'list') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
    }
    append(el, children);
    return el;
}

function append(el, children) {
    for (const c of children.flat(Infinity)) {
        if (c == null || c === false) continue;
        el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
}

export function mount(el, ...children) {
    el.replaceChildren();
    append(el, children);
}

export function pageHead(label, title, sub, right) {
    return h('div.page-head',
        h('div', h('div.eyebrow', label), h('h1', title), sub ? h('p.sub', sub) : null),
        right ? h('div.row', right) : null);
}

export function section(title, right, ...body) {
    return h('section.block', h('div.block-title', h('h2', title), right ? h('div', right) : null), ...body);
}

export function badge(text, kind = '') {
    return h(`span.badge${kind ? '.' + kind : ''}`, text);
}

export function empty(text) {
    return h('p.empty', text);
}

export function loading() {
    return h('div.loading', h('span.spinner'), t('loading'));
}

let toastTimer;
export function toast(msg, bad = false) {
    let el = document.getElementById('toast');
    if (!el) { el = h('div'); el.id = 'toast'; document.body.append(el); }
    el.textContent = msg;
    el.className = bad ? 'show bad' : 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, 3200);
}

// Ejecuta una acción asíncrona deshabilitando el botón y enseñando el error si falla
export async function busy(btn, fn) {
    if (btn) btn.disabled = true;
    try { return await fn(); } catch (e) {
        console.error(e);
        toast(e.userMessage || `${t('error')}: ${e.code || e.message}`, true);
    } finally { if (btn) btn.disabled = false; }
}

export function fail(msg) {
    const e = new Error(msg);
    e.userMessage = msg;
    return e;
}

export function fmtDate(d) {
    if (!d) return '';
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function field(label, input) {
    return h('label', label, input);
}

export function select(name, options, value) {
    return h('select', { name }, options.map(([v, label]) => h('option', { value: v, selected: v === value }, label)));
}

export function randomId(n = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = crypto.getRandomValues(new Uint8Array(n));
    return [...buf].map(x => chars[x % chars.length]).join('');
}

export const PARTY_COLORS = ['#a8321f', '#1d4e89', '#1d7a52', '#b8730b', '#6a3fa0', '#0f7f8a', '#c2417a', '#4d5560'];
