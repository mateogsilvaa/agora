// Firebase solo guarda carreras terminadas (para equilibrar el juego).
// El mazo va en el bundle: cero lecturas mientras se juega.
import type { Ending, GameState } from '../engine/types';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const configured = Boolean(config.apiKey && config.projectId);

export async function recordRun(s: GameState, end: Ending) {
  if (!configured) return;
  try {
    // carga diferida: Firebase no frena el arranque
    const [{ initializeApp, getApps }, { getAuth, signInAnonymously }, { getFirestore, addDoc, collection, serverTimestamp }] =
      await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = getApps()[0] ?? initializeApp(config);
    const auth = getAuth(app);
    if (!auth.currentUser) await signInAnonymously(auth);
    await addDoc(collection(getFirestore(app), 'runs'), {
      uid: auth.currentUser!.uid,
      pack: 'carrera-1',
      seed: s.seed,
      origin: s.origin,
      via: s.via,
      stage: s.stage,
      turns: s.turn,
      ending: end.key,
      win: Boolean(end.win),
      conviccion: s.conviccion,
      stats: s.stats,
      choices: s.history.slice(-200).map(h => `${h.eventId}:${h.option}`),
      createdAt: serverTimestamp(),
    });
  } catch {
    // sin auth anónima o sin red: el juego no depende de esto
  }
}
