<script lang="ts">
  import { storageService } from "@/services/StorageService";
  import { type I18N } from "@/types/i18n";
  import DialogBase from "./DialogBase.svelte";
  import { onMount } from "svelte";
  import { Logger } from "@/libs/logger";

  export let i18n: I18N;
  export let onSuccess: () => void;
  export let onClose: () => void;
  export let masterPasswordHash: string;

  let passwordInput: HTMLInputElement;
  let confirmPassword = "";
  let validation = "";
  let disabled = false;
  let submitDisabled = false;

  $: submitForm = async () => {
    Logger.debug("UnlockAllNotebooksDialog", "submitForm", confirmPassword);
    const passwordCorrect =
      await storageService.verifyMasterPassword(confirmPassword);

    if (passwordCorrect) {
      onSuccess();
    } else {
      passwordInput.setCustomValidity(i18n.passwordWrong);
      validation = i18n.passwordWrong;
    }
  };

  onMount(() => {
    if (masterPasswordHash === "") {
      disabled = true;
      submitDisabled = true;
      validation = i18n.masterPasswordMissing;
    } else {
      disabled = false;
    }
  });

  $: onKeyDown = (e: KeyboardEvent) => {
    if (confirmPassword.length) {
      submitDisabled = false;
      if (e.key === "Enter") {
        submitForm();
      }
    } else {
      submitDisabled = true;
    }
  };
</script>

<DialogBase
  fieldLabel={i18n.masterPasswordLabel}
  submitLabel={i18n.unlock}
  cancelLabel={i18n.cancel}
  onCancel={onClose}
  onSubmit={submitForm}
  validationError={validation}
  submitDisabled={disabled}
>
  <input
    bind:this={passwordInput}
    class:b3-text-field={true}
    class:fn__flex-center={true}
    class:fn__size200={true}
    type="password"
    name="confirmPassword"
    placeholder={i18n.password}
    {disabled}
    bind:value={confirmPassword}
    on:keydown={onKeyDown}
  />
</DialogBase>
