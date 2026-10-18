<script lang="ts">
  import type { Answer, QuizTest } from '../quiz/types';
  import { order } from '../quiz/score';

  let { test, seed, onfinish, onprogress }: {
    test: QuizTest;
    seed: number;
    onfinish: (answers: Answer[]) => void;
    onprogress?: (done: number) => void;
  } = $props();

  const seq = $derived(order(test.questions.length, seed));
  let answers = $state<Answer[]>([]);
  let k = $state(0);
  let dx = $state(0);
  let dy = $state(0);
  let dragging = $state(false);
  let leaving = $state<Answer | null>(null);
  let sx = 0, sy = 0, st = 0;

  const total = $derived(test.questions.length);
  const current = $derived(seq[k] !== undefined ? test.questions[seq[k]] : null);
  const next = $derived(seq[k + 1] !== undefined ? test.questions[seq[k + 1]] : null);
  const lean = $derived(Math.max(-1, Math.min(1, dx / 120)));

  $effect(() => { if (!answers.length) answers = Array(test.questions.length).fill(0); });

  function answer(a: Answer) {
    if (!current || leaving !== null) return;
    leaving = a;
    const idx = seq[k];
    setTimeout(() => {
      answers[idx] = a;
      leaving = null;
      dx = 0; dy = 0;
      k++;
      onprogress?.(k);
      if (k >= total) onfinish($state.snapshot(answers) as Answer[]);
    }, 220);
  }

  function back() {
    if (k === 0 || leaving !== null) return;
    k--;
    answers[seq[k]] = 0;
    onprogress?.(k);
  }

  function down(e: PointerEvent) {
    if (leaving !== null) return;
    dragging = true; sx = e.clientX; sy = e.clientY; st = performance.now();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* nada */ }
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    dx = e.clientX - sx; dy = (e.clientY - sy) * 0.3;
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    const v = Math.abs(dx) / Math.max(1, performance.now() - st);
    if (Math.abs(dx) > 110 || (Math.abs(dx) > 40 && v > 0.6)) answer(dx > 0 ? 1 : -1);
    else { dx = 0; dy = 0; }
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') answer(1);
    else if (e.key === 'ArrowLeft') answer(-1);
    else if (e.key === 'ArrowDown') answer(0);
    else if (e.key === 'Backspace') back();
  }

  const tx = $derived(leaving === 1 ? 700 : leaving === -1 ? -700 : leaving === 0 ? 0 : dx);
  const ty = $derived(leaving === 0 ? 500 : dy);
</script>

<svelte:window onkeydown={key} />

<div class="mx-auto flex w-full max-w-md flex-col px-4 select-none">
  <div class="mb-4 flex items-center gap-3 text-sm font-semibold" style="color: {test.ink}">
    <button class="opacity-70 hover:opacity-100 disabled:opacity-20" onclick={back} disabled={k === 0} aria-label="Volver a la anterior">↶</button>
    <div class="h-1.5 flex-1 overflow-hidden rounded-full" style="background: color-mix(in srgb, {test.ink} 20%, transparent)">
      <div class="h-full rounded-full transition-[width] duration-300" style="width: {(k / total) * 100}%; background: {test.ink}"></div>
    </div>
    <span class="tabular-nums opacity-80">{Math.min(k + 1, total)}/{total}</span>
  </div>

  <div class="relative aspect-[4/5] w-full">
    {#if next}
      <div class="absolute inset-0 flex items-center rounded-[2rem] bg-white/90 p-8 shadow-xl" style="transform: scale(.94) translateY(14px); opacity: .7">
      </div>
    {/if}
    {#if current}
      {#key current.id}
        <div
          class="entra absolute inset-0 flex touch-none cursor-grab flex-col justify-between rounded-[2rem] bg-white p-7 shadow-2xl active:cursor-grabbing sm:p-9"
          style="transform: translate({tx}px, {ty}px) rotate({tx / 18}deg); transition: {dragging ? 'none' : 'transform .25s cubic-bezier(.2,.8,.2,1)'}"
          onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
          role="group" aria-label="Tarjeta {k + 1} de {total}"
        >
          <div class="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span class="rounded-md border-2 border-no px-2 py-1 text-no transition-opacity" style="opacity: {Math.max(0, -lean)}">{test.disagree}</span>
            <span class="rounded-md border-2 border-si px-2 py-1 text-si transition-opacity" style="opacity: {Math.max(0, lean)}">{test.agree}</span>
          </div>
          <p class="font-display text-[1.75rem] font-extrabold leading-[1.12] text-tinta sm:text-3xl">{current.text}</p>
          <p class="text-center text-xs text-gris">Desliza o usa los botones</p>
        </div>
      {/key}
    {/if}
  </div>

  <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
    <button class="h-16 rounded-2xl bg-no text-lg font-bold text-white shadow-lg transition active:scale-95" onclick={() => answer(-1)}>✕ {test.disagree}</button>
    <button class="h-12 rounded-xl px-3 text-sm font-semibold opacity-80 hover:opacity-100" style="color: {test.ink}" onclick={() => answer(0)}>Paso</button>
    <button class="h-16 rounded-2xl bg-si text-lg font-bold text-white shadow-lg transition active:scale-95" onclick={() => answer(1)}>✓ {test.agree}</button>
  </div>
</div>
