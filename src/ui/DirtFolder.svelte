<script lang="ts">
  import type { Dirt } from '../engine/types';

  let { dirt, used, onuse, onclose }: {
    dirt: Dirt[];
    used: boolean;
    onuse: (d: Dirt) => void;
    onclose: () => void;
  } = $props();
</script>

<svelte:window onkeydown={e => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events (Escape cierra desde la ventana) -->
<div class="fixed inset-0 z-20 flex items-end bg-black/50 sm:items-center sm:justify-center" onclick={onclose} role="presentation">
  <div class="w-full max-w-lg bg-papel p-4 pb-8 sm:rounded-sm" onclick={e => e.stopPropagation()} role="dialog" aria-label="Trapos sucios" tabindex="-1">
    <div class="mb-1 flex items-baseline justify-between">
      <h2 class="font-titular text-2xl font-black">Trapos sucios</h2>
      <button class="font-ui text-sm underline" onclick={onclose}>Cerrar</button>
    </div>
    <p class="mb-4 font-ui text-xs text-tinta-suave">
      Uno por turno. Usarlo te da ventaja ahora y un enemigo para siempre.
    </p>

    {#if !dirt.length}
      <p class="py-6 text-center font-texto italic text-tinta-suave">La carpeta está vacía. Por ahora, eres tú el que no tiene nada contra nadie.</p>
    {/if}

    <div class="flex snap-x gap-3 overflow-x-auto pb-2">
      {#each dirt as d (d.id)}
        <article class="relative w-56 shrink-0 snap-start rounded-sm border border-sumario bg-[#E9D9B0] p-3 text-[#1C1A17] shadow-[3px_3px_0_#1C1A17]">
          <span class="tampon absolute right-2 top-2 text-[10px]">CONFIDENCIAL</span>
          <div class="mb-2 mt-5 h-16 w-14 rotate-[-3deg] border-4 border-white bg-[#8C8577] shadow"></div>
          <p class="font-ui text-[10px] uppercase tracking-wider">{d.target}</p>
          <h3 class="font-titular text-lg leading-tight">{d.title}</h3>
          <p class="mb-2 font-texto text-sm italic">«{d.text}»</p>
          <p class="mb-3 font-cifra text-xs" aria-label="Gravedad {d.severity} de 3">
            {'●'.repeat(d.severity)}{'○'.repeat(3 - d.severity)} gravedad
          </p>
          <button
            class="w-full rounded-sm bg-[#1C1A17] py-1.5 font-ui text-sm font-semibold text-[#F2EAD8] disabled:opacity-40"
            disabled={used}
            onclick={() => onuse(d)}
          >{used ? 'Ya has jugado uno este turno' : 'Filtrar'}</button>
        </article>
      {/each}
    </div>
  </div>
</div>
