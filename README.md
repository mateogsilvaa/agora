# Ágora

Decisiones de grupo como en un parlamento: partidos, pactos, enmiendas, cargos y votaciones.
HTML + JS vanilla (Vite) y Firebase (Auth correo/contraseña + Firestore).

## Puesta en marcha

1. **Firebase** (proyecto `agora-26e46`):
   - Authentication → Sign-in method → activar **Correo electrónico/contraseña**.
   - Firestore Database → crear base de datos (modo producción).
2. `.env.local` ya tiene la config web. Si cambias de proyecto, copia `.env.example`.
3. Desplegar reglas:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```
4. `npm install` y `npm run dev`.
5. **Chats que se borran solos**: Firestore → TTL → crear política para el grupo de colecciones
   `messages`, campo `expireAt`. (Sin ella, cada usuario borra sus mensajes caducados al abrir la sala.)

Invitar: el botón **Invitar** comparte `https://tu-web/#/join/CÓDIGO`. Quien lo abre ve el nombre
del grupo, crea la cuenta y entra directo.

## Publicar en GitHub Pages con votagora.es

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: tests → build → Pages.
`public/CNAME` ya contiene `votagora.es`.

1. GitHub → repo → **Settings → Pages → Source: GitHub Actions**.
2. En tu proveedor del dominio (DNS de `votagora.es`):
   - 4 registros **A** en `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - (opcional, IPv6) 4 **AAAA** en `@` → `2606:50c0:8000::153`, `…8001::153`, `…8002::153`, `…8003::153`
   - **CNAME** en `www` → `mateogsilvaa.github.io`
   - Borra cualquier A/CNAME previo de `@` y `www` (los de "aparcamiento" del registrador).
3. Settings → Pages → Custom domain: `votagora.es` → Save. Cuando el check de DNS pase, marca **Enforce HTTPS**.
4. (Recomendado) GitHub → tu perfil → Settings → Pages → **Verify domain** `votagora.es` (añade un TXT) para que nadie más pueda usarlo en Pages.
5. Firebase → Authentication → Settings → **Authorized domains** → añade `votagora.es` y `www.votagora.es`.

El DNS puede tardar de minutos a unas horas.

## Premium

Las cuentas nuevas son gratis: solo pueden **unirse** a un grupo. Para hacer premium a alguien
(crear grupos y estar en varios), en la consola de Firestore edita `users/{uid}` y pon
`premium: true`. Las reglas impiden que el propio usuario se lo cambie.

## Cómo funciona

- **Grupo = cámara.** Reparto de escaños: 1 persona = 1 escaño, elecciones internas (D'Hondt
  sobre N escaños, útil aunque seáis 3) o reparto manual del dueño.
- **Partidos**: cualquiera funda uno (es su portavoz) o se afilia. Se puede cambiar de partido.
- **Coaliciones**: un portavoz propone un pacto; está vigente cuando firman todos los portavoces.
  Se ve si llega a la mayoría absoluta.
- **Disciplina** (por grupo, o elegible en cada votación): libre, o en bloque — si el portavoz
  vota, su papeleta vale por todos los escaños del partido.
- **Votaciones**: sí/no (mayoría simple, absoluta o 2/3), opciones (mayoría, aprobación,
  preferencial con segunda vuelta instantánea + Condorcet, puntos), propuestas con enmiendas
  (cada enmienda se vota y luego el texto final), cargos (mayoría absoluta y segunda vuelta) y
  elecciones a la cámara. Con plazo o en directo; nominal o secreta.

## Scripts

- `npm run dev` — servidor local
- `npm test` — tests del recuento (`src/tally.js`)
- `npm run deploy` — build + Firebase Hosting y reglas
