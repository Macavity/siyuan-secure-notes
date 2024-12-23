<script lang="ts">
  import { Logger } from "@/libs/logger";
  import { storageService } from "@/services/StorageService";
  import { type I18N } from "@/types/i18n";

  export let i18n: I18N;
  export let notebookId: string;
  export let onSuccess: () => void;
  export let onClose: () => void;

  let confirmPassword = "";
  let validation = "";
  let disabled = true;

  $: submitForm = () => {
    if (!notebookId) {
      Logger.error("Notebook ID is not provided");
    }
    storageService.verifyPassword(notebookId, confirmPassword).then((res) => {
      if (res) {
        onSuccess();
      } else {
        validation = i18n.passwordWrong;
      }
    });
  };

  $: onKeyDown = (e: KeyboardEvent) => {
    if (confirmPassword.length) {
      disabled = false;
      if (e.key === "Enter") {
        submitForm();
      }
    } else {
      disabled = true;
    }
  };
</script>

<div class="b3-dialog__body">
  <div class="b3-dialog__content">
    <div class="fn__flex b3-label config__item">
      <div class="fn__size200">
        {i18n.password}
      </div>
      <span class="fn__space"></span>
      <div class="fn_size200">
        <input
          class:b3-text-field={true}
          class:fn__flex-center={true}
          class:fn__size200={true}
          type="password"
          name="confirmPassword"
          placeholder={i18n.enterPasswordLabel}
          bind:value={confirmPassword}
          on:keydown={onKeyDown}
        />
        {#if validation}
          <div class="fn__flex-column ft__error">
            <span class="">{validation}</span>
          </div>
        {/if}
      </div>
      <span class="fn__space"></span>
    </div>
  </div>
  <div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" on:click={() => onClose()}>
      {i18n.cancel}
    </button>
    <div class="fn__space"></div>
    <button class="b3-button b3-button--text" {disabled} on:click={submitForm}>
      {i18n.unlock}
    </button>
  </div>
</div>
