# Votágora · El Oráculo

Tests rápidos de deslizar (de acuerdo / en desacuerdo) pensados para compartir: tarjeta de resultado en imagen,
retos entre amigos con comparación de respuestas y salas en directo donde todos hacen el mismo test y votan quién es quién.

- Stack: Svelte 5 + Vite + Tailwind 4 + TypeScript. Firebase (Firestore) para salas, eventos de uso y panel de admin.
- Tests en `content/tests/*.json`: perfiles, pesos por pregunta y texto para buscadores. Añadir un test = añadir un JSON.
- SEO (`build/seo.ts`): una página HTML estática por test con título, descripción, canonical, Open Graph, datos
  estructurados (Quiz, FAQPage, BreadcrumbList) y el texto del test visible. Genera `sitemap.xml` y `robots.txt`.
- Imágenes para redes en `public/og/`, generadas con `npm run og` cuando cambia un test.
- Panel de uso en `/admin/` (entrar con Google; el usuario tiene que estar en la colección `admins` de Firestore).

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # valida los tests (perfiles alcanzables, SEO, sin siglas reales) y la puntuación
npm run og      # regenera las imágenes para redes
```

Despliegue: GitHub Pages en cada push a `main`, dominio votagora.es. Reglas de Firestore: `npx firebase deploy --only firestore:rules`.

Versiones anteriores del repo: `agora-final` (Ágora, decisiones en grupo) y `carrera-v2` (el juego de carrera política).
