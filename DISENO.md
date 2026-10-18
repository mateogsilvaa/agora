# Votágora: La Nueva Política — Documento de diseño

> Juego narrativo de estrategia (cartas a izquierda/derecha + decisiones con peso). PWA. Sátira política de una España que no existe.
> Eres un diputado raso del montón. Objetivo: sobrevivir a las purgas, apuñalar a tiempo, tapar lo tapable y acabar en la Moncloa de Mentira.

---

## 0. Pilares (lo que no se negocia)

1. **Cada decisión deja rastro.** Nada se olvida: todo lo que haces escribe *flags* y *deudas* que el mazo consulta después.
2. **Nadie muere sin verlo venir.** Toda muerte se telegrafía al menos 2 turnos antes.
3. **Partidas de 5-10 minutos** (≈ 40-70 cartas), con progreso entre partidas.
4. **Coherencia antes que variedad.** El generador elige entre eventos escritos a mano según reglas, no improvisa frases.
5. **Ningún nombre real.** Todo es parodia evidente o amalgama.

---

## 1. Mundo: el Reino de Hispalia (atemporal)

Respuesta al Abogado del diablo: no ambientamos en 2016 real (envejece y obliga a nombres). Usamos **un país ficticio congelado en el "eterno 2016"**: bloqueo, repetición electoral, tertulias a gritos, másteres dudosos, SMS de "sé fuerte". Reconocible, pero sin fecha ni personas.

- **Partidos (ficticios, por ideología, no por siglas reales):**
  - *Partido Tradicional Conservador (PTC)*: las gaviotas de siempre, sedes con discos duros frágiles.
  - *Partido Socialista de Toda la Vida (PSTV)*: el puño, la rosa y la gestora.
  - *Asamblea Ilusionada (AI)*: coletas, círculos y una casa con piscina en el horizonte.
  - *Ciudadanía Naranja de Centro (CNC)*: corbata sin chaqueta, centro de todo y de nada.
  - *Voz Patria (VP)*: caballos, banderas y propuestas de "sentido común".
  - El jugador elige partido al inicio; cambia el tono de los eventos, no el reglamento.
- **Instituciones de ficción:** la UCU (Unidad Central de Uniformados, la "UCO" del juego), el Juez Estrella de turno, *La Tertulia Infinita*, el diario *El Confidencial Digital Libre*, la constructora *Obrascón Ladrillo y Asociados*, la eléctrica *Ibertruenos*.
- **Disclaimer (pantalla de arranque y tienda):**
  > "Votágora es una obra de ficción y sátira. Hispalia no existe, sus partidos tampoco y cualquier parecido con políticos reales es la prueba de que la realidad copia mal. Ningún diputado ha sido dañado durante el desarrollo, aunque varios lo merecían."

---

## 2. Mecánicas

### 2.1 Las 4 barras (0-100)

| Barra | Si llega a 0 | Si llega a 100 |
|---|---|---|
| **Influencia en el Partido** | Purga: te mandan al Senado Eterno | Te ven como amenaza: el aparato te apuñala primero |
| **Aprobación Pública** | Abucheo viral: listas cerradas sin ti | Populista incómodo: te usan de cabeza de turco |
| **Control Mediático** | Los medios te ignoran: muerte por irrelevancia | Escándalo de "cloacas": tu propio control te delata |
| **Nivel de Alerta (UCU/juez)** | — (0 es bueno) | Detención en directo a las 7:00, cámaras incluidas |

Tres barras matan por los dos extremos (estilo Reigns); la Alerta solo mata arriba y **casi nunca baja sola**: es la deuda acumulada.

### 2.2 Memoria a largo plazo (respuesta al jugador escéptico)

- **Flags**: `aceptó_sobre_constructora`, `traicionó_a_mentor`, `máster_en_3_semanas`.
- **Deudas** con turno de vencimiento: `{ id: "sobre_obrascon", creado: 2, vence: [40, 60], gravedad: 3 }`. Cuando vencen, entra una carta de su cadena ("El sobre del turno 2 ha vuelto, y viene con un sumario de 400 páginas").
- **Relaciones con NPC** (−3 a +3): Mentor, Barón Regional, Periodista de Cabecera, Juez Estrella, Tesorero.
- **Trapos sucios (inventario)**: cartas de chantaje sobre otros. Se ganan con ciertas decisiones y se juegan para anular un evento, bajar Alerta o subir Influencia. Usar uno crea un enemigo (flag `enemigo:<npc>`).
- **Meta-memoria entre partidas** (*Hemeroteca*): finales vistos, NPCs desbloqueados, "Leyendas" (el diputado que se comió un sumario aparece citado en la siguiente partida como "aquel que…").

