<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Cash } from "cash-dom";
  import { OverlayPosition } from "@/services/OverlayInterceptor";

  export let parentElement: Cash;
  export let notebookId: string;
  export let overlayPosition: OverlayPosition;
  export let data: { [key: string]: any } = {};
  export let onClick: (e: Event) => void;

  let maskElement: HTMLDivElement;

  onMount(() => {
    Object.keys(data).forEach((key) => {
      maskElement.dataset[key] = data[key];
    });
  });

  onDestroy(() => {
    maskElement.remove();
  });

  function handleClick(event: Event) {
    if (onClick) {
      onClick(event);
    }
  }
</script>

<div
  class="secure-notes-mask"
  bind:this={maskElement}
  role="none"
  on:click={handleClick}
  data-notebook-id={notebookId}
  data-overlay-position={overlayPosition}
></div>

<style>
  div {
    backdrop-filter: blur(15px);
    z-index: 5;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: not-allowed;
  }
</style>
