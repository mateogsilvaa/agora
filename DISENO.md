# Votágora — Documento de diseño (v2: «La carrera»)

## 0. La idea en una frase

Sales de la facultad en enero de 2016, el año en que se rompe el bipartidismo, convencido de que vas a cambiar algo.
El juego es todo lo que pasa después. Nadie te dice que es una sátira: lo descubres cuando te das cuenta de que
llevas tres etapas firmando cosas que a los 22 años te habrían dado asco, y que cada una tenía una justificación impecable.

## 1. Tono

- **Sátira fría.** No hay chistes ni nombres cómicos. La crítica sale de la crueldad burocrática, la hipocresía
  institucional y el pragmatismo: una enmienda técnica que retrasa el SMI dos años «en base a estudios», un recorte
  que se llama «reordenación asistencial», un desahucio que es «una cuestión de seguridad jurídica».
- **Cargos, no personajes.** Te hablan el Secretario de Organización, el Enlace de Moncloa, la Portavoz del Grupo,
  el Fondo de Inversión, la Plataforma de Afectados. Nunca un nombre propio inventado para hacer gracia.
- **Dilemas sin moraleja.** Nunca «bien contra mal». Siempre «traicionar lo que crees y ganar posición» contra
  «mantenerlo y pagar el precio». A veces las dos opciones son traiciones y solo eliges a quién.
- **Realismo genérico.** No hay partidos con nombre. Hay «el partido», «el socio de gobierno», «la formación emergente»,
  «el grupo mayoritario». Ningún político, partido o empresa reales. El disclaimer sigue.

## 2. Estructura: semanas de juego, no diez minutos

- **Una carrera** dura entre 120 y 200 cartas (cada carta es un mes). Se guarda sola; se juega a ratos.
- **Siete etapas**: Facultad → Agrupación local → Ayuntamiento → Parlamento autonómico → Congreso → Gobierno → Liderazgo.
  Cada etapa tiene un mínimo de meses y un **ascenso** que solo aparece si das la talla (y si alguien te deja pasar).
- **Tres vías**, elegidas por tus decisiones en la primera etapa, no en un menú:
  - *Aparato*: lealtad, listas, congresos. Subes rápido y debes mucho.
  - *Técnica*: gabinetes, informes, BOE. Influyes sin que se sepa tu nombre.
  - *Movimiento*: la calle, las plataformas, las mareas. Llegas con legitimidad y el partido te usa como escaparate.
- **Cinco orígenes** sorteados (cinturón industrial, capital de provincia, despacho familiar, pueblo que se vacía,
  precariado con dos másteres). Cambian las barras de salida, la convicción inicial y qué cartas te llegan.
- **Muchos finales**: las cuatro caídas (purga, linchamiento público, irrelevancia, imputación), pero también
  salidas que no son muerte: consultora, tertulia, consejo de administración, volver a tu trabajo, la presidencia.

## 3. Recursos

HUD fijo de cuatro barras: **INFLUENCIA**, **OPINIÓN PÚBLICA**, **PRENSA** y **RIESGO JUDICIAL**.
Las tres primeras matan por los dos extremos; el riesgo judicial solo por arriba y casi nunca baja solo.

**Convicción** (oculta en la partida, visible en el expediente): empieza alta y baja cada vez que eliges la opción
pragmática. No mata. Cambia qué te ofrecen (con convicción baja llegan los fondos y las consultoras; con alta,
las plataformas y los que no tienen nada que ofrecerte), y cambia el epílogo de cada final.

## 4. Memoria

- **Flags y deudas** con vencimiento: la enmienda del mes 8 vuelve en el mes 70 con nombre y apellidos.
- **Relaciones** con los cargos (de −3 a +3).
- **Legado entre carreras**: lo que aprobaste o bloqueaste se queda en el mundo. La siguiente carrera empieza en
  una España donde aquella ley de vivienda existe, o no, y los personajes lo recuerdan.
- **Expediente**: archivo de todas tus carreras con su final, su epílogo y la decisión que lo decidió todo.

## 5. Motor (CTO)

- Mazo en el bundle (JSON), lógica local y determinista con semilla. Firebase solo registra carreras acabadas.
- Director con prioridades: deuda vencida > aviso de zona roja > ascenso > cadena abierta > carta normal.
  Filtro duro por etapa, vía, origen, flags, convicción, relaciones y legado. Penaliza temas repetidos.
- Simulador de bots en `npm run simulate` para equilibrar cada etapa.

## 6. Interfaz

Retro, minimalista, oscura. Pixel art solo donde suma: retratos de 16×16 generados por cargo, escenario de cada etapa
y portada. Tipografía de píxel para etiquetas y fechas; serif para el texto de los dilemas.

- **Arriba**: HUD de cuatro barras finas, colores apagados. Brillan cuando cambian. Al pasar el ratón o mantener
  pulsada una opción, las barras afectadas parpadean (más fuerte si el cambio es grande), sin dar cifras.
- **Centro**: la carta, un dossier gris oscuro flotando, con el cargo en versalitas de píxel y el dilema en serif.
- **Abajo**: dos o tres botones grandes a todo el ancho de la carta. Mantener pulsado = previsualizar; soltar = decidir.
- **Barra de estado**: fecha (MES AÑO), edad, etapa y vía.

## 7. Negocio y comunidad

Igual que en la v1: gratis las tres primeras etapas, pago único para la carrera completa y el legado.
La defensa frente a copias es el contenido escrito y el mundo persistente.
