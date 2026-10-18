<script lang="ts">
  import type { Ending, GameState } from '../engine/types';
  import { STAGES, ORIGINS, dateLabel, ageAt } from '../engine/game';
  import { eventById, WORLD } from '../content';
  import { VIAS } from './labels';
  import Pixel from './Pixel.svelte';

  let { game, end, worldAdded, onnew, onmenu }: {
    game: GameState; end: Ending; worldAdded: string[]; onnew: () => void; onmenu: () => void;
  } = $props();

  const moments = $derived(end.causes.map(h => {
    const e = eventById(h.eventId);
    return { when: dateLabel(h.turn), what: e?.options[h.option].label ?? h.eventId, title: e?.title ?? e?.text.slice(0, 70) + '…' };
  }));
</script>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
  <p class="font-pixel text-[10px] tracking-[0.2em] text-ambar">{dateLabel(game.turn)} · {ageAt(game.turn)} AÑOS · FIN DE LA CARRERA</p>

  <article class="mt-5 overflow-hidden rounded-xl bg-carta shadow-2xl shadow-black/70 ring-1 ring-borde">
    <Pixel kind="scene" id={end.win ? 'moncloa' : 'noche'} class="aspect-[96/40] w-full" />
    <div class="p-5 sm:p-6">
      <h1 class="font-pixel text-xl uppercase tracking-[0.08em] {end.win ? 'text-tinta' : 'text-sangre'}">{end.title}</h1>
      <p class="mt-3 font-serif text-lg leading-relaxed">{end.text}</p>
      <p class="mt-4 border-l-2 border-ambar pl-3 font-serif text-base italic leading-relaxed text-apagado">{end.epilogue}</p>
    </div>
  </article>

  {#if moments.length}
    <section class="mt-6">
      <h2 class="font-pixel text-[10px] tracking-[0.2em] text-apagado">{end.win ? 'LO QUE TE CAMBIÓ' : 'POR QUÉ CAÍSTE'}</h2>
      <ol class="mt-3 space-y-3">
        {#each moments as m}
          <li class="rounded-md bg-carbon p-3 ring-1 ring-borde">
            <p class="font-crt text-sm tracking-widest text-tenue">{m.when}</p>
            <p class="font-serif text-sm text-apagado">{m.title}</p>
            <p class="mt-1 font-serif">→ {m.what}</p>
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  <dl class="mt-6 grid grid-cols-2 gap-3 font-crt text-lg">
    <div class="rounded-md bg-carbon p-3 ring-1 ring-borde"><dt class="font-pixel text-[9px] tracking-[0.2em] text-tenue">ORIGEN</dt><dd>{ORIGINS[game.origin].name}</dd></div>
    <div class="rounded-md bg-carbon p-3 ring-1 ring-borde"><dt class="font-pixel text-[9px] tracking-[0.2em] text-tenue">VÍA</dt><dd>{game.via ? VIAS[game.via] : '—'}</dd></div>
    <div class="rounded-md bg-carbon p-3 ring-1 ring-borde"><dt class="font-pixel text-[9px] tracking-[0.2em] text-tenue">LLEGASTE A</dt><dd>{STAGES[game.stage - 1].name}</dd></div>
    <div class="rounded-md bg-carbon p-3 ring-1 ring-borde"><dt class="font-pixel text-[9px] tracking-[0.2em] text-tenue">CONVICCIÓN</dt><dd>{game.conviccion} / 100</dd></div>
  </dl>

  {#if worldAdded.length}
    <section class="mt-6 rounded-md bg-carbon p-4 ring-1 ring-ambar/40">
      <p class="font-pixel text-[10px] tracking-[0.2em] text-ambar">LO QUE DEJAS EN EL PAÍS</p>
      <ul class="mt-2 space-y-1.5 font-serif text-sm">
        {#each worldAdded as w}<li>— {WORLD[w] ?? w}</li>{/each}
      </ul>
      <p class="mt-3 font-serif text-xs italic text-tenue">La siguiente carrera empezará en este país.</p>
    </section>
  {/if}

  <div class="mt-8 flex flex-col gap-3">
    <button class="bisel rounded-md bg-tinta px-5 py-4 font-pixel text-sm tracking-[0.15em] text-noche" onclick={onnew}>OTRA CARRERA</button>
    <button class="bisel rounded-md bg-borde px-5 py-3 font-pixel text-xs tracking-[0.15em]" onclick={onmenu}>MENÚ</button>
  </div>
</main>
