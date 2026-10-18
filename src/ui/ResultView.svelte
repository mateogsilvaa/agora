<script lang="ts">
  import type { Answer, QuizTest } from '../quiz/types';
  import { clashes, encode, rank, similarity } from '../quiz/score';
  import { challengeUrl, copyLink, getName, openShare, setName, shareImage, shareText } from '../lib/share';
  import { TESTS } from '../tests';

  let { test, answers, vs = null, vsName = '', onretry, onroom }: {
    test: QuizTest;
    answers: Answer[];
    vs?: Answer[] | null;
    vsName?: string;
    onretry: () => void;
    onroom: () => void;
  } = $props();

  const ranking = $derived(rank(test, answers));
  const top = $derived(ranking[0]);
  let name = $state(getName());
  let status = $state('');
  const link = (src: string) => challengeUrl(test, encode(answers), name, src);
  const text = $derived(shareText(test, top));

  const friend = $derived(vs ? rank(test, vs)[0] : null);
  const sim = $derived(vs ? similarity(answers, vs) : 0);
  const fights = $derived(vs ? clashes(test, answers, vs, 3) : []);
  const verdict = (s: number) => s >= 80 ? 'Almas gemelas' : s >= 60 ? 'Buena sintonía' : s >= 40 ? 'Cena con debate' : s >= 20 ? 'Mejor no habléis de esto' : 'Polos opuestos';

  async function img() { status = 'Preparando imagen…'; status = await shareImage(test, top, link('imagen')) === 'descargado' ? 'Imagen descargada' : ''; }
  async function copy() { status = (await copyLink(link('copiar'), test.slug)) ? 'Enlace copiado: mándaselo a quien quieras retar' : 'No se pudo copiar'; }
  const others = $derived(TESTS.filter(t => t.slug !== test.slug).slice(0, 3));
</script>

<div class="mx-auto w-full max-w-md px-4">
  <!-- La tarjeta, igual que la imagen que se comparte -->
  <div class="entra relative aspect-square overflow-hidden rounded-[2rem] p-7 shadow-2xl" style="background: {test.color}; color: {test.ink}">
    <div class="absolute inset-x-[-20%] top-[40%] h-[36%] -rotate-[3.5deg]" style="background: {top.profile.color}"></div>
    <div class="relative flex h-full flex-col">
      <p class="font-display text-lg font-extrabold tracking-wide">VOTÁGORA</p>
      <p class="text-xs opacity-75">{test.title}</p>
      <p class="mt-auto font-display text-[5.5rem] font-extrabold leading-none">{top.pct}%</p>
      <p class="font-display text-3xl font-extrabold leading-tight">{top.profile.name}</p>
      <p class="mt-1 text-sm italic opacity-90">{top.profile.tagline}</p>
      <p class="mt-auto font-display text-base font-extrabold">¿Tú qué eres?</p>
    </div>
  </div>

  <p class="mt-5 text-base leading-relaxed">{top.profile.description}</p>

  {#if vs && friend}
    <section class="entra mt-6 rounded-3xl bg-tinta p-6 text-papel">
      <p class="text-xs font-bold uppercase tracking-widest opacity-60">Tú y {vsName || 'tu amigo'}</p>
      <p class="mt-1 font-display text-5xl font-extrabold">{sim}%</p>
      <p class="font-display text-xl font-extrabold text-acento">{verdict(sim)}</p>
      <p class="mt-3 text-sm opacity-80">{vsName || 'Tu amigo'}: {friend.pct}% {friend.profile.name}. Tú: {top.pct}% {top.profile.name}.</p>
      {#if fights.length}
        <p class="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">Donde chocáis</p>
        <ul class="mt-2 space-y-2 text-sm">
          {#each fights as f (f.q.id)}
            <li class="rounded-xl bg-white/10 p-3">«{f.q.text}» <span class="opacity-70">Tú: {f.mine === 1 ? 'sí' : 'no'} · {vsName || 'Tu amigo'}: {f.theirs === 1 ? 'sí' : 'no'}</span></li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <section class="mt-6 rounded-3xl bg-white p-5 shadow-sm">
    <label class="block text-xs font-bold uppercase tracking-widest text-gris" for="nombre">Tu nombre (para que sepan quién les reta)</label>
    <input id="nombre" class="mt-2 w-full rounded-xl border border-linea px-3 py-2.5 text-base" maxlength="24" placeholder="Opcional" bind:value={name} onchange={() => setName(name)} />

    <button class="mt-4 h-14 w-full rounded-2xl bg-tinta text-base font-bold text-papel transition active:scale-[.98]" onclick={img}>Compartir mi tarjeta</button>
    <div class="mt-2 grid grid-cols-3 gap-2 text-sm font-semibold">
      <button class="h-12 rounded-xl bg-[#25d366] text-white" onclick={() => openShare('whatsapp', text, link('whatsapp'), test.slug)}>WhatsApp</button>
      <button class="h-12 rounded-xl bg-black text-white" onclick={() => openShare('x', text, link('x'), test.slug)}>X</button>
      <button class="h-12 rounded-xl border border-linea" onclick={copy}>Copiar reto</button>
    </div>
    {#if status}<p class="mt-3 text-center text-sm text-gris">{status}</p>{/if}
    <p class="mt-3 text-center text-xs text-gris">Quien abra tu enlace hará el test y verá en qué coincidís.</p>
  </section>

  <button class="late mt-4 h-16 w-full rounded-2xl text-base font-bold shadow-lg" style="background: {test.color}; color: {test.ink}" onclick={onroom}>
    Jugar con amigos en directo
  </button>

  <section class="mt-8">
    <h2 class="font-display text-lg font-extrabold">Tu reparto completo</h2>
    <ul class="mt-3 space-y-2">
      {#each ranking as r (r.profile.id)}
        <li>
          <div class="flex justify-between text-sm"><span class="font-semibold">{r.profile.name}</span><span class="tabular-nums text-gris">{r.pct}%</span></div>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-linea"><div class="h-full rounded-full" style="width: {r.pct}%; background: {r.profile.color}"></div></div>
        </li>
      {/each}
    </ul>
  </section>

  <div class="mt-8 flex gap-2">
    <button class="h-12 flex-1 rounded-xl border border-linea font-semibold" onclick={onretry}>Repetir</button>
    <a class="grid h-12 flex-1 place-items-center rounded-xl border border-linea font-semibold" href="/">Más tests</a>
  </div>

  <section class="mt-8">
    <h2 class="font-display text-lg font-extrabold">Ahora prueba</h2>
    <div class="mt-3 grid gap-2">
      {#each others as o (o.slug)}
        <a class="flex items-center justify-between rounded-2xl p-4 font-display font-extrabold" style="background: {o.color}; color: {o.ink}" href="/test/{o.slug}/">{o.title}<span>→</span></a>
      {/each}
    </div>
  </section>
</div>
