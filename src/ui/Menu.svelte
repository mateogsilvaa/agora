<script lang="ts">
  import Pixel from './Pixel.svelte';

  let { canContinue, careers, onnew, oncontinue, onfile }: {
    canContinue: boolean;
    careers: number;
    onnew: () => void;
    oncontinue: () => void;
    onfile: () => void;
  } = $props();
</script>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8 sm:py-14">
  <div class="overflow-hidden rounded-xl ring-1 ring-borde">
    <Pixel kind="scene" id="noche" class="aspect-[96/40] w-full" />
  </div>

  <h1 class="mt-8 font-pixel text-4xl tracking-[0.08em] text-tinta sm:text-5xl">VOTÁGORA</h1>
  <p class="mt-2 font-crt text-xl tracking-wider text-apagado">ENE 2016 · el bipartidismo se ha roto</p>

  <p class="mt-6 font-serif text-lg leading-relaxed text-tinta/90">
    Tienes 22 años, una carrera recién terminada y la certeza de que se puede hacer política de otra manera.
    <span class="text-apagado">Eso último lo vas a tener que demostrar.</span>
  </p>

  <nav class="mt-10 flex flex-col gap-3">
    {#if canContinue}
      <button class="bisel rounded-md bg-tinta px-5 py-4 text-left font-pixel text-sm tracking-[0.15em] text-noche" onclick={oncontinue}>
        ▸ CONTINUAR CARRERA
      </button>
    {/if}
    <button class="bisel rounded-md px-5 py-4 text-left font-pixel text-sm tracking-[0.15em] {canContinue ? 'bg-borde text-tinta' : 'bg-tinta text-noche'}" onclick={onnew}>
      ▸ NUEVA CARRERA
    </button>
    <button class="bisel rounded-md bg-carbon px-5 py-4 text-left font-pixel text-sm tracking-[0.15em] text-apagado ring-1 ring-borde disabled:opacity-40" onclick={onfile} disabled={!careers}>
      ▸ EXPEDIENTE {careers ? `(${careers})` : ''}
    </button>
  </nav>

  <footer class="mt-auto pt-12 font-serif text-xs leading-relaxed text-tenue">
    Votágora es una obra de ficción. Ningún cargo, partido, empresa o persona que aparece en el juego existe.
    Lo que se parece a la realidad es responsabilidad de la realidad.
  </footer>
</main>
