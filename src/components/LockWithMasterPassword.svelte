<script lang="ts">
  import { type I18N } from "@/types/i18n";

  export let i18n: I18N;
  export let hasMasterPassword: boolean;
  export let onSave: () => void;
  export let onClose: () => void;

  let password = "";
  let confirmPassword = "";

  $: submitForm = () => {
    console.log("submitForm", password, confirmPassword);
    onSave();
  };

</script>

<div class="b3-dialog__body">
  <div class="b3-dialog__content">
    {hasMasterPassword ? i18n.lockNotebookWithMasterPassword : i18n.lockNotebookWithMasterPassword_Missing}
  </div>
  <div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" on:click={() => onClose()}>
      {i18n.cancel}
    </button>
    <div class="fn__space"></div>
    <button class="b3-button b3-button--text" disabled={!hasMasterPassword} on:click={submitForm}>
      {i18n.lockNotebook}
    </button>
  </div>
</div>
