<script lang="ts">
  import type { Ending, GameState } from '../engine/types';
  import { PACK, dirtById } from '../content';
  import { shareCard } from '../lib/share';

  let { game, end, onagain, onmenu }: {
    game: GameState;
    end: Ending;
    onagain: (sameSeed: boolean) => void;
    onmenu: () => void;
  } = $props();

  // "Has caído porque…": cada causa enlazada a la decisión que la provocó
  const causes = $derived(end.causes.map(h => {
    if (h.eventId.startsWith('trapo:')) return `Turno ${h.turn}: filtraste «${dirtById(h.eventId.slice(6))?.title}»`;
    const e = PACK.find(e => e.id === h.eventId);
    return `Turno ${h.turn}: ${e?.options[h.option].label ?? h.eventId}`;
  }));
  let sharing = $state(false);
</script>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-8">
  <header class="text-center">
    <p class="font-titular text-4xl font-black tracking-tight">EL VOTÁGORA</p>
    <div class="regla mt-2 border-b border-tinta pt-1"></div>
    <p class="mt-1 font-cifra text-xs uppercase">Edición especial · Turno {game.turn - 1}</p>
  </header>

  <h1 class="mt-8 text-center font-titular text-5xl font-black leading-none">{end.title}</h1>
  <p class="mt-4 text-center font-texto text-lg">{end.text}</p>

  {#if causes.length}
    <section class="papel mt-8 rounded-sm border border-sumario p-4">
      <h2 class="font-titular text-xl">Has caído porque…</h2>
      <ol class="mt-2 list-decimal space-y-1 pl-5 font-texto">
        {#each causes as c}<li>{c}</li>{/each}
      </ol>
    </section>
  {/if}

  <div class="mt-auto flex flex-col gap-2 pt-8 font-ui">
    <button class="rounded-sm bg-tampon py-3 font-semibold text-white disabled:opacity-60" disabled={sharing}
      onclick={async () => { sharing = true; await shareCard(game, end, causes); sharing = false; }}>
      {sharing ? 'Imprimiendo portada…' : 'Compartir la portada'}
    </button>
    <button class="rounded-sm border-2 border-tinta py-3 font-semibold" onclick={() => onagain(false)}>Nueva legislatura</button>
    <button class="rounded-sm border-2 border-tinta py-3 font-semibold" onclick={() => onagain(true)}>Repetir esta legislatura (semilla {game.seed})</button>
    <button class="py-2 text-sm underline" onclick={onmenu}>Portada</button>
  </div>
</main>
