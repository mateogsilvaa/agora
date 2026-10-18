<script lang="ts">
  import { paintScene } from './pixel/scenes';
  import { paintPortrait } from './pixel/portraits';

  let { kind, id, class: cls = '' }: { kind: 'scene' | 'portrait'; id: string | undefined; class?: string } = $props();
  let canvas: HTMLCanvasElement;

  $effect(() => {
    if (kind === 'scene') paintScene(canvas, id);
    else paintPortrait(canvas, id ?? 'anonimo');
  });
</script>

<canvas bind:this={canvas} class="pixelado block {cls}" aria-hidden="true"></canvas>