### 2.3 Telegrafía de consecuencias (respuesta al PM)

- **Previsualización**: al deslizar una opción, las barras afectadas muestran un punto (pequeño/grande), nunca el número exacto. Igual que Reigns: informa sin resolver.
- **Avisos**: si una barra entra en zona roja (<15 o >85; Alerta >70), la siguiente carta es siempre de *aviso* (el Mentor, un SMS anónimo, un tertuliano), con una salida posible.
- **Pantalla de muerte con causa**: "Has caído porque: (1) aceptaste el sobre en el turno 2, (2) ignoraste el SMS del turno 31, (3) tu Alerta superó 100 en el turno 44". Con las 3 decisiones clave enlazadas.
- **Curva**: turnos 1-10 sin eventos letales; dificultad sube por *legislatura* (Acto I diputado → II portavoz → III ministro → IV candidato).

### 2.4 Estructura de partida (5-10 min)

- 4 actos × 10-18 cartas. Al final de cada acto, un **hito** (primarias, moción de censura, debate electoral) que filtra según tus barras y flags.
- Guardado automático cada carta (local) y en la nube al cerrar acto.

---

## 3. Arquitectura y Firestore

### 3.1 Principio (respuesta al CTO)

**Firestore no sirve eventos.** El contenido es un paquete JSON versionado (`content/pack-v1.json`, ~300-800 KB comprimido) que va en el build y lo cachea el service worker. Toda la lógica es local y determinista (semilla). Firebase solo para: perfiles, partidas guardadas (nube), analíticas y *Hemeroteca* compartida.

```
Cliente (PWA)
 ├─ pack de eventos (JSON, cache SW)   ← se actualiza con cada deploy
 ├─ motor (TS puro, sin UI, testeable)
 ├─ estado en IndexedDB (partida en curso)
 └─ Firebase: Auth anónima → Firestore (saves, perfil) + Analytics por lotes
```

Packs nuevos (DLC/temporadas) = otro JSON descargable desde Storage/hosting, validado por hash. Coste de lectura: ~2 lecturas por sesión.

### 3.2 Modelo de datos

```
users/{uid}
  displayName, createdAt, premium: bool, packs: ["base","cloacas"]
  settings: { streamerMode, reducedMotion, lang }
  hemeroteca: { endingsSeen: [ids], npcsUnlocked: [...], bestRun: {acto, turno} }

users/{uid}/saves/{slot}              // máx 3 slots
  version: "pack-v1.3"
  seed: 918273, turn: 37, act: 3
  stats: { influencia: 54, aprobacion: 41, medios: 62, alerta: 58 }
  flags: ["sobre_obrascon", "master_express"]
  debts: [{ id, createdTurn, dueTurn, severity }]
  relations: { mentor: -2, baron: 1, ... }
  hand: ["trapo_tesorero_sms", ...]
  history: [{ t, eventId, option }]   // comprimido, para pantalla de muerte
  updatedAt

runs/{runId}                           // partida acabada, inmutable
  uid, pack, seed, turns, ending, cause: [eventId...], party, createdAt
  shareCard: { title, quote, stats }   // datos para la imagen compartible

analytics_daily/{yyyy-mm-dd}/events/{eventId}   // agregado por Cloud Function o por lotes
  shown, optA, optB, optC, deathsAfter
```

- Reglas: cada uno solo lee/escribe lo suyo; `runs` escritura una vez, lectura pública solo de `shareCard` (para la URL de compartir).
- Analíticas: el cliente acumula y manda **un único write al terminar la partida** (no por carta). Sirve para equilibrar: si una opción mata al 70 %, se toca el pack.

### 3.3 Formato de un evento (en el pack, no en Firestore)

```json
{
  "id": "obrascon_sobre_01",
  "chain": "obrascon", "step": 1,
  "act": [1, 2],
  "weight": 3,
  "tags": ["corrupcion", "empresa"],
  "requires": { "flagsNone": ["sobre_obrascon"], "stats": { "alerta": [0, 60] } },
  "ideology": { "PTC": 1.5, "VP": 1.2, "AI": 0.4 },
  "cooldown": 999,
  "speaker": "tesorero",
  "channel": "whatsapp",
  "text": "…",
  "options": [
    { "label": "…", "effects": { "influencia": 8, "alerta": 12 },
      "setFlags": ["sobre_obrascon"],
      "addDebt": { "id": "sobre_obrascon", "in": [35, 55], "severity": 3 } }
  ]
}
```

