import type { Category, QuizTest } from './quiz/types';

const files = import.meta.glob<QuizTest>('../content/tests/*.json', { eager: true, import: 'default' });

export const TESTS: QuizTest[] = Object.values(files).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const testBySlug = (slug: string) => TESTS.find(t => t.slug === slug);

export const CATEGORIES: Record<Category, { name: string; blurb: string }> = {
  brujula: { name: 'La Brújula Política', blurb: 'Para saber dónde estás de verdad, sin siglas ni caras.' },
  mapa: { name: 'El Mapa Vital', blurb: 'Dónde deberías vivir, de dónde eres por dentro.' },
  satira: { name: 'Sátira y Supervivencia', blurb: 'Cuánto aguantarías ahí dentro.' },
};

export const SITE = 'https://votagora.es';
