<script lang="ts">
  import type { Stat, Stats } from '../engine/types';
  import { RED_ZONE } from '../engine/director';
  import { STATS, STAT_HELP } from './data';

  let { stats, preview = {} }: { stats: Stats; preview?: Partial<Record<Stat, 'small' | 'big'>> } = $props();
  let help = $state<Stat | null>(null);

  const danger = (k: Stat) => stats[k] < RED_ZONE[k][0] || stats[k] > RED_ZONE[k][1];
</script>

<div class="grid grid-cols-4 gap-2 px-3 pt-3">
  {#each STATS as s (s.id)}
    <button class="flex flex-col items-center gap-1 font-ui" onclick={() => (help = help === s.id ? null : s.id)} aria-label="{s.label}: {stats[s.id]}">
      <span class="flex h-3 items-center">
        {#if preview[s.id]}
          <span class="rounded-full bg-tinta" style="width:{preview[s.id] === 'big' ? 10 : 5}px;height:{preview[s.id] === 'big' ? 10 : 5}px"></span>
        {/if}
      </span>
      <span class="relative h-14 w-9 overflow-hidden rounded-sm border-2 border-tinta bg-papel" class:peligro={danger(s.id)}>
        <span class="absolute inset-x-0 bottom-0 transition-[height] duration-500" style="height:{stats[s.id]}%;background:{s.color}"></span>
        <span class="absolute inset-0 grid place-items-center text-lg">{s.icon}</span>
      </span>
      <span class="text-[10px] uppercase tracking-wider text-tinta-suave">{s.short}</span>
    </button>
  {/each}
</div>
{#if help}
  <p class="mx-3 mt-2 rounded-sm bg-tinta px-3 py-2 font-ui text-xs text-papel">{STAT_HELP[help]}</p>
{/if}
