<script lang="ts">
  import { adminSignIn, adminSignOut, adminUser, configured, loadEvents, loadRoomCount, type StoredEvent } from '../lib/firebase';
  import { decode } from '../quiz/score';
  import { TESTS, testBySlug } from '../tests';

  type State = 'cargando' | 'fuera' | 'sin-permiso' | 'dentro' | 'error';
  let view = $state<State>('cargando');
  let uid = $state('');
  let email = $state('');
  let days = $state(30);
  let events = $state<StoredEvent[]>([]);
  let rooms = $state(0);
  let selected = $state(TESTS[0].slug);

  async function load() {
    view = 'cargando';
    try {
      [events, rooms] = await Promise.all([loadEvents(days), loadRoomCount()]);
      view = 'dentro';
    } catch (e) {
      view = (e as { code?: string })?.code === 'permission-denied' || String(e).toLowerCase().includes('permission') ? 'sin-permiso' : 'error';
    }
  }

  async function init() {
    if (!configured) { view = 'error'; return; }
    const u = await adminUser();
    if (!u) { view = 'fuera'; return; }
    uid = u.uid; email = u.email ?? '';
    await load();
  }
  init();

  async function signIn() {
    const u = await adminSignIn();
    uid = u.uid; email = u.email ?? '';
    await load();
  }

  const count = (t: string, f?: (e: StoredEvent) => boolean) => events.filter(e => e.type === t && (!f || f(e))).length;
  const starts = $derived(count('start'));
  const finishes = $derived(count('finish'));
  const shares = $derived(count('share'));
  const retos = $derived(count('finish', e => e.mode === 'reto'));
  const joins = $derived(count('room_join'));
  const roomsMade = $derived(count('room_create'));
  const avgTime = $derived.by(() => {
    const t = events.filter(e => e.type === 'finish' && e.ms).map(e => e.ms!);
    return t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length / 1000) : 0;
  });
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

  // Partidas terminadas por día
  const daily = $derived.by(() => {
    const out: { day: string; n: number; s: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ day: d, n: 0, s: 0 });
    }
    const map = new Map(out.map(o => [o.day, o]));
    for (const e of events) {
      const o = map.get(e.ts.toISOString().slice(0, 10));
      if (!o) continue;
      if (e.type === 'finish') o.n++;
      if (e.type === 'start') o.s++;
    }
    return out;
  });
  const dailyMax = $derived(Math.max(1, ...daily.map(d => Math.max(d.n, d.s))));

  const perTest = $derived(TESTS.map(t => {
    const s = count('start', e => e.slug === t.slug);
    const f = count('finish', e => e.slug === t.slug);
    const sh = count('share', e => e.slug === t.slug);
    return { t, s, f, sh, rate: pct(f, s), viral: pct(sh, f) };
  }).sort((a, b) => b.f - a.f));

  const groupBy = (list: StoredEvent[], key: (e: StoredEvent) => string | undefined) => {
    const m = new Map<string, number>();
    for (const e of list) { const k = key(e) ?? '—'; m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const sources = $derived(groupBy(events.filter(e => e.type === 'start'), e => e.ref).slice(0, 10));
  const channels = $derived(groupBy(events.filter(e => e.type === 'share'), e => e.channel));
  const devices = $derived(groupBy(events.filter(e => e.type === 'start'), e => e.device));
  const modes = $derived(groupBy(events.filter(e => e.type === 'finish'), e => e.mode));

  const sel = $derived(testBySlug(selected)!);
  const selFinishes = $derived(events.filter(e => e.type === 'finish' && e.slug === selected));
  const results = $derived(groupBy(selFinishes, e => e.top).map(([id, n]) => ({ name: sel.profiles.find(p => p.id === id)?.name ?? id, color: sel.profiles.find(p => p.id === id)?.color ?? '#999', n })));
  const perQuestion = $derived(sel.questions.map((q, i) => {
    let yes = 0, no = 0;
    for (const e of selFinishes) {
      const a = e.answers ? decode(e.answers)[i] : 0;
      if (a === 1) yes++; else if (a === -1) no++;
    }
    return { q, yes, no, p: pct(yes, yes + no) };
  }));
</script>

<main class="mx-auto max-w-5xl px-4 py-6">
  <header class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <a class="font-display text-xl font-extrabold tracking-wide" href="/">VOTÁGORA</a>
      <span class="ml-2 rounded-md bg-tinta px-2 py-0.5 text-xs font-bold text-papel">ADMIN</span>
    </div>
    {#if view === 'dentro'}
      <div class="flex items-center gap-2 text-sm">
        {#each [7, 30, 90] as d}
          <button class="rounded-lg px-3 py-1.5 font-semibold {days === d ? 'bg-tinta text-papel' : 'bg-white'}" onclick={() => { days = d; load(); }}>{d} días</button>
        {/each}
        <button class="ml-2 text-gris underline" onclick={async () => { await adminSignOut(); view = 'fuera'; }}>Salir</button>
      </div>
    {/if}
  </header>

  {#if view === 'cargando'}
    <p class="mt-16 text-center text-gris">Cargando…</p>
  {:else if view === 'fuera'}
    <section class="mx-auto mt-16 max-w-sm text-center">
      <h1 class="font-display text-3xl font-extrabold">Panel de uso</h1>
      <p class="mt-2 text-gris">Entra con la cuenta de Google autorizada.</p>
      <button class="mt-6 h-14 w-full rounded-2xl bg-tinta font-bold text-papel" onclick={signIn}>Entrar con Google</button>
    </section>
  {:else if view === 'sin-permiso'}
    <section class="mx-auto mt-16 max-w-lg rounded-3xl bg-white p-6">
      <h1 class="font-display text-2xl font-extrabold">Tu cuenta no está autorizada todavía</h1>
      <p class="mt-2 text-gris">Has entrado como {email}. Para darte acceso, en la consola de Firebase → Firestore, crea un documento en la colección <b>admins</b> con este ID:</p>
      <code class="mt-3 block select-all break-all rounded-xl bg-papel p-3 text-sm">{uid}</code>
      <p class="mt-3 text-sm text-gris">No hace falta ningún campo. Después recarga esta página.</p>
    </section>
  {:else if view === 'error'}
    <p class="mt-16 text-center text-gris">No se han podido cargar los datos. Revisa la configuración de Firebase.</p>
  {:else}
    <section class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {#each [
        ['Tests empezados', starts, ''],
        ['Tests terminados', finishes, `${pct(finishes, starts)}% acaba`],
        ['Compartidos', shares, `${pct(shares, finishes)}% de los que acaban`],
        ['Llegan por un reto', retos, `${pct(retos, finishes)}% de terminados`],
        ['Salas creadas', roomsMade, `${rooms} en total`],
        ['Jugadores en salas', joins, roomsMade ? `${(joins / roomsMade).toFixed(1)} por sala` : ''],
        ['Tiempo medio', `${avgTime} s`, 'por test terminado'],
        ['Móvil', `${pct(devices.find(d => d[0] === 'movil')?.[1] ?? 0, starts)}%`, 'de las visitas'],
      ] as [label, value, sub]}
        <div class="rounded-2xl bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gris">{label}</p>
          <p class="mt-1 font-display text-3xl font-extrabold tabular-nums">{value}</p>
          {#if sub}<p class="text-xs text-gris">{sub}</p>{/if}
        </div>
      {/each}
    </section>

    <section class="mt-6 rounded-2xl bg-white p-5">
      <div class="flex items-baseline justify-between">
        <h2 class="font-display text-lg font-extrabold">Actividad diaria</h2>
        <p class="text-xs text-gris"><span class="mr-1 inline-block h-2 w-2 rounded-full bg-linea"></span>empezados <span class="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-tinta"></span>terminados</p>
      </div>
      <div class="mt-4 flex h-40 items-end gap-[2px]">
        {#each daily as d (d.day)}
          <div class="group relative flex h-full flex-1 items-end" title="{d.day}: {d.s} empezados, {d.n} terminados">
            <div class="absolute bottom-0 w-full rounded-t-sm bg-linea" style="height: {(d.s / dailyMax) * 100}%"></div>
            <div class="relative w-full rounded-t-sm bg-tinta" style="height: {(d.n / dailyMax) * 100}%"></div>
          </div>
        {/each}
      </div>
      <div class="mt-1 flex justify-between text-[10px] text-gris"><span>{daily[0]?.day}</span><span>hoy</span></div>
    </section>

    <section class="mt-6 overflow-x-auto rounded-2xl bg-white p-5">
      <h2 class="font-display text-lg font-extrabold">Por test</h2>
      <table class="mt-3 w-full min-w-[520px] text-sm">
        <thead class="text-left text-xs uppercase tracking-wider text-gris">
          <tr><th class="py-2">Test</th><th>Empezados</th><th>Terminados</th><th>Acaban</th><th>Compartidos</th><th>Comparten</th></tr>
        </thead>
        <tbody>
          {#each perTest as r (r.t.slug)}
            <tr class="border-t border-linea">
              <td class="py-2 font-semibold"><button class="text-left underline-offset-4 hover:underline" onclick={() => (selected = r.t.slug)}>{r.t.title}</button></td>
              <td class="tabular-nums">{r.s}</td><td class="tabular-nums">{r.f}</td><td class="tabular-nums">{r.rate}%</td>
              <td class="tabular-nums">{r.sh}</td><td class="tabular-nums">{r.viral}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <section class="mt-6 grid gap-4 md:grid-cols-3">
      {#each [['De dónde vienen', sources], ['Cómo comparten', channels], ['Cómo juegan', modes]] as [title, rows]}
        <div class="rounded-2xl bg-white p-5">
          <h2 class="font-display text-lg font-extrabold">{title}</h2>
          {#if !(rows as [string, number][]).length}<p class="mt-2 text-sm text-gris">Sin datos todavía.</p>{/if}
          <ul class="mt-3 space-y-2 text-sm">
            {#each rows as [k, n] (k)}
              {@const max = (rows as [string, number][])[0][1]}
              <li>
                <div class="flex justify-between"><span>{k}</span><span class="tabular-nums text-gris">{n}</span></div>
                <div class="mt-1 h-1.5 rounded-full bg-linea"><div class="h-full rounded-full bg-tinta" style="width: {(Number(n) / max) * 100}%"></div></div>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>

    <section class="mt-6 rounded-2xl bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-lg font-extrabold">Detalle de un test</h2>
        <select class="rounded-lg border border-linea px-3 py-2 text-sm" bind:value={selected}>
          {#each TESTS as t (t.slug)}<option value={t.slug}>{t.title}</option>{/each}
        </select>
      </div>
      <p class="mt-1 text-sm text-gris">{selFinishes.length} terminados en {days} días</p>

      <h3 class="mt-5 text-xs font-bold uppercase tracking-wider text-gris">Resultados que salen</h3>
      <ul class="mt-2 space-y-2 text-sm">
        {#each results as r (r.name)}
          <li>
            <div class="flex justify-between"><span class="font-semibold">{r.name}</span><span class="tabular-nums text-gris">{r.n} · {pct(r.n, selFinishes.length)}%</span></div>
            <div class="mt-1 h-2 rounded-full bg-linea"><div class="h-full rounded-full" style="width: {pct(r.n, selFinishes.length)}%; background: {r.color}"></div></div>
          </li>
        {/each}
      </ul>

      <h3 class="mt-6 text-xs font-bold uppercase tracking-wider text-gris">Qué responde la gente</h3>
      <ul class="mt-2 space-y-3 text-sm">
        {#each perQuestion as q (q.q.id)}
          <li>
            <p>{q.q.text}</p>
            <div class="mt-1 flex h-2 overflow-hidden rounded-full bg-linea">
              <div class="h-full bg-si" style="width: {q.p}%"></div>
              <div class="h-full bg-no" style="width: {q.yes + q.no ? 100 - q.p : 0}%"></div>
            </div>
            <p class="mt-0.5 text-xs text-gris">{q.p}% de acuerdo · {q.yes + q.no} respuestas</p>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>
