<script lang="ts">
  import type { Profile } from '../lib/persist';
  import { STAGES } from '../engine/game';
  import { WORLD } from '../content';
  import { VIAS } from './labels';

  let { profile, onback }: { profile: Profile; onback: () => void } = $props();
</script>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
  <button class="self-start font-pixel text-[10px] tracking-[0.2em] text-tenue hover:text-tinta" onclick={onback}>◂ VOLVER</button>
  <h1 class="mt-6 font-pixel text-xl tracking-[0.08em]">EXPEDIENTE</h1>

  {#if profile.world.length}
    <section class="mt-6 rounded-md bg-carbon p-4 ring-1 ring-borde">
      <p class="font-pixel text-[10px] tracking-[0.2em] text-ambar">EL PAÍS, HOY</p>
      <ul class="mt-2 space-y-1.5 font-serif text-sm text-apagado">
        {#each profile.world as w}<li>— {WORLD[w] ?? w}</li>{/each}
      </ul>
    </section>
  {/if}

  <ol class="mt-6 space-y-3">
    {#each [...profile.careers].reverse() as c, i (c.seed + c.date)}
      <li class="rounded-md bg-carta p-4 ring-1 ring-borde">
        <div class="flex items-baseline justify-between gap-2">
          <p class="font-pixel text-xs uppercase tracking-[0.12em]">{c.title}</p>
          <p class="font-crt text-sm text-tenue">Nº {profile.careers.length - i}</p>
        </div>
        <p class="mt-1 font-crt text-base text-apagado">
          {STAGES[c.stage - 1].name} · {Math.floor(c.months / 12)} años · {c.via ? VIAS[c.via as keyof typeof VIAS] : 'sin vía'} · convicción {c.conviccion}
        </p>
        {#if c.worldAdded.length}
          <p class="mt-2 font-serif text-sm italic text-tenue">Dejó: {c.worldAdded.map(w => WORLD[w] ?? w).join(' ')}</p>
        {/if}
      </li>
    {/each}
  </ol>
</main>
