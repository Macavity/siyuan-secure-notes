import $, { Cash } from "cash-dom";
import {
  Plugin,
  Menu,
  IModel,
  App,
  EventMenu,
  IMenuItemOption,
  IEventBusMap,
} from "siyuan";
import {
  GLOBAL_LOCK_STATE,
  SECURED_NOTES_STORAGE,
  storageService,
} from "./services/StorageService";
import { I18N } from "./types/i18n";
import { SettingUtils } from "./libs/setting-utils";
import { Logger } from "./libs/logger";
import { LockNotebookService } from "./services/LockNotebookService";
import { SiyuanEvents } from "./types/SiyuanEvents";
import { isMobile } from "./utils/isMobile";
import { OverlayPosition } from "./services/OverlayInterceptor";
import { svelteDialog } from "./libs/dialog";
import { removeRefIgnore, removeSearchIgnore } from "./api/searchIgnore";
import { sleep } from "./utils/sleep";
import RemoveLockDialog from "@/components/RemoveLockDialog.svelte";
import UnlockAllNotebooksDialog from "@/components/UnlockAllNotebooksDialog.svelte";
import "@/index.scss";
import { Setting } from "./types/Setting";
import { LockState } from "./types/LockState";
import { hashPassword } from "./utils/crypto";
import LockWithMasterPassword from "@/components/LockWithMasterPassword.svelte";

export default class SecureNotesPlugin extends Plugin {
  customTab: () => IModel;
  private isMobile: boolean;
  private settingUtils: SettingUtils;

  constructor(options: { app: App; name: string; i18n: I18N }) {
    super(options);
  }

  get I18N(): I18N {
    return this.i18n as I18N;
  }

  async onload() {
    this.isMobile = isMobile();

    // TODO Clarify
    if (this.isMobile) {
      return;
    }

    Logger.info(`Secure Notes Plugin: v${process.env.PLUGIN_VERSION}`);

    this.initStorage();
    this.initSettings();
    this.initTopBarIcon();

    LockNotebookService.onLoad(this.I18N);
  }

  onLayoutReady() {
    // TODO Clarify
    if (this.isMobile) {
      return;
    }

    this.settingUtils.load();
    LockNotebookService.onLayoutReady();

    this.eventBus.on(SiyuanEvents.OPEN_MENU_DOCTREE, this.onOpenMenuDocTree.bind(this));

    this.eventBus.on(SiyuanEvents.OPEN_MENU_CONTENT, (event) =>
      LockNotebookService.showContentMenu(event)
    );
    this.eventBus.on(SiyuanEvents.CLICK_BLOCKICON, (event) =>
      LockNotebookService.showContentMenu(event as any)
    );

    this.eventBus.on(SiyuanEvents.WS_MAIN, (event) => this.onWSMain(event));
  }

  // TODO Clarify when this is called
  async onWSMain(event: CustomEvent<IEventBusMap["ws-main"]>) {
    if (event.detail?.data?.box) {
      Logger.debug("onWSMain", event.detail);
      const isNotebookOpen = event.detail?.data?.existed === false;
      const isDocumentCreateOrRename = Boolean(event.detail?.data?.id);

      if (isNotebookOpen || isDocumentCreateOrRename) return "不上锁";
      await sleep(100);
      LockNotebookService.traverseAndLockNotes();
    }
  }

  onOpenMenuDocTree(event: CustomEvent<IEventBusMap["open-menu-doctree"]>) {
    const detail = event.detail;
    const $element = $(event.detail.elements[0]);
    const type = detail.type;
    if (type !== "notebook") return;

    const dataId = $element.parent().data("url") || $element.data("nodeId");
    Logger.debug("OPEN_MENU_DOCTREE dataId", dataId);

    if (storageService.isNotebookSecured(dataId)) {
      this.handleLockedNotebookMenu($element, dataId, detail);
      return;
    }

    this.addNotebookUnlockedContextMenu(dataId, event);
  }

  refreshLockState(){

  }

