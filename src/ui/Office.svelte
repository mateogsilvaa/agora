<script lang="ts">
  // El despacho: lo que ves al girar el móvil o en escritorio.
  import type { GameState } from '../engine/types';
  import { DEBTS, NPCS } from './data';

  let { game, part }: { game: GameState; part: 'organigrama' | 'prensa' } = $props();

  const mood = (v: number) => (v >= 2 ? 'Te adora' : v >= 1 ? 'Te aprecia' : v <= -3 ? 'Enemigo' : v <= -1 ? 'Te la tiene jurada' : 'Neutral');
  const hint = (left: number) => (left <= 3 ? 'inminente' : left <= 10 ? 'pronto' : 'algún día');
</script>

{#if part === 'organigrama'}
  <section class="flex flex-col gap-4 font-ui text-sm">
    <div>
      <h3 class="regla pt-1 font-titular text-lg">Organigrama</h3>
      <ul class="mt-2 space-y-1">
        {#each Object.entries(NPCS) as [id, name] (id)}
          {@const v = game.relations[id] ?? 0}
          <li class="flex justify-between gap-2">
            <span>{name}</span>
            <span class="font-cifra text-xs" class:text-tampon={v < 0} class:text-urna={v > 0}>{mood(v)}</span>
          </li>
        {/each}
      </ul>
    </div>
    <div>
      <h3 class="regla pt-1 font-titular text-lg">Agenda</h3>
      {#if game.debts.length}
        <ul class="mt-2 space-y-1">
          {#each game.debts as d (d.id)}
            <li class="flex justify-between gap-2">
              <span>{DEBTS[d.id] ?? d.id}</span>
              <span class="font-cifra text-xs text-tampon">vuelve {hint(d.dueTurn - game.turn)}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="mt-2 text-tinta-suave">Nada pendiente. De momento.</p>
      {/if}
    </div>
  </section>
{:else}
  <section class="font-texto">
    <h3 class="regla pt-1 font-titular text-lg">Hemeroteca</h3>
    <ul class="mt-2 space-y-3">
      {#each game.history.slice(-8).reverse() as h (h.turn + h.eventId)}
        {#if h.headline}
          <li class="border-b border-sumario pb-2 text-sm leading-snug">
            <span class="font-cifra text-[10px] text-tinta-suave">T{h.turn}</span>
            {h.headline}
          </li>
        {/if}
      {/each}
    </ul>
  </section>
{/if}
