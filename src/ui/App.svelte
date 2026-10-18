<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Ending, GameEvent, GameState, Origin, Stat } from '../engine/types';
  import { STAGES, ageAt, choose, dateLabel, draw, newCareer, previewOption } from '../engine/game';
  import { visibleOptions } from '../engine/director';
  import { ENDINGS, PACK, eventById } from '../content';
  import { loadGame, loadProfile, saveGame, saveProfile } from '../lib/persist';
  import { recordRun } from '../lib/firebase';
  import { VIAS } from './labels';
  import Hud from './Hud.svelte';
  import Card from './Card.svelte';
  import Menu from './Menu.svelte';
  import NewCareer from './NewCareer.svelte';
  import EndScreen from './EndScreen.svelte';
  import Expediente from './Expediente.svelte';

  type Screen = 'menu' | 'new' | 'game' | 'end' | 'file';

  let saved = loadGame();
  let profile = $state(loadProfile());
  let screen = $state<Screen>('menu');
  let game = $state<GameState | null>(null);
  let event = $state<GameEvent | null>(null);
  let end = $state<Ending | null>(null);
  let previewIdx = $state<number | null>(null);
  // Tras decidir: lo que pasó, antes de pasar de mes
  let outcome = $state<{ text: string; promoted: string | null; pending: Ending | null } | null>(null);
  let hasSave = $state(Boolean(saved));

  const options = $derived(game && event ? visibleOptions(event, game) : []);
  const preview = $derived<Partial<Record<Stat, 1 | 2>>>(event && previewIdx !== null && !outcome ? previewOption(event, previewIdx) : {});
  let startWorld: string[] = [];

  function start(origin: Origin, seed: number) {
    startWorld = [...profile.world];
    game = newCareer(seed, profile.world, origin);
    event = draw(PACK, game);
    end = null;
    outcome = null;
    screen = 'game';
    persist();
  }

  function resume() {
    saved = loadGame();
    if (!saved) return;
    game = saved.game;
    startWorld = [...profile.world];
    event = eventById(saved.eventId) ?? draw(PACK, game);
    outcome = null;
    screen = 'game';
  }

  function persist() {
    if (game && event) saveGame({ game: $state.snapshot(game) as GameState, eventId: event.id });
    hasSave = true;
  }

  function pick(i: number) {
    if (!game || !event || outcome) return;
    const stageBefore = game.stage;
    const opt = event.options[i];
    previewIdx = null;
    const result = choose(game, event, i, ENDINGS);
    outcome = {
      text: opt.outcome ?? '',
      promoted: game.stage > stageBefore ? STAGES[game.stage - 1].name : null,
      pending: result,
    };
  }

  function advance() {
    if (!game || !outcome) return;
    if (outcome.pending) return finish(outcome.pending);
    outcome = null;
    event = draw(PACK, game);
    persist();
  }

  function finish(result: Ending) {
    if (!game) return;
    end = result;
    outcome = null;
    screen = 'end';
    saveGame(null);
    hasSave = false;
    const added = game.world.filter(w => !startWorld.includes(w));
    profile.careers = [...profile.careers, {
      seed: game.seed, origin: game.origin, via: game.via, stage: game.stage, months: game.turn - 1,
      ending: result.key, title: result.title, conviccion: game.conviccion, worldAdded: added, date: new Date().toISOString(),
    }];
    profile.world = [...new Set([...profile.world, ...game.world])];
    saveProfile($state.snapshot(profile));
    recordRun($state.snapshot(game) as GameState, result);
  }

  function key(e: KeyboardEvent) {
    if (outcome && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); advance(); }
  }
</script>

<svelte:window onkeydown={key} />

{#if screen === 'menu'}
  <Menu canContinue={hasSave} careers={profile.careers.length} onnew={() => (screen = 'new')} oncontinue={resume} onfile={() => (screen = 'file')} />
{:else if screen === 'new'}
  <NewCareer world={profile.world} onstart={start} onback={() => (screen = 'menu')} />
{:else if screen === 'file'}
  <Expediente {profile} onback={() => (screen = 'menu')} />
{:else if screen === 'end' && game && end}
  <EndScreen {game} {end} worldAdded={game.world.filter(w => !startWorld.includes(w))} onnew={() => (screen = 'new')} onmenu={() => (screen = 'menu')} />
{:else if game && event}
  <div class="mx-auto flex min-h-dvh max-w-xl flex-col px-3 pb-6 sm:px-4">
    <!-- HUD fijo arriba -->
    <header class="sticky top-0 z-10 -mx-3 bg-noche/95 px-4 pb-4 pt-4 backdrop-blur sm:-mx-4 sm:px-5">
      <div class="mb-4 flex items-center justify-between font-crt text-base tracking-widest text-apagado">
        <button class="font-pixel text-[10px] tracking-[0.2em] text-tenue hover:text-tinta" onclick={() => (screen = 'menu')}>◂ MENÚ</button>
        <span>{dateLabel(game.turn)} · {ageAt(game.turn)} AÑOS</span>
      </div>
      <Hud stats={game.stats} {preview} />
      <p class="mt-4 font-pixel text-[9px] tracking-[0.2em] text-tenue">
        {STAGES[game.stage - 1].name.toUpperCase()}{game.via ? ` · VÍA ${VIAS[game.via].toUpperCase()}` : ''}
      </p>
    </header>

    <section class="relative flex-1 pt-2">
      {#if outcome}
        <div class="flex min-h-[60vh] flex-col justify-center" in:fade={{ duration: 250 }}>
          <div class="rounded-xl bg-carbon p-6 ring-1 ring-borde">
            <p class="font-pixel text-[10px] tracking-[0.2em] text-tenue">{dateLabel(game.turn - 1)} → {dateLabel(game.turn)}</p>
            {#if outcome.text}
              <p class="cursor mt-4 font-serif text-xl leading-relaxed">{outcome.text}</p>
            {/if}
            {#if outcome.promoted}
              <div class="mt-6 border-t border-borde pt-5" in:fly={{ y: 12, delay: 400, duration: 400 }}>
                <p class="font-pixel text-[10px] tracking-[0.2em] text-ambar">NUEVA ETAPA</p>
                <p class="mt-1 font-pixel text-lg uppercase tracking-[0.1em]">{outcome.promoted}</p>
              </div>
            {/if}
            <button class="bisel mt-8 w-full rounded-md bg-tinta px-5 py-4 font-pixel text-sm tracking-[0.15em] text-noche" onclick={advance}>
              {outcome.pending ? 'VER CÓMO TERMINA' : 'SIGUIENTE MES'}
            </button>
          </div>
        </div>
      {:else}
        {#key event.id + '·' + game.turn}
          <div in:fly={{ y: 24, duration: 380, easing: cubicOut }}>
            <Card {event} {options} onchoose={pick} onpreview={i => (previewIdx = i)} />
          </div>
        {/key}
        <p class="mt-4 text-center font-pixel text-[9px] tracking-[0.2em] text-tenue">
          PASA EL RATÓN O MANTÉN PULSADO PARA VER QUÉ ARRIESGAS
        </p>
      {/if}
    </section>
  </div>
{/if}
