import type { EndingDef, GameEvent } from './engine/types';
import cargos from '../content/cargos.json';
import endings from '../content/endings.json';

// Cada archivo de content/cards es un bloque del mazo; se juntan en el build.
const files = import.meta.glob<GameEvent[]>('../content/cards/*.json', { eager: true, import: 'default' });

export const PACK: GameEvent[] = Object.values(files).flat();
export const CARGOS = cargos as Record<string, string>;
export const ENDINGS = endings as Record<string, EndingDef>;
export const eventById = (id: string) => PACK.find(e => e.id === id);

import world from '../content/world.json';
export const WORLD = world as Record<string, string>;
