<script lang="ts">
  import { testBySlug } from '../tests';
  import Home from './Home.svelte';
  import TestPage from './TestPage.svelte';
  import Room from './Room.svelte';
  import Admin from './Admin.svelte';

  // La página la decide el HTML estático (build/seo.ts); en desarrollo, la URL.
  type Page = { type: 'home' } | { type: 'test'; slug: string } | { type: 'room' } | { type: 'admin' };
  const page: Page = (window as unknown as { __PAGE__?: Page }).__PAGE__ ?? { type: 'home' };
  const test = page.type === 'test' ? testBySlug(page.slug) : undefined;

  // Mientras se juega, el texto de buscadores de debajo estorba: se oculta solo fuera de la portada del test
  if (page.type === 'room' || page.type === 'admin') document.getElementById('seo')?.remove();
</script>

{#if page.type === 'test' && test}
  <TestPage {test} />
{:else if page.type === 'room'}
  <Room />
{:else if page.type === 'admin'}
  <Admin />
{:else}
  <Home />
{/if}