### 3.4 Por qué no se vuelve incoherente (y miles de partidas distintas)

El generador es **un director, no un dado**:

1. **Filtro duro** por precondiciones (acto, flags, rango de stats, relación con NPC, partido).
2. **Prioridades**: deuda vencida > aviso de zona roja > siguiente paso de una cadena abierta > hito de acto > relleno.
3. **Pesos blandos**: ideología del partido, tags recientes (penaliza 3 cartas seguidas del mismo tema), tensión deseada (si el jugador va muy cómodo, sube el peso de cartas peligrosas).
4. **Sin repeticiones rápidas**: `cooldown` por evento y por tag; cada evento de relleno tiene 3-5 variantes de texto.
5. **Cadenas**: ~40 cadenas de 3-8 pasos, que se cruzan (el Periodista puede publicar el sobre de Obrascón si le negaste la exclusiva). La combinatoria de cadenas × orden × partido × ramas da la variedad, no las frases aleatorias.
6. **Plantillas solo para nombres secundarios** (`{municipio}`, `{empresa_tapadera}`, `{tertuliano}`) de listas cerradas escritas a mano.

Volumen objetivo del lanzamiento: 350 eventos (40 cadenas + 120 relleno + 30 avisos + 16 hitos + 25 finales).

---

## 4. UI/UX

### 4.1 Paleta "Hemeroteca de Kiosco"

Estilo editorial retro (papel de diario, tinta, tampón de "CONFIDENCIAL").

| Token | Hex | Uso |
|---|---|---|
| `--papel` | `#F2EAD8` | Fondo |
| `--papel-2` | `#E6DBC3` | Tarjetas |
| `--tinta` | `#1C1A17` | Texto |
| `--tinta-suave` | `#5B544A` | Secundario |
| `--rojo-tampon` | `#B3261E` | Alerta, muerte, "CONFIDENCIAL" |
| `--azul-boe` | `#24476B` | Influencia |
| `--verde-urna` | `#2F6B4F` | Aprobación |
| `--ocre-portada` | `#C08A2E` | Medios |
| `--gris-sumario` | `#8C8577` | Bordes, separadores |
| Modo noche ("Noche de escrutinio") | fondo `#16140F`, tinta `#ECE3CF` | |

Tipos: titulares en serif condensada (Playfair Display / "DM Serif Display"), cuerpo en serif de lectura (Source Serif), mensajes en sans (Inter) y cifras en mono (IBM Plex Mono). Iconos de barra: maletín, urna, micrófono, tricornio estilizado.

### 4.2 Móvil vertical — "modo WhatsApp" (principal)

```
┌──────────────────────────┐
│ ▣ 54  ▣ 41  ▣ 62  ▣ 58 ! │  barras (iconos + relleno; parpadea la roja)
├──────────────────────────┤
│  TURNO 37 · ACTO III     │
│  ┌────────────────────┐  │
│  │ 💬 Tesorero        │  │  hilo de chat: burbujas, "escribiendo…",
│  │ "Sé fuerte."       │  │  hora, doble check azul
│  │ "Mañana hablamos." │  │
│  └────────────────────┘  │
│                          │
│  ←  Borrar el chat       │  desliza la carta (o toca el botón)
│     Reenviar al Juez  →  │  3ª opción: mantener pulsado
│                          │
│ [🗂 Trapos (3)]  [📰 Prensa]│
└──────────────────────────┘
```
- Cada evento tiene `channel`: `whatsapp`, `notificación` (push falsa de periódico), `email`, `tertulia` (subtítulo de TV), `carta` (papel con tampón). Todo se lee como el móvil del diputado.
- Gestos: deslizar = elegir; mantener = tercera opción; tocar barra = explicación de qué la mueve.

### 4.3 Móvil apaisado — "Despacho" (gestión)

Se abre al girar el móvil o entre actos:
- Izquierda: **Organigrama** del partido con NPCs y relación (caras de caricatura, flechas de lealtad).
- Centro: **Agenda**: cadenas abiertas y deudas con una pista ("Algo de Obrascón huele a sumario… ~10 turnos").
- Derecha: **Trapos sucios** en abanico.

### 4.4 Escritorio

Tres columnas fijas: organigrama | carta en el centro (teclas ← → ↓) | prensa en directo (titulares generados de tus decisiones, cada uno compartible). Modo streamer accesible con tecla `S`.

### 4.5 Menú

