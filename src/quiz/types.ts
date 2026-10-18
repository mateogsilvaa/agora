export type Category = 'brujula' | 'mapa' | 'satira';

/** Respuesta a una tarjeta: de acuerdo, en desacuerdo o "paso". */
export type Answer = 1 | -1 | 0;

export interface Profile {
  id: string;
  name: string;
  /** Remate que va detrás del nombre en la tarjeta: "y debería exiliarme a una cabaña en Huesca". */
  tagline: string;
  description: string;
  color: string;
}

export interface Question {
  id: string;
  text: string;
  /** Peso de cada perfil si respondes "de acuerdo". En desacuerdo resta lo mismo. */
  w: Record<string, number>;
}

export interface QuizTest {
  slug: string;
  category: Category;
  title: string;
  /** Título para Google: corto, con la palabra clave delante. */
  seoTitle: string;
  description: string;
  /** Texto de la página para buscadores y para quien llega sin saber qué es. */
  intro: string[];
  faq: { q: string; a: string }[];
  /** Frase de la tarjeta: "{pct}" y "{name}" se sustituyen. */
  headline: string;
  color: string;
  ink: string;
  agree: string;
  disagree: string;
  minutes: number;
  profiles: Profile[];
  questions: Question[];
  order?: number;
}

export interface Ranked { profile: Profile; pct: number }

export interface Result {
  slug: string;
  answers: Answer[];
  ranking: Ranked[];
}
