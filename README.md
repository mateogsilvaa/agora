# Votágora: La Nueva Política

Juego de cartas de sátira política (estilo Reigns/Suzerain) en una PWA. Eres un diputado raso del Reino de Hispalia,
un país inventado congelado en el «eterno 2016». Sobrevive a las purgas, apuñala a tiempo, tapa lo que puedas y llega a presidente.

> Obra de ficción y sátira. Ningún personaje, partido ni empresa es real.

- Diseño completo: [DISENO.md](DISENO.md)
- Stack: Svelte 5 + Vite + Tailwind 4 + TypeScript. Firebase solo para registrar partidas acabadas.
- Motor en TypeScript puro (`src/engine`): director de eventos con precondiciones, cadenas, deudas que vuelven y muerte explicada.
- Contenido en `content/*.json`: va dentro del bundle, sin lecturas a Firestore mientras se juega.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # valida el mazo (ids, avisos, lista negra de nombres reales) y juega 1000 partidas
npm run simulate   # bots que juegan 5000 legislaturas para equilibrar
```

Despliegue: GitHub Pages en cada push a `main` (`.github/workflows/deploy.yml`), dominio votagora.es.
La versión anterior del repo (Ágora, la app de decisiones en grupo) está en la etiqueta `agora-final`.
