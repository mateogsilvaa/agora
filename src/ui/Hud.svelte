<script lang="ts">
  import type { Stat, Stats } from '../engine/types';
  import { RED_ZONE } from '../engine/director';
  import { STATS } from './labels';

  let { stats, preview = {} }: { stats: Stats; preview?: Partial<Record<Stat, 1 | 2>> } = $props();

  // Cuando un valor cambia, la barra brilla un momento. Sin cifras: solo el gesto.
  let glowing = $state<Partial<Record<Stat, number>>>({});
  let last: Stats | null = null;
  $effect(() => {
    const now = { ...stats };
    if (last) for (const s of STATS) if (now[s.id] !== last[s.id]) glowing[s.id] = (glowing[s.id] ?? 0) + 1;
    last = now;
  });

  let help = $state<Stat | null>(null);
  const danger = (k: Stat) => stats[k] < RED_ZONE[k][0] || stats[k] > RED_ZONE[k][1];
</script>

<div class="grid grid-cols-2 gap-x-4 gap-y-2.5">
  {#each STATS as s (s.id)}
    <button class="group text-left" onclick={() => (help = help === s.id ? null : s.id)} aria-label="{s.label}">
      <div class="mb-1 flex items-center justify-between font-pixel text-[9px] tracking-[0.15em] text-apagado">
        <span>[ {s.label} ]</span>
        {#if preview[s.id]}<span class="text-tinta {preview[s.id] === 2 ? 'parpadea-2' : 'parpadea-1'}">{preview[s.id] === 2 ? '◆◆' : '◆'}</span>{/if}
      </div>
      <div class="relative h-[6px] overflow-hidden rounded-[1px] bg-carbon ring-1 ring-borde {danger(s.id) ? 'zona-roja' : ''}">
        {#key glowing[s.id]}
          <div
            class="h-full transition-[width] duration-700 ease-out {glowing[s.id] ? 'brilla' : ''} {preview[s.id] ? (preview[s.id] === 2 ? 'parpadea-2' : 'parpadea-1') : ''}"
            style="width: {stats[s.id]}%; background: {s.color}; color: {s.color}; opacity: {preview[s.id] ? 1 : 0.55}"
          ></div>
        {/key}
        <!-- marcas cada 10 %: regla de píxel -->
        <div class="pointer-events-none absolute inset-0" style="background: repeating-linear-gradient(to right, transparent 0 calc(10% - 1px), var(--color-noche) calc(10% - 1px) 10%)"></div>
      </div>
    </button>
  {/each}
</div>
{#if help}
  {@const s = STATS.find(x => x.id === help)!}
  <p class="mt-3 border-l-2 pl-3 font-serif text-sm italic text-apagado" style="border-color: {s.color}">{s.help}</p>
{/if}
