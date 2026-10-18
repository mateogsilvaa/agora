import type { Dirt, GameEvent } from './engine/types';
import events from '../content/events.json';
import dirt from '../content/dirt.json';

export const PACK = events as unknown as GameEvent[];
export const DIRT = dirt as unknown as Dirt[];
export const dirtById = (id: string) => DIRT.find(d => d.id === id);

export const SPEAKERS: Record<string, string> = {
  tesorero: 'El Tesorero', informatico: 'Rober (Informática)', juez: 'Juzgado Central nº 6',
  mentor: 'Don Anselmo (tu padrino)', baron: 'El Barón Regional', periodista: 'Lola · El Confidencial',
  confidencial: 'El Confidencial Digital Libre', secretario: 'Secretaría General', asesor: 'Iñaki (asesor)',
  productora: 'La Tertulia Infinita', ibertruenos: 'Ibertruenos S.A.', demoscopia: 'Instituto de Encuestas',
  jefe_grupo: 'Jefa de grupo', jefe_gabinete: 'Jefe de gabinete', fundacion: 'Fundación Pensamiento Libre',
  anonimo: 'Número oculto', presidente: 'Presidencia',
};
