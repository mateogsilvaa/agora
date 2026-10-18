<script lang="ts">
  import type { GameEvent } from '../engine/types';
  import { SPEAKERS } from '../content';
  import { CHANNEL_LABEL } from './data';

  let { event, options, onchoose, onpreview }: {
    event: GameEvent;
    options: number[];
    onchoose: (i: number) => void;
    onpreview: (i: number | null) => void;
  } = $props();

  let dx = $state(0);
  let dragging = $state(false);
  let startX = 0;
  const THRESHOLD = 90;
  const ARROWS = ['←', '→', '↓', '·'];
  const side = $derived(dx < -30 ? options[0] : dx > 30 ? options[1] : null);

  function down(e: PointerEvent) {
    dragging = true;
    startX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    dx = e.clientX - startX;
    onpreview(side);
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    const pick = Math.abs(dx) > THRESHOLD ? side : null;
    dx = 0;
    onpreview(null);
    if (pick !== null) onchoose(pick);
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') onchoose(options[0]);
    if (e.key === 'ArrowRight') onchoose(options[1]);
    if (e.key === 'ArrowDown' && options[2] !== undefined) onchoose(options[2]);
  }
  // hora falsa pero estable para cada mensaje
  const hour = $derived(`${String(8 + (event.id.length % 14)).padStart(2, '0')}:${String((event.id.length * 7) % 60).padStart(2, '0')}`);
</script>

<svelte:window onkeydown={key} />

<div class="flex flex-col gap-3">
  <div
    class="papel relative touch-none select-none rounded-sm border border-sumario p-4 shadow-[4px_4px_0_var(--color-tinta)]"
    style="transform: translateX({dx}px) rotate({dx / 25}deg); transition: {dragging ? 'none' : 'transform .25s'}"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
    role="group" aria-label="Evento"
  >
    <div class="mb-3 flex items-center gap-2 font-ui text-xs">
      <span class="grid h-8 w-8 place-items-center rounded-full bg-tinta font-titular text-sm text-papel">{SPEAKERS[event.speaker][0]}</span>
      <span class="flex-1">
        <b class="block">{SPEAKERS[event.speaker]}</b>
        <span class="text-tinta-suave">{CHANNEL_LABEL[event.channel]}</span>
      </span>
      {#if event.kind === 'warning'}<span class="tampon text-xs">AVISO</span>{/if}
      {#if event.kind === 'debt'}<span class="tampon text-xs">VUELVE</span>{/if}
    </div>

    {#if event.channel === 'whatsapp'}
      <p class="rounded-lg rounded-tl-none bg-chat px-3 py-2 font-ui text-[15px] leading-snug shadow-sm">
        {event.text}
        <span class="mt-1 block text-right text-[10px] text-tinta-suave">{hour} ✓✓</span>
      </p>
    {:else if event.channel === 'notificacion'}
      <p class="border-l-4 border-tampon pl-3 font-titular text-xl leading-tight">{event.text}</p>
    {:else}
      <p class="font-texto text-[17px] leading-relaxed">{event.text}</p>
    {/if}

    {#if side !== null}
      <div class="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
        <span class="inline-block bg-tinta px-3 py-1 font-titular text-papel">{event.options[side].label}</span>
      </div>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    {#each options as i, n (i)}
      <button
        class="flex items-center gap-2 rounded-sm border-2 border-tinta bg-papel px-3 py-2 text-left font-ui text-sm font-semibold hover:bg-tinta hover:text-papel focus-visible:bg-tinta focus-visible:text-papel"
        onclick={() => onchoose(i)}
        onpointerenter={() => onpreview(i)} onpointerleave={() => onpreview(null)}
        onfocus={() => onpreview(i)} onblur={() => onpreview(null)}
      >
        <span class="font-cifra text-xs opacity-60">{ARROWS[n]}</span>
        {event.options[i].label}
      </button>
    {/each}
  </div>
</div>
