<script lang="ts">
  import type { GameEvent } from '../engine/types';
  import { CARGOS } from '../content';
  import { CHANNELS } from './labels';
  import Pixel from './Pixel.svelte';

  let { event, options, onchoose, onpreview }: {
    event: GameEvent;
    options: number[];
    onchoose: (i: number) => void;
    onpreview: (i: number | null) => void;
  } = $props();

  // Ratón: pasar por encima previsualiza y el clic decide.
  // Táctil: mantener pulsado previsualiza y soltar decide; un toque corto solo arma el botón.
  const HOLD = 320;
  let armed = $state<number | null>(null);
  let pressedAt = 0;
  let pressed: number | null = null;

  function down(e: PointerEvent, i: number) {
    pressed = i;
    pressedAt = performance.now();
    onpreview(i);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function up(e: PointerEvent, i: number) {
    if (pressed !== i) return;
    pressed = null;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) { onpreview(armed); return; }
    const held = performance.now() - pressedAt >= HOLD;
    if (e.pointerType === 'mouse' || held || armed === i) { armed = null; onchoose(i); }
    else armed = i;
  }
  function key(e: KeyboardEvent) {
    const n = Number(e.key);
    if (n >= 1 && n <= options.length) onchoose(options[n - 1]);
  }
</script>

<svelte:window onkeydown={key} />

<article class="overflow-hidden rounded-xl bg-carta shadow-2xl shadow-black/70 ring-1 ring-borde">
  <div class="relative">
    <Pixel kind="scene" id={event.scene} class="aspect-[96/40] w-full" />
    <div class="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-carta to-transparent"></div>
  </div>

  <div class="px-5 pb-5 sm:px-7">
    <header class="-mt-8 flex items-start gap-3">
      <Pixel kind="portrait" id={event.from} class="relative h-16 w-16 shrink-0 rounded-sm ring-2 ring-noche" />
      <div class="relative min-w-0 pt-9">
        <p class="font-pixel text-[10px] uppercase tracking-[0.18em] text-ambar">{CARGOS[event.from] ?? event.from}</p>
        <p class="font-crt text-sm tracking-widest text-tenue">{CHANNELS[event.channel]}{event.kind === 'warning' ? ' · AVISO' : ''}{event.kind === 'debt' ? ' · VUELVE' : ''}</p>
      </div>
    </header>

    {#if event.title}
      <h2 class="mt-5 font-pixel text-sm uppercase tracking-[0.12em] text-tinta">{event.title}</h2>
    {/if}
    <p class="mt-3 font-serif text-[1.08rem] leading-relaxed text-tinta/95 sm:text-lg">{event.text}</p>
  </div>

  <div class="flex flex-col gap-2 border-t border-borde bg-carbon/60 p-3 sm:p-4">
    {#each options as i, n (i)}
      <button
        class="bisel group flex min-h-14 w-full touch-none select-none items-center gap-3 rounded-md px-4 py-3 text-left transition-colors
          {armed === i ? 'bg-tinta text-noche' : 'bg-borde/70 text-tinta hover:bg-[#3a404a]'}"
        onpointerdown={e => down(e, i)}
        onpointerup={e => up(e, i)}
        onpointercancel={() => { pressed = null; onpreview(armed); }}
        onpointerenter={e => e.pointerType === 'mouse' && onpreview(i)}
        onpointerleave={e => e.pointerType === 'mouse' && onpreview(armed)}
        onfocus={() => onpreview(i)}
        onblur={() => onpreview(null)}
        onkeydown={e => e.key === 'Enter' && onchoose(i)}
      >
        <span class="font-pixel text-[10px] {armed === i ? 'text-noche/60' : 'text-tenue'}">{n + 1}</span>
        <span class="font-serif text-[1.02rem] leading-snug">{event.options[i].label}</span>
        {#if armed === i}<span class="ml-auto font-pixel text-[9px] tracking-widest">PULSA OTRA VEZ</span>{/if}
      </button>
    {/each}
  </div>
</article>