  handleLockedNotebookMenu(
    $element: Cash,
    dataId: string,
    detail: {
      menu: EventMenu;
      elements: NodeListOf<HTMLElement>;
      type: "doc" | "docs" | "notebook";
    }
  ) {
    // Lock Notebook
    detail.menu.addItem({
      iconHTML: "",
      label: this.i18n.secureNotes,
      click: () => {
        LockNotebookService.createLockOverlay($element.parent(), dataId, OverlayPosition.Directory);
        LockNotebookService.lockNotebookTabs(dataId);
      },
    });

    // Remove Password
    detail.menu.addItem({
      iconHTML: "",
      label: this.i18n.removeLock,
      click: () => {
        const dialog = svelteDialog({
          title: this.I18N.removeLock,
          width: this.isMobile ? "92vw" : "720px",
          constructor: (container: HTMLElement) => {
            return new RemoveLockDialog({
              target: container,
              props: {
                i18n: this.I18N,
                notebookId: dataId,
                onClose: () => {
                  dialog.close();
                },
                onSuccess: () => {
                  storageService.removeLock(dataId);

                  removeRefIgnore(dataId);
                  removeSearchIgnore(dataId);

                  dialog.close();
                },
              },
            });
          },
        });
      },
    });
    return;
  }

  addNotebookUnlockedContextMenu(
    dataId: string,
    event: CustomEvent<IEventBusMap["open-menu-doctree"]>
  ) {
    const setPasswordMenuItem: IMenuItemOption = {
      label: this.i18n.setPasswordMenuItem,
      icon: "iconLock",
      click: () => {
        // const dialog = svelteDialog({
        //   title: this.I18N.setPasswordMenuItem,
        //   width: this.isMobile ? "92vw" : "720px",
        //   constructor: (container: HTMLElement) => {
        //     return new SetPasswordFormDialog({
        //       target: container,
        //       props: {
        //         i18n: this.I18N,
        //         onClose: () => {
        //           dialog.close();
        //         },
        //         onSave: (password: string) => {
        //           storageService.secureNotebook(dataId, password);
        //           dialog.close();
        //         },
        //       },
        //     });
        //   },
        // });
        const dialog = svelteDialog({
          title: this.I18N.setPasswordMenuItem,
          width: this.isMobile ? "92vw" : "720px",
          constructor: (container: HTMLElement) => {
            const masterPassword = this.settingUtils.get(Setting.MasterPassword);

            return new LockWithMasterPassword({
              target: container,
              props: {
                i18n: this.I18N,
                hasMasterPassword: masterPassword && (masterPassword !== ""),
                onClose: () => {
                  dialog.close();
                },
                onSave: async () => {
                  await storageService.secureNotebookWithMasterPassword(dataId);
                  dialog.close();

                },
              },
            });
          },
        });
      },
    };

    event.detail.menu.addItem(setPasswordMenuItem);
  }

  uninstall(): void {
    // TODO Add setting to remove data
    this.removeData(SECURED_NOTES_STORAGE);
    this.removeData(GLOBAL_LOCK_STATE);
  }

  initStorage() {
    storageService.initSalt();
    storageService.fetchSecuredNotes();
  }

  initTopBarIcon() {
    const topBarElement = this.addTopBar({
      icon: "iconLock",
      title: this.I18N.topBarIconTooltip,
      position: "right",

      callback: () => {
        if (this.isMobile) {
          this.addMenu();
        } else {
          let rect = topBarElement.getBoundingClientRect();
          // If hidden, use the More button
          if (rect.width === 0) {
            rect = document.querySelector("#barMore").getBoundingClientRect();
          }
          if (rect.width === 0) {
            rect = document.querySelector("#barPlugins").getBoundingClientRect();
          }
          this.addMenu(rect);
        }
      },
    });
  }

