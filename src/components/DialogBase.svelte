<script lang="ts">
  export let fieldLabel: string;
  export let onSubmit: () => void;
  export let onCancel: () => void;
  export let validationError: string = "";
  export let submitDisabled: boolean = false;
  export let submitLabel: string = "Submit";
  export let cancelLabel: string = "Cancel";
</script>

<div class="b3-dialog__body">
  <div class="b3-dialog__content">
    <div class="fn__flex b3-label config__item">
      <div class="fn__size200">
        {fieldLabel}
      </div>
      <span class="fn__space"></span>
      <div class="fn_size200">
        <slot />
        {#if validationError}
          <div class="fn__flex-column ft__error">
            <span class="">{validationError}</span>
          </div>
        {/if}
      </div>
      <span class="fn__space"></span>
    </div>
  </div>
  <div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" on:click={onCancel}>
      {cancelLabel}
    </button>
    <div class="fn__space"></div>
    <button
      class="b3-button b3-button--text"
      disabled={submitDisabled}
      on:click={onSubmit}
    >
      {submitLabel}
    </button>
  </div>
</div>
