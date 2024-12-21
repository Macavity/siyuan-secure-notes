<script lang="ts">
  import { type I18N } from "@/types/i18n";

  export let i18n: I18N;
  export let onSave: (data: any) => void;
  export let onClose: () => void;

  let password = "";
  let confirmPassword = "";
  let validation = "";
  let disabled = true;

  $: submitForm = () => {
    console.log("submitForm", password, confirmPassword);
    if (password !== confirmPassword) {
      confirmPassword = "";
      validation = i18n.repeatPasswordNotMatching;
    } else {
      onSave(password);
    }
  };

  $: onChange = () => {
    if (password && confirmPassword) {
      disabled = false;
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
      <input
        class:b3-text-field={true}
        class:fn__flex-center={true}
        class:fn__size200={true}
        type="password"
        name="password"
        placeholder={i18n.enterPasswordLabel}
        bind:value={password}
        on:keydown={onChange}
      />
      <span class="fn__space"></span>
    </div>

    <div class="fn__flex b3-label config__item">
      <div class="fn__size200">
        {i18n.confirmPassword}
      </div>
      <span class="fn__space"></span>
      <div class="fn_size200">
        <input
          class:b3-text-field={true}
          class:fn__flex-center={true}
          class:fn__size200={true}
          type="password"
          name="confirmPassword"
          placeholder={i18n.repeatPasswordLabel}
          bind:value={confirmPassword}
          on:keydown={onChange}
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
      {i18n.lockNotebook}
    </button>
  </div>
</div>