  initSettings() {
    this.settingUtils = new SettingUtils({
      plugin: this,
      callback: () => {
        this.settingUtils.getElement(Setting.MasterPassword).disabled =
          this.settingUtils.get(Setting.MasterPassword) !== "";
      },
    });

    // Master Password Input
    const masterPasswordSetting = this.settingUtils.get(Setting.MasterPassword);
    const hasMasterPassword = masterPasswordSetting !== undefined && masterPasswordSetting !== "";

    this.settingUtils.addItem({
      key: Setting.MasterPassword,
      value: "",
      type: "password",
      title: this.i18n.masterPasswordLabel,
      description: hasMasterPassword
        ? this.I18N.masterPasswordReadonly
        : this.i18n.masterPasswordDescription,
      disabled: hasMasterPassword,
      action: {
        callback: async () => {
          hashPassword(
            this.settingUtils.get(Setting.MasterPassword),
            storageService.getSalt()
          ).then((hash) => {
            // console.log("hashed master password:", hash);
            this.settingUtils.set(Setting.MasterPassword, hash);
          });
        },
      },
    });

      this.settingUtils.addItem({
        key: "resetMasterPassword",
        value: "",
        type: "button",
        title: this.I18N.masterPasswordResetLabel,
        description: this.I18N.masterPasswordResetDescription,
        button: {
          label: this.I18N.masterPasswordResetButton,
          callback: () => {
            this.settingUtils.set(Setting.MasterPassword, "");
            this.settingUtils.getElement(Setting.MasterPassword).disabled = false;
          },
        },
      });

    // Remove Data on uninstallation Checkbox
    this.settingUtils.addItem({
      key: Setting.CleanData,
      value: false,
      type: "checkbox",
      title: this.i18n.removeDataOnUninstallLabel,
      description: this.i18n.removeDataOnUninstallDescription,
      action: {
        callback: () => {
          const value = !this.settingUtils.get(Setting.CleanData);
          this.settingUtils.set(Setting.CleanData, value);
        },
      },
    });

    // Security Mode Dropdown
    this.settingUtils.addItem({
      key: Setting.SecurityMode,
      value: "blur",
      type: "select",
      title: this.i18n.securityModeLabel,
      description: this.i18n.securityModeDescription,
      options: {
        blur: this.i18n.securityModeBlur,
        hide: this.i18n.securityModeHide,
      },
      action: {
        callback: () => {
          this.settingUtils.takeAndSave(Setting.SecurityMode);
          // Logger.debug("Security mode updated:", value);
        },
      },
    });

    // this.settingUtils.addItem({
    //   key: "Hint",
    //   value: "",
    //   type: "hint",
    //   title: this.i18n.hintTitle,
    //   description: this.i18n.hintDesc,
    // });

    try {
      this.settingUtils.load().then(() => {
        storageService.setMasterPasswordHash(this.settingUtils.get(Setting.MasterPassword));
      });
    } catch (error) {
      console.error("Error loading settings storage, probably empty config json:", error);
    }
  }

  // TODO Global lock state
  private addMenu(rect?: DOMRect) {
    const menu = new Menu("secureNotesTopBarMenu");

    if (this.isMobile) {
      return;
    }

    menu.addItem({
      icon: "iconUnlock",
      label: this.I18N.unlockAllNotes,
      click: () => {
        const dialog = svelteDialog({
          title: this.I18N.unlockAllNotes,
          width: this.isMobile ? "92vw" : "720px",
          constructor: (container: HTMLElement) => {
            return new UnlockAllNotebooksDialog({
              target: container,
              props: {
                i18n: this.I18N,
                masterPasswordHash: this.settingUtils.get(Setting.MasterPassword),
                onClose: () => {
                  Logger.debug("UnlockAllNotebooksDialog onClose");
                  dialog.close();
                },
                onSuccess: () => {
                  Logger.debug("UnlockAllNotebooksDialog onSuccess");
                  storageService.setLockState(LockState.UNLOCKED);
                  LockNotebookService.unlockAll();
                  dialog.close();
                },
              },
            });
          },
        });
      },
    });

    menu.addSeparator();
    menu.addItem({
      icon: "iconSettings",
      label: this.I18N.settings,
      click: () => {
        this.openSetting();
      },
    });

    // if (this.isMobile) {
    //   menu.fullscreen();
    // } else {
    menu.open({
      x: rect.right,
      y: rect.bottom,
      isLeft: true,
    });
    // }
  }
}
