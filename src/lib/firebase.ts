// Firebase se carga solo cuando hace falta: el test se juega sin él.
// Tres usos: eventos anónimos de uso, salas en directo y el panel de administración.
import type { FirebaseApp } from 'firebase/app';
import type { Firestore, Unsubscribe } from 'firebase/firestore';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
export const configured = Boolean(config.apiKey && config.projectId);

let ready: Promise<{ app: FirebaseApp; db: Firestore; fs: typeof import('firebase/firestore') }> | null = null;
function fb() {
  if (!configured) throw new Error('Firebase sin configurar');
  ready ??= (async () => {
    const [{ initializeApp, getApps }, fs] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const app = getApps()[0] ?? initializeApp(config);
    return { app, db: fs.getFirestore(app), fs };
  })();
  return ready;
}

// ── Eventos de uso ─────────────────────────────────────────────

export type EventType = 'start' | 'finish' | 'share' | 'room_create' | 'room_join';

export interface UsageEvent {
  type: EventType;
  slug: string;
  mode?: 'solo' | 'reto' | 'sala';
  top?: string;
  pct?: number;
  answers?: string;
  ms?: number;
  channel?: string;
  ref?: string;
  device?: 'movil' | 'escritorio';
}

/** De dónde viene la visita: dominio del referer o utm_source. Nunca la URL completa. */
function source(): string {
  const utm = new URLSearchParams(location.search).get('utm_source');
  if (utm) return utm.slice(0, 40);
  try {
    const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    return host && host !== location.hostname ? host : 'directo';
  } catch { return 'directo'; }
}

export function track(e: UsageEvent) {
  if (!configured || location.hostname === 'localhost') return;
  const data = {
    ...e,
    ref: source(),
    device: matchMedia('(pointer: coarse)').matches ? 'movil' : 'escritorio',
  };
  fb().then(({ db, fs }) => fs.addDoc(fs.collection(db, 'events'), { ...data, ts: fs.serverTimestamp() })).catch(() => {});
}

// ── Salas en directo ───────────────────────────────────────────

export type Phase = 'playing' | 'guess' | 'reveal';

export interface Room { test: string; phase: Phase; host: string }

export interface Player {
  id: string;
  name: string;
  progress: number;
  done: boolean;
  answers: string;
  top: string;
  pct: number;
  /** a quién cree que pertenece cada resultado: { idDelResultado: idDelJugador } */
  guesses: Record<string, string>;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const newId = () => Math.random().toString(36).slice(2, 12);

export async function createRoom(test: string, hostId: string): Promise<string> {
  const { db, fs } = await fb();
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const ref = fs.doc(db, 'rooms', code);
    const snap = await fs.getDoc(ref);
    if (snap.exists()) continue;
    await fs.setDoc(ref, { test, phase: 'playing', host: hostId, createdAt: fs.serverTimestamp() });
    track({ type: 'room_create', slug: test, mode: 'sala' });
    return code;
  }
  throw new Error('No se pudo crear la sala');
}

export async function watchRoom(code: string, cb: (r: Room | null) => void): Promise<Unsubscribe> {
  const { db, fs } = await fb();
  return fs.onSnapshot(fs.doc(db, 'rooms', code), s => cb(s.exists() ? (s.data() as Room) : null), () => cb(null));
}

export async function watchPlayers(code: string, cb: (p: Player[]) => void): Promise<Unsubscribe> {
  const { db, fs } = await fb();
  return fs.onSnapshot(fs.collection(db, 'rooms', code, 'players'), s =>
    cb(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Player, 'id'>) })).sort((a, b) => a.name.localeCompare(b.name))));
}

export async function joinRoom(code: string, id: string, name: string, test: string) {
  const { db, fs } = await fb();
  await fs.setDoc(fs.doc(db, 'rooms', code, 'players', id), {
    name: name.slice(0, 24), progress: 0, done: false, answers: '', top: '', pct: 0, guesses: {}, joinedAt: fs.serverTimestamp(),
  });
  track({ type: 'room_join', slug: test, mode: 'sala' });
}

export async function updatePlayer(code: string, id: string, data: Partial<Omit<Player, 'id'>>) {
  const { db, fs } = await fb();
  await fs.updateDoc(fs.doc(db, 'rooms', code, 'players', id), data);
}

export async function setPhase(code: string, phase: Phase) {
  const { db, fs } = await fb();
  await fs.updateDoc(fs.doc(db, 'rooms', code), { phase });
}

// ── Panel de administración ────────────────────────────────────

export async function adminSignIn() {
  const { app } = await fb();
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const res = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  return res.user;
}

export async function adminUser() {
  const { app } = await fb();
  const { getAuth, onAuthStateChanged } = await import('firebase/auth');
  const auth = getAuth(app);
  return new Promise<import('firebase/auth').User | null>(resolve => {
    const off = onAuthStateChanged(auth, u => { off(); resolve(u); });
  });
}

export async function adminSignOut() {
  const { app } = await fb();
  const { getAuth, signOut } = await import('firebase/auth');
  await signOut(getAuth(app));
}

export interface StoredEvent extends UsageEvent { ts: Date }

/** Eventos de los últimos `days` días. Solo funciona si tu usuario está en /admins. */
export async function loadEvents(days: number): Promise<StoredEvent[]> {
  const { db, fs } = await fb();
  const since = fs.Timestamp.fromDate(new Date(Date.now() - days * 86400000));
  const q = fs.query(fs.collection(db, 'events'), fs.where('ts', '>=', since), fs.orderBy('ts', 'desc'), fs.limit(50000));
  const snap = await fs.getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...(data as UsageEvent), ts: data.ts?.toDate?.() ?? new Date() };
  });
}

export async function loadRoomCount(): Promise<number> {
  const { db, fs } = await fb();
  const snap = await fs.getCountFromServer(fs.collection(db, 'rooms'));
  return snap.data().count;
}
