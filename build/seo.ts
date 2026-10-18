// Una página HTML real por test, para que Google la lea sin ejecutar JavaScript:
// título, descripción, canonical, Open Graph, datos estructurados y el texto del test.
// En desarrollo hace lo mismo al vuelo según la URL.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { QuizTest } from '../src/quiz/types';

const SITE = 'https://votagora.es';
const ROOT = resolve(__dirname, '..');

const CATEGORY_NAMES: Record<string, string> = {
  brujula: 'La Brújula Política',
  mapa: 'El Mapa Vital',
  satira: 'Sátira y Supervivencia',
};

function loadTests(): QuizTest[] {
  const dir = join(ROOT, 'content/tests');
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')) as QuizTest)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Page {
  path: string;
  title: string;
  description: string;
  color: string;
  ogImage: string;
  robots: string;
  jsonld: object;
  html: string;
  page: object;
}

function homePage(tests: QuizTest[]): Page {
  const byCat = Object.keys(CATEGORY_NAMES).map(cat => {
    const items = tests.filter(t => t.category === cat)
      .map(t => `<li><a href="/test/${t.slug}/">${esc(t.title)}</a>: ${esc(t.description)}</li>`).join('');
    return `<h2>${CATEGORY_NAMES[cat]}</h2><ul>${items}</ul>`;
  }).join('');
  return {
    path: '/',
    title: 'Votágora: tests de política, personalidad y vida para compartir con amigos',
    description: 'Tests rápidos de deslizar: a quién votarías a ciegas, qué líder histórico eres, de qué comunidad deberías ser. Compara tus resultados con tus amigos y jugad en directo.',
    color: '#16130f',
    ogImage: `${SITE}/og/home.png`,
    robots: 'index,follow',
    jsonld: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'Votágora', url: SITE, inLanguage: 'es-ES' },
        {
          '@type': 'ItemList',
          itemListElement: tests.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/test/${t.slug}/`, name: t.title })),
        },
      ],
    },
    html: `<h1>Tests para saber quién eres (y discutirlo con tus amigos)</h1>
<p>Votágora es una colección de tests rápidos: lees una frase, deslizas a la derecha si estás de acuerdo y a la izquierda si no. En un minuto tienes un resultado que puedes compartir, comparar con tus amigos o jugar todos a la vez en una sala en directo.</p>
${byCat}
<h2>Cómo funciona</h2>
<p>Cada test tiene entre 16 y 22 tarjetas. No hace falta registrarse. Al terminar puedes descargar una imagen con tu resultado para Instagram, WhatsApp o X, mandar un reto a un amigo para comparar respuestas, o crear una sala para que todo el grupo haga el mismo test y adivine quién es quién.</p>`,
    page: { type: 'home' },
  };
}

function testPage(t: QuizTest, tests: QuizTest[]): Page {
  const url = `${SITE}/test/${t.slug}/`;
  const others = tests.filter(o => o.slug !== t.slug)
    .map(o => `<li><a href="/test/${o.slug}/">${esc(o.title)}</a></li>`).join('');
  return {
    path: `/test/${t.slug}/`,
    title: `${t.seoTitle} | Votágora`,
    description: t.description,
    color: t.color,
    ogImage: `${SITE}/og/${t.slug}.png`,
    robots: 'index,follow',
    jsonld: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Quiz',
          name: t.title,
          description: t.description,
          url,
          inLanguage: 'es-ES',
          timeRequired: `PT${t.minutes}M`,
          isAccessibleForFree: true,
          about: CATEGORY_NAMES[t.category],
        },
        {
          '@type': 'FAQPage',
          mainEntity: t.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Votágora', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: CATEGORY_NAMES[t.category], item: `${SITE}/#${t.category}` },
            { '@type': 'ListItem', position: 3, name: t.title, item: url },
          ],
        },
      ],
    },
    html: `<h1>${esc(t.title)}</h1>
${t.intro.map(p => `<p>${esc(p)}</p>`).join('\n')}
<p>${t.questions.length} tarjetas · unos ${t.minutes} minuto${t.minutes > 1 ? 's' : ''} · sin registro.</p>
<h2>Posibles resultados</h2>
<ul>${t.profiles.map(p => `<li><strong>${esc(p.name)}</strong>: ${esc(p.description)}</li>`).join('')}</ul>
<h2>Preguntas frecuentes</h2>
<dl>${t.faq.map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>
<h2>Más tests</h2>
<ul>${others}</ul>`,
    page: { type: 'test', slug: t.slug },
  };
}

function roomPage(): Page {
  return {
    path: '/sala/',
    title: 'Sala en directo | Votágora',
    description: 'Haced el mismo test a la vez, ved los resultados en directo y adivinad quién es quién.',
    color: '#16130f',
    ogImage: `${SITE}/og/home.png`,
    robots: 'noindex,follow',
    jsonld: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Sala en directo' },
    html: '',
    page: { type: 'room' },
  };
}

function adminPage(): Page {
  return { ...roomPage(), path: '/admin/', title: 'Panel | Votágora', description: 'Panel de uso.', page: { type: 'admin' } };
}

export function allPages(): Page[] {
  const tests = loadTests();
  return [homePage(tests), ...tests.map(t => testPage(t, tests)), roomPage(), adminPage()];
}

function render(template: string, p: Page) {
  return template
    .replaceAll('%TITLE%', esc(p.title))
    .replaceAll('%DESCRIPTION%', esc(p.description))
    .replaceAll('%CANONICAL%', `${SITE}${p.path}`)
    .replaceAll('%ROBOTS%', p.robots)
    .replaceAll('%COLOR%', p.color)
    .replaceAll('%OG_IMAGE%', p.ogImage)
    .replace('%JSONLD%', JSON.stringify(p.jsonld).replace(/</g, '\\u003c'))
    .replace('%PAGE%', JSON.stringify(p.page))
    .replace('%SEO_HTML%', p.html);
}

function pageFor(url: string): Page {
  const path = url.split('?')[0].split('#')[0];
  const pages = allPages();
  return pages.find(p => p.path === path || p.path === path + '/') ?? pages[0];
}

export function seo(): Plugin {
  let template = '';
  let outDir = 'dist';
  return {
    name: 'votagora-seo',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return render(html, pageFor(ctx.originalUrl ?? '/'));
        template = html;
        return render(html, allPages()[0]);
      },
    },
    closeBundle() {
      if (!template) return;
      const pages = allPages();
      for (const p of pages.slice(1)) {
        const dir = join(outDir, p.path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'index.html'), render(template, p));
      }
      // 404 de verdad: la portada, pero sin indexar
      writeFileSync(join(outDir, '404.html'), render(template, { ...pages[0], robots: 'noindex' }));
      const today = new Date().toISOString().slice(0, 10);
      const urls = pages.filter(p => p.robots.startsWith('index'))
        .map(p => `  <url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n');
      writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
      writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /sala/\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
    },
  };
}
