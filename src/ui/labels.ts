import type { Channel, Stat, Via } from '../engine/types';

export const STATS: { id: Stat; label: string; color: string; help: string }[] = [
  { id: 'influencia', label: 'INFLUENCIA', color: 'var(--color-inf)', help: 'Peso dentro del partido. Sin ella te dejan fuera de las listas; con demasiada, te ven venir.' },
  { id: 'opinion', label: 'OPINIÓN PÚBLICA', color: 'var(--color-opi)', help: 'Lo que la calle piensa de ti. Si te odia, restas. Si te adora, eres el sacrificio perfecto.' },
  { id: 'prensa', label: 'PRENSA', color: 'var(--color-pre)', help: 'Tu relación con los medios. Sin prensa no existes; si la controlas toda, acaba saliendo.' },
  { id: 'judicial', label: 'RIESGO JUDICIAL', color: 'var(--color-jud)', help: 'Lo que un juez podría saber de ti. Casi nunca baja solo. Al máximo, te imputan.' },
];

export const VIAS: Record<Via, string> = { aparato: 'Aparato', tecnica: 'Técnica', movimiento: 'Movimiento' };

export const CHANNELS: Record<Channel, string> = {
  mensaje: 'MENSAJE CIFRADO', despacho: 'EN EL DESPACHO', correo: 'CORREO INTERNO',
  pleno: 'EN EL PLENO', calle: 'EN LA CALLE', llamada: 'LLAMADA ENTRANTE',
};