Portada de periódico: cabecera *EL VOTÁGORA — Edición de la Mañana*. Titulares como botones: "**Nueva legislatura**", "Continuar: *El diputado X, en el ojo del huracán*", "Hemeroteca", "Ajustes", "Modo streamer". La fecha es "Martes, 2016 de siempre".

### 4.6 Vista de evento

Carta de papel con borde dentado. Arriba: avatar caricaturizado + canal. Texto ≤ 280 caracteres (se lee en 5 s). Debajo, al iniciar el gesto, aparecen los puntos de previsualización sobre las barras. Tras elegir, un **titular** de 1 línea resume la consecuencia ("Diputado borra 4.000 mensajes por accidente") y se archiva en la Hemeroteca de la partida.

### 4.7 Inventario de Trapos sucios

Cartas tipo expediente: carpeta beige, foto con clip, tampón rojo "CONFIDENCIAL", nivel de gravedad (1-3 tampones).

```
┌───────────────┐
│ CONFIDENCIAL  │
│ [foto clip]   │
│ EL BARÓN      │
│ "Las facturas │
│  del AVE a    │
│  su pueblo"   │
│ ●●○ gravedad  │
│ [Usar] [Guardar]│
└───────────────┘
```
Usar un trapo: animación de sobre que se cierra; efecto inmediato + flag `enemigo:baron` que activa su cadena de venganza.

---

## 5. Frontend

### 5.1 Stack

**Svelte 5 + Vite + Tailwind + TypeScript**, con `vite-plugin-pwa`.
Por qué: menos código y bundle más pequeño que React para una app de una pantalla con animaciones; stores reactivos sencillos. El **motor va aparte en TS puro** (`src/engine`), sin dependencia de UI: se testea con Vitest y se puede simular 10.000 partidas por la noche en CI para equilibrar.

### 5.2 Estructura

```
src/
  engine/            # TS puro, determinista
    types.ts
    rng.ts           # mulberry32 con semilla
    director.ts      # elige el siguiente evento
    game.ts          # loop: aplica opciones y explica la muerte
  content/           # pack JSON + validador (zod) en build
  lib/
    firebase.ts      # auth anónima, saves, runs
    persist.ts       # IndexedDB
    share.ts         # genera la imagen del final (canvas)
  ui/
    App.svelte
    screens/  Menu, Game, Office (apaisado), Hemeroteca, Death, Ending
    components/ StatBar, EventCard, ChatThread, OptionSwipe, DirtCard,
                DirtInventory, OrgChart, PressTicker, StreamerOverlay
  stores/ game.ts    # envuelve el motor en un store de Svelte
scripts/
  simulate.ts        # bots que juegan miles de partidas → informe de muertes
```

### 5.3 Game loop

Ver `src/engine/` en este repo (esqueleto funcional en TS):
1. `nextEvent(state)` — el director filtra por precondiciones y prioridades y sortea con pesos.
2. La UI muestra el evento y la previsualización (`previewOption`).
3. `choose(state, eventId, optionIndex)` — aplica efectos, flags, deudas y trapos, y registra el historial.
4. `checkDeath(state)` — si alguna barra rompe, devuelve el final y las **3 decisiones causantes** (las que más movieron esa barra con peso por cercanía).
5. Guardado local; al cerrar acto, sincroniza con Firestore.

---

## 6. Tres eventos de ejemplo

(Texto completo en `content/sample-events.json`.)

**1. "Sé fuerte" (cadena Obrascón, paso 1, acto I)** — WhatsApp del Tesorero.
> "Querido, hay una gente de Obrascón Ladrillo que quiere agradecerte tu apoyo a la rotonda. Es un sobre. Sin compromiso. Bueno, con algo de compromiso."

| Opción | Infl. | Aprob. | Medios | Alerta | Memoria |
|---|---|---|---|---|---|
| Aceptar el sobre "por el partido" | +10 | 0 | 0 | +12 | flag `sobre_obrascon`, **deuda** vence turno 35-55 |
| Rechazarlo y que conste en acta | −8 | +4 | 0 | −3 | flag `incorruptible` (el Tesorero te mira raro) |
| Rechazarlo… y hacer captura del chat | −4 | 0 | 0 | +2 | gana trapo **"El Tesorero y los sobres"** |

**2. "El máster exprés" (acto II)** — notificación de *El Confidencial Digital Libre*.
> "Un periódico pregunta cómo aprobaste un máster de 60 créditos en las tres semanas que estuviste de vacaciones en Benidorm. La universidad dice que tu TFM 'se ha traspapelado con mucho cariño'."

