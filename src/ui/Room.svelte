<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Answer } from '../quiz/types';
  import { decode, encode, headline, order, rank, seedFrom, similarity } from '../quiz/score';
  import { testBySlug, SITE } from '../tests';
  import { joinRoom, newId, setPhase, updatePlayer, watchPlayers, watchRoom, type Player, type Room } from '../lib/firebase';
  import { getName, setName } from '../lib/share';
  import Deck from './Deck.svelte';

  const code = (new URLSearchParams(location.search).get('c') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const store = (k: string) => { try { return localStorage.getItem(`votagora:sala:${code}:${k}`); } catch { return null; } };
  const save = (k: string, v: string) => { try { localStorage.setItem(`votagora:sala:${code}:${k}`, v); } catch { /* nada */ } };

  const hostId = store('host');
  let me = $state(store('yo') ?? hostId ?? '');
  let room = $state<Room | null | undefined>(undefined);
  let players = $state<Player[]>([]);
  let name = $state(getName());
  let joining = $state(false);
  let copied = $state(false);

  const test = $derived(room ? testBySlug(room.test) : undefined);
  const mine = $derived(players.find(p => p.id === me));
  const isHost = $derived(Boolean(hostId) && room?.host === hostId);
  const done = $derived(players.filter(p => p.done));
  const link = `${SITE}/sala/?c=${code}`;

  const offs: (() => void)[] = [];
  if (code) {
    watchRoom(code, r => (room = r)).then(o => offs.push(o)).catch(() => (room = null));
    watchPlayers(code, p => (players = p)).then(o => offs.push(o)).catch(() => {});
  } else room = null;
  onDestroy(() => offs.forEach(o => o()));

  async function join() {
    if (!name.trim() || !test) return;
    joining = true;
    const id = me || newId();
    setName(name);
    await joinRoom(code, id, name.trim(), test.slug);
    save('yo', id);
    me = id;
    joining = false;
  }

  function progress(n: number) { updatePlayer(code, me, { progress: n }); }
  function finish(a: Answer[]) {
    if (!test) return;
    const top = rank(test, a)[0];
    updatePlayer(code, me, { done: true, progress: test.questions.length, answers: encode(a), top: top.profile.id, pct: top.pct });
  }

  function guess(resultId: string, playerId: string) {
    if (!mine) return;
    updatePlayer(code, me, { guesses: { ...mine.guesses, [resultId]: playerId } });
  }

  async function invite() {
    const text = `Entra en mi sala de Votágora y haz el test conmigo: ${link}`;
    if (navigator.share) { try { await navigator.share({ text, url: link }); return; } catch { /* cancelado */ } }
    try { await navigator.clipboard.writeText(link); copied = true; setTimeout(() => (copied = false), 2000); } catch { /* nada */ }
  }

  // Los resultados, barajados igual para todos, para adivinar sin saber de quién es cada uno
  const shuffled = $derived.by(() => {
    const idx = order(done.length, seedFrom(code));
    return idx.map(i => done[i]);
  });
  const topOf = (p: Player) => test ? rank(test, decode(p.answers))[0] : null;
  const votesFor = (r: Player) => players.filter(p => p.id !== r.id && p.guesses?.[r.id]);
  const rightFor = (r: Player) => votesFor(r).filter(p => p.guesses[r.id] === r.id);
  const scoreboard = $derived(players
    .map(p => ({ p, ok: done.filter(r => r.id !== p.id && p.guesses?.[r.id] === r.id).length }))
    .sort((a, b) => b.ok - a.ok));
  const pairs = $derived.by(() => {
    const out: { a: Player; b: Player; s: number }[] = [];
    for (let i = 0; i < done.length; i++) for (let j = i + 1; j < done.length; j++) {
      out.push({ a: done[i], b: done[j], s: similarity(decode(done[i].answers), decode(done[j].answers)) });
    }
    return out.sort((x, y) => y.s - x.s);
  });
</script>

<div class="min-h-dvh pb-12" style="background: {test?.color ?? 'var(--color-tinta)'}; color: {test?.ink ?? 'var(--color-papel)'}">
  <header class="mx-auto flex max-w-md items-center justify-between px-4 py-4">
    <a class="font-display text-lg font-extrabold tracking-wide" href="/">VOTÁGORA</a>
    {#if code}<span class="rounded-lg bg-white/15 px-3 py-1 font-display text-lg font-extrabold tracking-[0.25em]">{code}</span>{/if}
  </header>

  {#if room === undefined}
    <p class="p-10 text-center opacity-70">Entrando en la sala…</p>
  {:else if room === null || !test}
    <section class="mx-auto max-w-md px-4 pt-10 text-center">
      <h1 class="font-display text-3xl font-extrabold">Esta sala no existe</h1>
      <p class="mt-3 opacity-80">Revisa el código o crea una nueva desde cualquier test.</p>
      <a class="mt-8 inline-grid h-14 place-items-center rounded-2xl bg-papel px-6 font-bold text-tinta" href="/">Ver tests</a>
    </section>
  {:else if !mine}
    <section class="entra mx-auto max-w-md px-4 pt-6">
      <p class="text-xs font-bold uppercase tracking-widest opacity-70">Sala en directo</p>
      <h1 class="mt-1 font-display text-4xl font-extrabold leading-tight">{test.title}</h1>
      <p class="mt-3 opacity-85">{players.length ? `Ya hay ${players.length} dentro: ${players.map(p => p.name).join(', ')}.` : 'Eres el primero.'}</p>
      <form class="mt-8" onsubmit={e => { e.preventDefault(); join(); }}>
        <label class="text-sm font-semibold" for="n">¿Cómo te llamas?</label>
        <input id="n" class="mt-2 h-14 w-full rounded-2xl px-4 text-lg text-tinta" maxlength="24" bind:value={name} placeholder="Tu nombre" autocomplete="nickname" />
        <button class="mt-4 h-16 w-full rounded-2xl bg-papel text-lg font-bold text-tinta disabled:opacity-50" disabled={!name.trim() || joining}>{joining ? 'Entrando…' : 'Entrar y jugar'}</button>
      </form>
    </section>
  {:else if !mine.done}
    <Deck {test} seed={seedFrom(code)} onfinish={finish} onprogress={progress} />
    <ul class="mx-auto mt-6 flex max-w-md flex-wrap gap-2 px-4 text-xs font-semibold">
      {#each players.filter(p => p.id !== me) as p (p.id)}
        <li class="rounded-full bg-white/15 px-3 py-1">{p.name} · {p.done ? 'listo' : `${p.progress}/${test.questions.length}`}</li>
      {/each}
    </ul>
  {:else}
    <section class="mx-auto max-w-md px-4">
      {#if room.phase === 'playing'}
        <h1 class="font-display text-3xl font-extrabold">Esperando al resto</h1>
        <p class="mt-2 opacity-80">Cuando hayáis terminado, {isHost ? 'pulsa' : 'el anfitrión pulsará'} «¿Quién es quién?» y adivinaréis de quién es cada resultado.</p>
        <ul class="mt-6 space-y-3">
          {#each players as p (p.id)}
            <li class="rounded-2xl bg-white/10 p-4">
              <div class="flex justify-between font-semibold"><span>{p.name}{p.id === me ? ' (tú)' : ''}</span><span>{p.done ? '✓ listo' : `${p.progress}/${test.questions.length}`}</span></div>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div class="h-full rounded-full bg-current transition-[width] duration-500" style="width: {(p.progress / test.questions.length) * 100}%"></div></div>
            </li>
          {/each}
        </ul>
        <button class="mt-6 h-14 w-full rounded-2xl border-2 border-current font-bold" onclick={invite}>{copied ? 'Enlace copiado' : 'Invitar a más gente'}</button>
        {#if isHost}
          <button class="mt-3 h-16 w-full rounded-2xl bg-papel text-lg font-bold text-tinta disabled:opacity-40" disabled={done.length < 2} onclick={() => setPhase(code, 'guess')}>
            {done.length < 2 ? 'Hacen falta 2 terminados' : '¿Quién es quién?'}
          </button>
        {/if}
      {:else if room.phase === 'guess'}
        <h1 class="font-display text-3xl font-extrabold">¿Quién es quién?</h1>
        <p class="mt-2 opacity-80">Vota de quién crees que es cada resultado.</p>
        <ul class="mt-6 space-y-4">
          {#each shuffled as r, i (r.id)}
            {@const t = topOf(r)}
            <li class="entra rounded-3xl bg-papel p-5 text-tinta" style="animation-delay: {i * 60}ms">
              <p class="text-xs font-bold uppercase tracking-widest text-gris">Resultado {i + 1}</p>
              <p class="mt-1 font-display text-2xl font-extrabold leading-tight">{t ? headline(test, t) : ''}</p>
              {#if r.id === me}
                <p class="mt-3 text-sm text-gris">Este es el tuyo. Disimula.</p>
              {:else}
                <div class="mt-3 flex flex-wrap gap-2">
                  {#each players.filter(p => p.id !== me) as p (p.id)}
                    <button class="rounded-xl px-3 py-2 text-sm font-semibold {mine.guesses?.[r.id] === p.id ? 'bg-tinta text-papel' : 'bg-linea'}" onclick={() => guess(r.id, p.id)}>{p.name}</button>
                  {/each}
                </div>
              {/if}
              <p class="mt-3 text-xs text-gris">{votesFor(r).length} votos</p>
            </li>
          {/each}
        </ul>
        {#if isHost}
          <button class="mt-6 h-16 w-full rounded-2xl bg-papel text-lg font-bold text-tinta" onclick={() => setPhase(code, 'reveal')}>Revelar</button>
        {/if}
      {:else}
        <h1 class="font-display text-3xl font-extrabold">Resultados</h1>
        <ul class="mt-6 space-y-4">
          {#each done as r, i (r.id)}
            {@const t = topOf(r)}
            <li class="entra rounded-3xl bg-papel p-5 text-tinta" style="animation-delay: {i * 80}ms">
              <p class="font-display text-xl font-extrabold">{r.name}</p>
              <p class="font-display text-2xl font-extrabold leading-tight" style="color: {t?.profile.color}">{t ? `${t.pct}% ${t.profile.name}` : ''}</p>
              <p class="mt-1 text-sm italic text-gris">{t?.profile.tagline}</p>
              <p class="mt-3 text-sm">{rightFor(r).length} de {votesFor(r).length} acertaron{rightFor(r).length ? `: ${rightFor(r).map(p => p.name).join(', ')}` : ''}</p>
            </li>
          {/each}
        </ul>

        <section class="mt-8 rounded-3xl bg-white/10 p-5">
          <h2 class="font-display text-xl font-extrabold">Quién conoce mejor al grupo</h2>
          <ol class="mt-3 space-y-1">
            {#each scoreboard as s, i (s.p.id)}
              <li class="flex justify-between"><span>{i + 1}. {s.p.name}</span><span class="font-semibold">{s.ok} aciertos</span></li>
            {/each}
          </ol>
        </section>

        {#if pairs.length}
          <section class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-3xl bg-white/10 p-4">
              <p class="text-xs font-bold uppercase tracking-widest opacity-70">Almas gemelas</p>
              <p class="mt-1 font-display text-lg font-extrabold leading-tight">{pairs[0].a.name} y {pairs[0].b.name}</p>
              <p class="text-sm opacity-80">{pairs[0].s}% iguales</p>
            </div>
            <div class="rounded-3xl bg-white/10 p-4">
              <p class="text-xs font-bold uppercase tracking-widest opacity-70">Polos opuestos</p>
              <p class="mt-1 font-display text-lg font-extrabold leading-tight">{pairs.at(-1)!.a.name} y {pairs.at(-1)!.b.name}</p>
              <p class="text-sm opacity-80">{pairs.at(-1)!.s}% iguales</p>
            </div>
          </section>
        {/if}

        <a class="mt-8 grid h-14 place-items-center rounded-2xl bg-papel font-bold text-tinta" href="/test/{test.slug}/">Ver mi tarjeta para compartir</a>
        <a class="mt-3 grid h-14 place-items-center rounded-2xl border-2 border-current font-bold" href="/">Otro test</a>
      {/if}
    </section>
  {/if}
</div>
