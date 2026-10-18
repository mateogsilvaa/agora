// Avisos push con la app cerrada. Lo ejecuta GitHub Actions cada 5 minutos (.github/workflows/avisos.yml).
//
// 1. Lee las noticias nuevas de todos los grupos desde la última pasada (cursor en meta/push).
// 2. Para cada noticia, avisa a los miembros del grupo menos a quien la provocó.
// 3. Manda un Web Push a cada suscripción (users/{uid}/push/*) y borra las que ya no existen.
//
// Variables: FIREBASE_SERVICE_ACCOUNT (JSON de la cuenta de servicio), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// Prueba local sin enviar nada: DRY_RUN=1 node worker/avisos.mjs
import admin from 'firebase-admin';
import webpush from 'web-push';

const DRY = Boolean(process.env.DRY_RUN);
const SITE = 'https://votagora.es';

// Sin credenciales todavía (secret sin configurar): no es un error, simplemente no hay avisos
if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.VAPID_PRIVATE_KEY) {
    console.log('Faltan FIREBASE_SERVICE_ACCOUNT o las claves VAPID: no se envía nada.');
    process.exit(0);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
webpush.setVapidDetails('mailto:avisos@votagora.es', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

// Solo lo que merece sonar en el móvil (afiliaciones, altas y bajas se quedan en la campana)
const T = {
    es: {
        vote_opened: d => `Nueva votación: «${d.title}»`,
        live_started: d => `En directo ahora: «${d.title}»`,
        vote_result: d => ({ passed: `Aprobada «${d.title}»`, rejected: `Rechazada «${d.title}»`, winner: `«${d.winner}» gana «${d.title}»`, tie: `Empate en «${d.title}»` }[d.outcome] || `Sin mayoría en «${d.title}»`),
        coalition_signed: d => `Pacto firmado: «${d.name}»`,
        office_appointed: d => `${d.who}, nuevo cargo: ${d.office}`,
        seats_allocated: () => 'Ya hay resultados de las elecciones',
        leader_elected: d => `${d.who}, portavoz de ${d.short}`,
        many: n => `${n} novedades`,
    },
    en: {
        vote_opened: d => `New vote: “${d.title}”`,
        live_started: d => `Live now: “${d.title}”`,
        vote_result: d => ({ passed: `“${d.title}” passed`, rejected: `“${d.title}” rejected`, winner: `“${d.winner}” wins “${d.title}”`, tie: `Tie on “${d.title}”` }[d.outcome] || `No majority on “${d.title}”`),
        coalition_signed: d => `Deal signed: “${d.name}”`,
        office_appointed: d => `${d.who} appointed ${d.office}`,
        seats_allocated: () => 'Election results are in',
        leader_elected: d => `${d.who} leads ${d.short}`,
        many: n => `${n} updates`,
    },
};
const lang = l => (l && l.startsWith('en') ? 'en' : 'es');

const cursorRef = db.doc('meta/push');
const cursor = await cursorRef.get();
if (!cursor.exists) {
    // Primera pasada: no mandamos el historial entero, empezamos desde ahora
    if (!DRY) await cursorRef.set({ lastAt: admin.firestore.Timestamp.now() });
    console.log('Cursor creado; la próxima pasada ya avisa.');
    process.exit(0);
}
const lastAt = cursor.get('lastAt');

const snap = await db.collectionGroup('news').where('at', '>', lastAt).orderBy('at').limit(300).get();
console.log(`${snap.size} noticias nuevas desde ${lastAt.toDate().toISOString()}`);
if (!snap.size) process.exit(0);

// Agrupa por destinatario y grupo: { uid: { gid: [noticia, …] } }
const groups = new Map();
async function groupInfo(gid) {
    if (!groups.has(gid)) {
        const [g, members] = await Promise.all([db.doc(`groups/${gid}`).get(), db.collection(`groups/${gid}/members`).get()]);
        groups.set(gid, { name: g.get('name') || 'Ágora', members: members.docs.map(m => m.id) });
    }
    return groups.get(gid);
}

const inbox = {};
for (const doc of snap.docs) {
    const n = doc.data();
    if (!T.es[n.kind]) continue;
    const gid = doc.ref.parent.parent.id;
    const g = await groupInfo(gid);
    for (const uid of g.members) {
        if (uid === n.by) continue;
        ((inbox[uid] ||= {})[gid] ||= []).push(n);
    }
}

let sent = 0, gone = 0;
for (const [uid, byGroup] of Object.entries(inbox)) {
    const subs = await db.collection(`users/${uid}/push`).get();
    if (subs.empty) continue;
    for (const [gid, list] of Object.entries(byGroup)) {
        const g = groups.get(gid);
        for (const s of subs.docs) {
            const tr = T[lang(s.get('lang'))];
            const last = list[list.length - 1];
            const body = list.length === 1 ? tr[last.kind](last.data || {}) : `${tr.many(list.length)} · ${tr[last.kind](last.data || {})}`;
            const url = list.length === 1 && last.data?.vid ? `${SITE}/#/g/${gid}/v/${last.data.vid}` : `${SITE}/#/g/${gid}/paper`;
            const payload = JSON.stringify({ title: g.name, body, url, tag: `agora-${gid}` });
            if (DRY) { console.log(`[dry] ${uid} ← ${g.name}: ${body}`); continue; }
            try {
                await webpush.sendNotification({ endpoint: s.get('endpoint'), keys: s.get('keys') }, payload, { TTL: 6 * 3600 });
                sent++;
            } catch (e) {
                // 404/410: el navegador ya no tiene esa suscripción
                if (e.statusCode === 404 || e.statusCode === 410) { await s.ref.delete(); gone++; }
                else console.warn(`Fallo enviando a ${uid}: ${e.statusCode || e.message}`);
            }
        }
    }
}

if (!DRY) await cursorRef.set({ lastAt: snap.docs[snap.size - 1].get('at') });
console.log(`Enviados: ${sent} · suscripciones caducadas borradas: ${gone}`);
process.exit(0);
