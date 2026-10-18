# Votágora: La Nueva Política

Juego de cartas narrativo en una PWA: una carrera política entera, de la facultad (enero de 2016) a la presidencia.
Cada decisión es la misma pregunta: traicionar lo que crees para avanzar, o mantenerlo y pagar el precio.

> Obra de ficción y sátira. Ningún personaje, partido ni empresa es real.

- Diseño completo: [DISENO.md](DISENO.md)
- Stack: Svelte 5 + Vite + Tailwind 4 + TypeScript. Firebase solo para registrar partidas acabadas.
- Motor en TypeScript puro (`src/engine`): 7 etapas, 3 vías, 5 orígenes, convicción oculta, deudas que vuelven y legado entre carreras.
- Pixel art generado en canvas (`src/ui/pixel`): escenarios por lugar y retratos por cargo.
- Mazo en `content/cards/*.json`, un archivo por bloque de etapas. Va en el bundle: cero lecturas a Firestore mientras se juega.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # valida el mazo (cargos, escenarios, avisos, ascensos, lista negra de nombres reales) y juega 1000 carreras
npm run simulate   # bots (azar, prudente, trepa, íntegro) que juegan 4000 carreras cada uno
```

Despliegue: GitHub Pages en cada push a `main` (`.github/workflows/deploy.yml`), dominio votagora.es.
La versión anterior del repo (Ágora, la app de decisiones en grupo) está en la etiqueta `agora-final`.
