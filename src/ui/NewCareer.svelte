<script lang="ts">
  import type { Origin } from '../engine/types';
  import { ORIGINS } from '../engine/game';
  import { WORLD } from '../content';
  import Pixel from './Pixel.svelte';

  let { world, onstart, onback }: { world: string[]; onstart: (origin: Origin, seed: number) => void; onback: () => void } = $props();

  const keys = Object.keys(ORIGINS) as Origin[];
  let seed = $state(Math.floor(Math.random() * 1e9));
  let origin = $state<Origin>(keys[Math.floor(Math.random() * keys.length)]);

  function reroll() {
    seed = Math.floor(Math.random() * 1e9);
    const others = keys.filter(k => k !== origin);
    origin = others[Math.floor(Math.random() * others.length)];
  }
  const sceneFor: Record<Origin, string> = { cinturon: 'calle', provincia: 'ayuntamiento', despacho: 'oficina', pueblo: 'campo', precario: 'noche' };
</script>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
  <button class="self-start font-pixel text-[10px] tracking-[0.2em] text-tenue hover:text-tinta" onclick={onback}>◂ VOLVER</button>

  <p class="mt-6 font-pixel text-[10px] tracking-[0.2em] text-ambar">EXPEDIENTE Nº {String(seed).slice(0, 6)}</p>
  <h1 class="mt-2 font-pixel text-xl tracking-[0.08em]">DE DÓNDE VIENES</h1>

  <article class="mt-6 overflow-hidden rounded-xl bg-carta shadow-2xl shadow-black/70 ring-1 ring-borde">
    {#key origin}
      <Pixel kind="scene" id={sceneFor[origin]} class="aspect-[96/40] w-full" />
    {/key}
    <div class="p-5">
      <h2 class="font-pixel text-sm uppercase tracking-[0.12em]">{ORIGINS[origin].name}</h2>
      <p class="mt-3 font-serif text-lg leading-relaxed">{ORIGINS[origin].text}</p>
    </div>
  </article>

  {#if world.length}
    <section class="mt-6 rounded-md bg-carbon p-4 ring-1 ring-borde">
      <p class="font-pixel text-[10px] tracking-[0.2em] text-apagado">EL PAÍS QUE TE ENCUENTRAS</p>
      <ul class="mt-2 space-y-1.5 font-serif text-sm text-apagado">
        {#each world as w}<li>— {WORLD[w] ?? w}</li>{/each}
      </ul>
    </section>
  {/if}

  <div class="mt-auto flex flex-col gap-3 pt-8">
    <button class="bisel rounded-md bg-tinta px-5 py-4 font-pixel text-sm tracking-[0.15em] text-noche" onclick={() => onstart(origin, seed)}>EMPEZAR EN ENE 2016</button>
    <button class="bisel rounded-md bg-borde px-5 py-3 font-pixel text-xs tracking-[0.15em]" onclick={reroll}>OTRA VIDA</button>
  </div>
</main>
