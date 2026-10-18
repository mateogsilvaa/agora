import type { GameState } from '../engine/types';

export interface Saved { game: GameState; eventId: string }

/** Una línea del expediente: cada carrera terminada. */
export interface CareerRecord {
  seed: number;
  origin: string;
  via: string | null;
  stage: number;
  months: number;
  ending: string;
  title: string;
  conviccion: number;
  worldAdded: string[];
  date: string;
}

export interface Profile { careers: CareerRecord[]; world: string[] }

const KEY = 'votagora:carrera';
const PROFILE = 'votagora:perfil';

export function saveGame(s: Saved | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* modo privado: se juega igual, sin guardar */ }
}

export function loadGame(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s?.game?.version === 2 ? s : null;
  } catch { return null; }
}

export function loadProfile(): Profile {
  try {
    return { careers: [], world: [], ...JSON.parse(localStorage.getItem(PROFILE) ?? '{}') };
  } catch { return { careers: [], world: [] }; }
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(PROFILE, JSON.stringify(p)); } catch { /* nada */ }
}
