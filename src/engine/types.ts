export type Stat = 'influencia' | 'opinion' | 'prensa' | 'judicial';
export type Stats = Record<Stat, number>;
export type Via = 'aparato' | 'tecnica' | 'movimiento';
export type Origin = 'cinturon' | 'provincia' | 'despacho' | 'pueblo' | 'precario';
export type Channel = 'mensaje' | 'despacho' | 'correo' | 'pleno' | 'calle' | 'llamada';
export type Danger = `${Stat}-low` | `${Stat}-high`;

export interface Debt { id: string; createdTurn: number; dueTurn: number; severity: number }

export interface Requires {
  flagsAll?: string[];
  flagsNone?: string[];
  flagsAny?: string[];
  stats?: Partial<Record<Stat, [number, number]>>;
  relations?: Record<string, [number, number]>;
  debtDue?: string;
  via?: Via[];
  origin?: Origin[];
  conviccion?: [number, number];
  world?: string[];          // legado de carreras anteriores
  worldNone?: string[];
  minStageTurns?: number;    // meses mínimos en la etapa actual
}

export interface Option {
  label: string;
  effects: Partial<Stats>;
  conviccion?: number;       // negativo = traicionas lo que creías
  requires?: Requires;
  setFlags?: string[];
  clearFlags?: string[];
  setVia?: Via;
  setWorld?: string[];       // queda para las siguientes carreras
  addDebt?: { id: string; in: [number, number]; severity: number };
  delayDebt?: { id: string; turns: number };
  clearDebt?: string;
  relations?: Record<string, number>;
  promote?: boolean;         // sube de etapa
  end?: string;              // termina la carrera con este final
  outcome?: string;          // lo que pasa después (una línea)
}

export interface GameEvent {
  id: string;
  kind?: 'normal' | 'chain' | 'warning' | 'promotion' | 'debt';
  chain?: string;
  step?: number;
  stage: [number, number];
  weight: number;
  tags: string[];
  requires?: Requires;
  cooldown?: number;         // 999 = una vez por carrera
  warnsFor?: Danger;
  from: string;              // cargo de quien te habla
  channel: Channel;
  scene?: string;            // fondo de píxel
  title?: string;
  text: string;
  options: Option[];
}

export interface HistoryEntry {
  turn: number; stage: number; eventId: string; option: number;
  deltas: Partial<Stats>; conviccion: number; outcome?: string;
}

export interface GameState {
  version: 2;
  seed: number;
  rngState: number;
  origin: Origin;
  via: Via | null;
  turn: number;               // meses desde enero de 2016
  stage: number;              // 1..7
  stageTurns: number;
  stats: Stats;
  conviccion: number;
  flags: string[];
  world: string[];            // legado heredado + lo que cambia esta carrera
  debts: Debt[];
  relations: Record<string, number>;
  lastSeen: Record<string, number>;
  recentTags: string[];
  history: HistoryEntry[];
  warned: Danger[];
}

export interface EndingDef { key: string; title: string; text: string; win?: boolean }

export interface Ending extends EndingDef {
  epilogue: string;
  causes: HistoryEntry[];
}
