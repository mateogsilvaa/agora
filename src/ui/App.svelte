<script lang="ts">
  import type { Dirt, Ending, GameEvent, GameState, Party, Stat } from '../engine/types';
  import { ACTS, LAST_TURN, choose, draw, newGame, playDirt, previewOption, checkEnd } from '../engine/game';
  import { visibleOptions } from '../engine/director';
  import { PACK, dirtById } from '../content';
  import { loadGame, loadPrefs, saveGame, savePrefs } from '../lib/persist';
  import { recordRun } from '../lib/firebase';
  import Menu from './Menu.svelte';
  import StatBars from './StatBars.svelte';
  import EventCard from './EventCard.svelte';
  import DirtFolder from './DirtFolder.svelte';
  import Office from './Office.svelte';
  import EndScreen from './EndScreen.svelte';

  type Screen = 'menu' | 'game' | 'end';

  const saved = loadGame();
  let prefs = $state(loadPrefs());
  let screen = $state<Screen>('menu');
  let game = $state<GameState | null>(null);
  let event = $state<GameEvent | null>(null);
  let end = $state<Ending | null>(null);
  let previewIdx = $state<number | null>(null);
  let headline = $state<string | null>(null);
  let folderOpen = $state(false);
  let hasSave = $state(Boolean(saved));

  // #s=1234&p=PTC → reto: misma semilla, mismo partido
  const link = new URLSearchParams(location.hash.slice(1));
  const seedFromLink = link.get('s') ? { seed: Number(link.get('s')), party: (link.get('p') ?? 'PTC') as Party } : null;

  const options = $derived(game && event ? visibleOptions(event, game) : []);
  const preview = $derived<Partial<Record<Stat, 'small' | 'big'>>>(event && previewIdx !== null ? previewOption(event, previewIdx) : {});
  const dirtCards = $derived(game ? game.dirt.map(dirtById).filter((d): d is Dirt => Boolean(d)) : []);

  $effect(() => { document.body.classList.toggle('streamer', prefs.streamer); });

  function start(party: Party, seed = Math.floor(Math.random() * 1e9)) {
    game = newGame(seed, party);
    event = draw(PACK, game);
    end = null;
    headline = null;
    screen = 'game';
    persist();
  }

  function resume() {
    if (!saved) return;
    game = saved.game;
    event = PACK.find(e => e.id === saved.eventId) ?? draw(PACK, game);
    screen = 'game';
  }

  function persist() {
    if (game && event) saveGame({ game: $state.snapshot(game) as GameState, eventId: event.id });
    hasSave = true;
  }

  function pick(i: number) {
    if (!game || !event) return;
    headline = event.options[i].headline ?? null;
    previewIdx = null;
    const result = choose(game, event, i);
    if (result) return finish(result);
    event = draw(PACK, game);
    persist();
  }

  function useDirt(d: Dirt) {
    if (!game || !playDirt(game, d)) return;
    headline = `Sale a la luz: ${d.title}`;
    folderOpen = false;
    const result = checkEnd(game);
    if (result) return finish(result);
    persist();
  }

  function finish(result: Ending) {
    end = result;
    screen = 'end';
    saveGame(null);
    hasSave = false;
    if (!prefs.endings.includes(result.key)) prefs.endings = [...prefs.endings, result.key];
    prefs.best = Math.max(prefs.best, game!.turn - 1);
    savePrefs($state.snapshot(prefs));
    recordRun($state.snapshot(game!) as GameState, result);
  }

  function toggleStreamer() {
    prefs.streamer = !prefs.streamer;
    savePrefs($state.snapshot(prefs));
  }
</script>

{#if screen === 'menu'}
  <Menu canContinue={hasSave} {seedFromLink} endings={prefs.endings.length} streamer={prefs.streamer}
    onstart={start} oncontinue={resume} onstreamer={toggleStreamer} />
{:else if screen === 'end' && game && end}
  <EndScreen {game} {end} onagain={same => start(game!.party, same ? game!.seed : undefined)} onmenu={() => (screen = 'menu')} />
{:else if game && event}
  <div class="mx-auto grid min-h-dvh max-w-6xl grid-rows-[auto_1fr] landscape:max-lg:grid-cols-[1fr_1.2fr_1fr] lg:grid-cols-[260px_1fr_280px] landscape:max-lg:grid-rows-1 lg:grid-rows-1">
    <aside class="hidden border-r border-sumario p-4 landscape:max-lg:block lg:block">
      <Office {game} part="organigrama" />
    </aside>

    <main class="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <header class="flex items-center justify-between px-3 pt-3 font-ui text-xs">
        <button class="underline" onclick={() => (screen = 'menu')}>Portada</button>
        <span class="font-cifra uppercase tracking-wider">T{game.turn}/{LAST_TURN} · {ACTS[game.act - 1]}</span>
        <span class="font-semibold">{game.party}</span>
      </header>

      <StatBars stats={game.stats} {preview} />

      <div class="flex h-12 items-center justify-center px-4 text-center">
        {#key headline}
          {#if headline}
            <p class="font-titular text-sm italic leading-tight text-tinta-suave">«{headline}»</p>
          {/if}
        {/key}
      </div>

      <section class="flex-1 px-4">
        {#key event.id + game.turn}
          <EventCard {event} {options} onchoose={pick} onpreview={i => (previewIdx = i)} />
        {/key}
      </section>

      <footer class="flex items-center justify-between gap-3 px-4 py-4 font-ui text-sm">
        <button class="flex items-center gap-2 rounded-sm border-2 border-tinta px-3 py-2 font-semibold" onclick={() => (folderOpen = true)}>
          🗂 Trapos sucios <span class="rounded-full bg-tampon px-2 text-xs text-white">{game.dirt.length}</span>
        </button>
        <span class="text-right text-[11px] text-tinta-suave">Desliza o pulsa · ← → ↓</span>
      </footer>
    </main>

    <aside class="hidden border-l border-sumario p-4 landscape:max-lg:block lg:block">
      <Office {game} part="prensa" />
    </aside>
  </div>

  {#if folderOpen}
    <DirtFolder dirt={dirtCards} used={game.dirtUsedTurn === game.turn} onuse={useDirt} onclose={() => (folderOpen = false)} />
  {/if}
{/if}
