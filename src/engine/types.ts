export type Stat = 'influencia' | 'aprobacion' | 'medios' | 'alerta';
export type Stats = Record<Stat, number>;
export type Party = 'PTC' | 'PSTV' | 'AI' | 'CNC' | 'VP';
export type Channel = 'whatsapp' | 'notificacion' | 'email' | 'tertulia' | 'carta';
export type Danger = `${Stat}-low` | `${Stat}-high`;

export interface Debt { id: string; createdTurn: number; dueTurn: number; severity: number }

export interface Requires {
  flagsAll?: string[];
  flagsNone?: string[];
  stats?: Partial<Record<Stat, [number, number]>>;
  relations?: Record<string, [number, number]>;
  dirt?: string[];          // trapos que hay que tener
  debtDue?: string;         // solo aparece cuando vence esta deuda
  party?: Party[];
}

export interface Option {
  label: string;
  effects: Partial<Stats>;
  requires?: Requires;      // opción oculta si no se cumple
  setFlags?: string[];
  clearFlags?: string[];
  addDebt?: { id: string; in: [number, number]; severity: number };
  delayDebt?: { id: string; turns: number };
  clearDebt?: string;
  gainDirt?: string;
  useDirt?: string;
  relations?: Record<string, number>;
  headline?: string;        // titular de consecuencia
}

export interface GameEvent {
  id: string;
  kind?: 'filler' | 'chain' | 'warning' | 'milestone' | 'debt';
  chain?: string;
  step?: number;
  act: [number, number];
  weight: number;
  tags: string[];
  requires?: Requires;
  ideology?: Partial<Record<Party, number>>;
  cooldown?: number;        // turnos antes de poder repetirse (999 = una vez)
  warnsFor?: Danger;        // para cartas de aviso
  speaker: string;
  channel: Channel;
  text: string;
  options: Option[];
}

export interface Dirt {
  id: string;               // trapo_<npc>_<algo>
  target: string;
  title: string;
  text: string;
  severity: 1 | 2 | 3;
  effects: Partial<Stats>;  // al usarlo desde el inventario
}

export interface HistoryEntry { turn: number; eventId: string; option: number; deltas: Partial<Stats>; headline?: string }

export interface GameState {
  seed: number;
  rngState: number;
  party: Party;
  turn: number;
  act: number;
  stats: Stats;
  flags: string[];
  debts: Debt[];
  relations: Record<string, number>;
  dirt: string[];
  lastSeen: Record<string, number>;   // eventId -> turno
  recentTags: string[];
  history: HistoryEntry[];
  warned: Danger[];                    // avisos ya dados mientras dure el peligro
  dirtUsedTurn?: number;
}

export interface Ending {
  win: boolean;
  key: string;
  title: string;
  text: string;
  causes: HistoryEntry[];
}
