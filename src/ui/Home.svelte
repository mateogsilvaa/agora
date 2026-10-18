<script lang="ts">
  import { CATEGORIES, TESTS } from '../tests';
  import type { Category } from '../quiz/types';

  const cats = Object.keys(CATEGORIES) as Category[];
</script>

<main class="mx-auto max-w-3xl px-4 pb-6">
  <header class="flex items-center justify-between py-5">
    <span class="font-display text-xl font-extrabold tracking-wide">VOTÁGORA</span>
    <a class="text-sm font-semibold underline underline-offset-4" href="#brujula">Ver tests</a>
  </header>

  <section class="entra rounded-[2rem] bg-tinta px-6 py-10 text-papel sm:px-10 sm:py-14">
    <p class="text-xs font-bold uppercase tracking-[0.2em] text-acento">El Oráculo</p>
    <h1 class="mt-3 font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl">Descubre quién eres en un minuto. Y discútelo con tus amigos.</h1>
    <p class="mt-5 max-w-xl text-lg text-papel/80">Desliza a la derecha si estás de acuerdo y a la izquierda si no. Comparte tu tarjeta, reta a tus amigos o jugad todos a la vez en directo.</p>
    <a class="late mt-8 inline-grid h-14 place-items-center rounded-2xl bg-acento px-7 text-base font-bold text-tinta" href="/test/{TESTS[0].slug}/">Empezar por el test electoral a ciegas</a>
  </section>

  {#each cats as cat (cat)}
    <section id={cat} class="mt-12 scroll-mt-4">
      <h2 class="font-display text-2xl font-extrabold">{CATEGORIES[cat].name}</h2>
      <p class="text-gris">{CATEGORIES[cat].blurb}</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        {#each TESTS.filter(t => t.category === cat) as t (t.slug)}
          <a class="group flex min-h-44 flex-col justify-between rounded-3xl p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl" style="background: {t.color}; color: {t.ink}" href="/test/{t.slug}/">
            <span class="font-display text-2xl font-extrabold leading-tight">{t.title}</span>
            <span class="mt-4 flex items-center justify-between text-sm font-semibold opacity-85">
              {t.questions.length} tarjetas · {t.minutes} min
              <span class="transition group-hover:translate-x-1">Jugar →</span>
            </span>
          </a>
        {/each}
      </div>
    </section>
  {/each}

  <section class="mt-12 rounded-3xl border-2 border-tinta p-6">
    <h2 class="font-display text-2xl font-extrabold">Jugad todos a la vez</h2>
    <p class="mt-2 text-gris">Entra en cualquier test y pulsa «Jugar con amigos en directo». Os llega un código, cada uno responde desde su móvil, veis los resultados en directo y votáis quién creéis que es cada uno.</p>
  </section>
</main>
