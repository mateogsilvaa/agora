import type { GameState } from '../engine/types';

export interface Saved { game: GameState; eventId: string }

const KEY = 'votagora:partida';
const PREFS = 'votagora:prefs';

export function saveGame(s: Saved | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* modo privado: se juega igual, sin guardar */ }
}

export function loadGame(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export interface Prefs { streamer: boolean; endings: string[]; best: number }

export function loadPrefs(): Prefs {
  try {
    return { streamer: false, endings: [], best: 0, ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') };
  } catch { return { streamer: false, endings: [], best: 0 }; }
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* nada */ }
}