| Opción | Infl. | Aprob. | Medios | Alerta | Memoria |
|---|---|---|---|---|---|
| "Lo hice. Y tengo las notas." (no las tienes) | +2 | −6 | −8 | +6 | flag `mintio_master`; si el Periodista es enemigo, publica las actas en 5 turnos |
| Dimitir del cargo y no del escaño | −10 | +8 | +4 | 0 | flag `dimision_tactica` |
| Filtrar el máster de un compañero del mismo curso | +6 | −2 | +10 | +3 | relación Barón −2, gana trapo **"Promoción 2016"** |

**3. "Los discos duros" (cadena Obrascón, deuda vencida, acto III)** — solo si `sobre_obrascon`.
> "La UCU ha pedido los discos duros de la sede. El informático te pregunta, temblando, cuántas veces 'exactamente' hay que darles con el martillo."

| Opción | Infl. | Aprob. | Medios | Alerta | Memoria |
|---|---|---|---|---|---|
| "Treinta y cinco. Y luego al microondas." | +6 | −4 | 0 | +18 | flag `martillazos`; final alternativo "El Informático Arrepentido" |
| Entregar los discos y culpar al Tesorero | −12 | +6 | +4 | −15 | consume trapo del Tesorero si lo tienes (si no, −20 Infl.); `enemigo:tesorero` |
| Llamar a *La Tertulia Infinita* y hablar de Venezuela 40 minutos | 0 | −2 | +12 | +5 | retrasa la deuda 10 turnos (vuelve peor) |

---

## 7. Viralidad (Growth)

- **Tarjeta de final/fracaso** (canvas 1080×1350, también 9:16): portada de periódico con el titular de tu caída, foto caricatura, tres "pruebas" y semilla. "Detenido en directo tras 44 turnos y un sobre."
- **"Juega mi legislatura"**: el enlace incluye la semilla y el partido; tus amigos juegan la misma partida y comparan quién duró más.
- **Modo streamer**: oculta nombres de usuario, fondo croma, opciones grandes y **votación del chat** (Twitch: el chat elige izquierda/derecha con `!1`/`!2` vía extensión simple o integración por IRC en local).
- **Tráiler (30 s, humor negro)**: un diputado sonriente pasa de becario a presidente a golpe de swipe; plano final: detención a las 7:00 con cámaras, rótulo "Ningún final es feliz. Algunos son televisados."
- **Titular del día**: un evento diario igual para todos (semilla del día) con ranking.

---

## 8. Negocio (Inversor)

- **F2P + compra única de 4,99 €** ("Carné del Partido"):
  - Gratis: Acto I-II completos, 1 partido, publicidad cero (sin anuncios: rompen el tono).
  - Pago: los 4 actos, los 5 partidos, Hemeroteca completa, modo streamer y creador de partidas con semilla.
- **Packs de temporada** (1,99-2,99 €): "Las Cloacas", "Elecciones Autonómicas", "El Exilio Dorado". Son contenido nuevo, no ventajas.
- **Por qué pagar 5 €**: es lo que vale un menú del día, y te dura más que una legislatura.
- **Defensa ante copias**:
  - El valor está en **contenido escrito y su red de cadenas**, no en el motor (copiable en un finde). 350 eventos con voz propia no se clonan.
  - **Comunidad**: concurso mensual de eventos escritos por jugadores (editor web + votación); los ganadores entran en el pack firmados. Discord con "La Tertulia".
  - **Ritmo**: un pack por temporada atado a la actualidad *genérica* (sin nombres), lo que mantiene el juego vivo sin envejecer.

---

## 9. Riesgos legales y de contenido

- Lista negra de nombres reales en el validador del pack (falla el build si aparece uno).
- Caricaturas originales, sin parecido facial deliberado con nadie concreto.
- Sátira simétrica: todos los partidos ficticios tienen cadenas igual de feas.
- Disclaimer visible en tienda, arranque y tarjetas compartidas (pie: "Ficción satírica · votagora").

---

## 10. Hoja de ruta

1. **Semana 1-2**: motor + 60 eventos + vertical en móvil. Simulador de bots. *Nada más.* (PM)
2. **Semana 3-4**: muerte explicada, telegrafía, guardado, equilibrado con el simulador.
3. **Semana 5**: tarjeta compartible + semilla compartida. Prueba cerrada con 30 personas.
4. **Semana 6-8**: hasta 200 eventos, apaisado/escritorio, pago (Stripe o tienda), Firebase.
5. **Lanzamiento** con 350 eventos y modo streamer.
