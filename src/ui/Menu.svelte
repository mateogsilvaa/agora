<script lang="ts">
  import type { Party } from '../engine/types';
  import { PARTIES } from './data';

  let { canContinue, seedFromLink, endings, streamer, onstart, oncontinue, onstreamer }: {
    canContinue: boolean;
    seedFromLink: { seed: number; party: Party } | null;
    endings: number;
    streamer: boolean;
    onstart: (party: Party, seed?: number) => void;
    oncontinue: () => void;
    onstreamer: () => void;
  } = $props();

  let choosing = $state(false);
</script>

<main class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
  <header class="text-center">
    <p class="font-cifra text-[11px] uppercase tracking-widest text-tinta-suave">Martes, 2016 de siempre · Reino de Hispalia · Precio: tu dignidad</p>
    <h1 class="mt-1 font-titular text-5xl font-black tracking-tight sm:text-6xl">EL VOTÁGORA</h1>
    <div class="regla mt-2 border-b border-tinta pt-1"></div>
    <p class="mt-1 font-texto italic">La Nueva Política</p>
  </header>

  {#if !choosing}
    <section class="mt-8 flex flex-col gap-6">
      <button class="group text-left" onclick={() => (choosing = true)}>
        <h2 class="font-titular text-3xl font-black leading-tight group-hover:underline">Un diputado raso aspira a presidente: «Voy a por todas»</h2>
        <p class="mt-1 font-texto text-tinta-suave">Sobrevive a las purgas, apuñala a tiempo y que no te pille la UCU. Nueva legislatura →</p>
      </button>

      {#if canContinue}
        <button class="border-t border-sumario pt-4 text-left" onclick={oncontinue}>
          <h2 class="font-titular text-2xl leading-tight hover:underline">Continúa la legislatura del diputado más investigado del hemiciclo →</h2>
        </button>
      {/if}

      {#if seedFromLink}
        <button class="border-t border-sumario pt-4 text-left" onclick={() => onstart(seedFromLink.party, seedFromLink.seed)}>
          <h2 class="font-titular text-2xl leading-tight hover:underline">Te han retado: juega la misma legislatura (semilla {seedFromLink.seed}) →</h2>
        </button>
      {/if}

      <div class="grid grid-cols-2 gap-4 border-t border-sumario pt-4 font-ui text-sm">
        <p><b class="font-titular text-lg">{endings}</b> finales descubiertos de 9</p>
        <button class="text-right underline" onclick={onstreamer}>Modo streamer: {streamer ? 'activado' : 'desactivado'}</button>
      </div>
    </section>
  {:else}
    <section class="mt-6">
      <h2 class="font-titular text-2xl">Elige tu partido</h2>
      <p class="font-ui text-sm text-tinta-suave">Cambia lo que te pasa, no las reglas. Todos son igual de presentables.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        {#each PARTIES as p (p.id)}
          <button class="papel rounded-sm border border-sumario p-3 text-left shadow-[3px_3px_0_var(--color-tinta)] hover:-translate-y-0.5"
            style="border-left: 6px solid {p.color}" onclick={() => onstart(p.id)}>
            <b class="font-titular text-lg leading-tight">{p.name} ({p.id})</b>
            <p class="font-texto text-sm text-tinta-suave">{p.blurb}</p>
          </button>
        {/each}
      </div>
      <button class="mt-4 font-ui text-sm underline" onclick={() => (choosing = false)}>Volver</button>
    </section>
  {/if}

  <footer class="mt-auto pt-10 text-center font-ui text-[11px] leading-relaxed text-tinta-suave">
    Votágora es una obra de ficción y sátira. Hispalia no existe, sus partidos tampoco, y cualquier parecido con políticos
    reales es la prueba de que la realidad copia mal.
  </footer>
</main>
