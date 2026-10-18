import type { Party, Stat } from '../engine/types';

export const PARTIES: { id: Party; name: string; blurb: string; color: string }[] = [
  { id: 'PTC', name: 'Partido Tradicional Conservador', blurb: 'Gaviotas, sedes con discos duros frágiles y un tesorero muy generoso.', color: '#24476B' },
  { id: 'PSTV', name: 'Partido Socialista de Toda la Vida', blurb: 'El puño, la rosa y una gestora esperando en cada esquina.', color: '#B3261E' },
  { id: 'AI', name: 'Asamblea Ilusionada', blurb: 'Círculos, coletas y una casa con piscina en el horizonte.', color: '#6B3A7A' },
  { id: 'CNC', name: 'Ciudadanía Naranja de Centro', blurb: 'Corbata sin chaqueta. El centro de todo y de nada.', color: '#C08A2E' },
  { id: 'VP', name: 'Voz Patria', blurb: 'Caballos, banderas y propuestas de «sentido común».', color: '#2F6B4F' },
];

export const STATS: { id: Stat; label: string; short: string; color: string; icon: string }[] = [
  { id: 'influencia', label: 'Influencia en el Partido', short: 'Partido', color: 'var(--color-boe)', icon: '💼' },
  { id: 'aprobacion', label: 'Aprobación Pública', short: 'Calle', color: 'var(--color-urna)', icon: '🗳️' },
  { id: 'medios', label: 'Control Mediático', short: 'Medios', color: 'var(--color-portada)', icon: '🎙️' },
  { id: 'alerta', label: 'Nivel de Alerta (UCU)', short: 'Alerta', color: 'var(--color-tampon)', icon: '🚨' },
];

export const STAT_HELP: Record<Stat, string> = {
  influencia: 'Sin influencia te purgan. Con demasiada, te apuñalan.',
  aprobacion: 'Si la calle te odia, fuera de las listas. Si te adora, eres el sacrificio perfecto.',
  medios: 'Sin prensa no existes. Si la controlas toda, la prensa acaba contándolo.',
  alerta: 'Lo que la UCU y el juez saben de ti. Casi nunca baja sola. A 100, te detienen.',
};

export const DEBTS: Record<string, string> = {
  sobre_obrascon: 'El sobre de Obrascón',
  ibertruenos: 'El despacho en Ibertruenos',
};

export const NPCS: Record<string, string> = {
  mentor: 'Don Anselmo', baron: 'El Barón', periodista: 'Lola', tesorero: 'El Tesorero', informatico: 'Rober',
};

export const CHANNEL_LABEL = {
  whatsapp: 'WhatsApp', notificacion: 'Última hora', email: 'Correo', tertulia: 'En directo', carta: 'Por escrito',
} as const;
