<script lang="ts">
  import type { Answer, QuizTest } from '../quiz/types';
  import { decode, encode, rank } from '../quiz/score';
  import { createRoom, configured, newId, track } from '../lib/firebase';
  import Deck from './Deck.svelte';
  import ResultView from './ResultView.svelte';

  let { test }: { test: QuizTest } = $props();

  const params = new URLSearchParams(location.search);
  const vsRaw = params.get('vs');
  const vs = vsRaw && vsRaw.length === test.questions.length ? decode(vsRaw) : null;
  const vsName = (params.get('n') ?? '').slice(0, 24);
  const vsTop = vs ? rank(test, vs)[0] : null;

  let phase = $state<'intro' | 'play' | 'result'>('intro');
  let answers = $state<Answer[]>([]);
  let seed = $state(Math.floor(Math.random() * 1e9));
  let started = 0;
  let creating = $state(false);

  function start() {
    seed = Math.floor(Math.random() * 1e9);
    phase = 'play';
    started = performance.now();
    track({ type: 'start', slug: test.slug, mode: vs ? 'reto' : 'solo' });
    window.scrollTo({ top: 0 });
  }

  function finish(a: Answer[]) {
    answers = a;
    phase = 'result';
    const top = rank(test, a)[0];
    track({ type: 'finish', slug: test.slug, mode: vs ? 'reto' : 'solo', top: top.profile.id, pct: top.pct, answers: encode(a), ms: Math.round(performance.now() - started) });
    window.scrollTo({ top: 0 });
  }

  async function room() {
    if (!configured) return;
    creating = true;
    try {
      const host = newId();
      const code = await createRoom(test.slug, host);
      try { localStorage.setItem(`votagora:sala:${code}:host`, host); } catch { /* nada */ }
      location.href = `/sala/?c=${code}`;
    } catch {
      creating = false;
      alert('No se pudo crear la sala. Prueba otra vez en un momento.');
    }
  }
</script>

<div class="min-h-dvh pb-10" style="background: {phase === 'result' ? 'var(--color-papel)' : test.color}">
  <header class="mx-auto flex max-w-md items-center justify-between px-4 py-4" style="color: {phase === 'result' ? 'var(--color-tinta)' : test.ink}">
    <a class="font-display text-lg font-extrabold tracking-wide" href="/">VOTÁGORA</a>
    <span class="text-xs font-semibold uppercase tracking-widest opacity-70">{test.questions.length} tarjetas · {test.minutes} min</span>
  </header>

  {#if phase === 'intro'}
    <section class="entra mx-auto flex max-w-md flex-col px-4 pt-6" style="color: {test.ink}">
      {#if vsTop}
        <div class="mb-6 rounded-3xl bg-white/10 p-5">
          <p class="text-xs font-bold uppercase tracking-widest opacity-70">{vsName || 'Alguien'} te reta</p>
          <p class="mt-1 font-display text-2xl font-extrabold leading-tight">{vsName || 'Tu amigo'} es {vsTop.pct}% {vsTop.profile.name}. ¿Y tú?</p>
          <p class="mt-1 text-sm opacity-80">Al terminar verás en qué coincidís y en qué no.</p>
        </div>
      {/if}
      <h1 class="font-display text-[2.6rem] font-extrabold leading-[1.02]">{test.title}</h1>
      <p class="mt-4 text-lg opacity-90">{test.description}</p>
      <button class="late mt-8 h-16 rounded-2xl bg-papel text-lg font-bold text-tinta shadow-2xl" onclick={start}>Empezar</button>
      {#if configured}
        <button class="mt-3 h-14 rounded-2xl border-2 text-base font-bold disabled:opacity-50" style="border-color: {test.ink}" onclick={room} disabled={creating}>
          {creating ? 'Creando sala…' : 'Jugar con amigos en directo'}
        </button>
      {/if}
      <p class="mt-6 text-center text-sm opacity-70">Derecha: {test.agree.toLowerCase()} · Izquierda: {test.disagree.toLowerCase()}</p>
    </section>
  {:else if phase === 'play'}
    <div class="pt-2"><Deck {test} {seed} onfinish={finish} /></div>
  {:else}
    <ResultView {test} {answers} {vs} {vsName} onretry={start} onroom={room} />
  {/if}
</div>
