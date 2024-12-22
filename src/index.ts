import $, { Cash } from "cash-dom";
import {
  Plugin,
  Menu,
  IModel,
  openWindow,
  App,
  EventMenu,
  IMenuItemOption,
  IEventBusMap,
} from "siyuan";
import SetPasswordFormDialog from "@/components/SetPasswordFormDialog.svelte";
import UnlockNotebookDialog from "@/components/RemoveLockDialog.svelte";
import {
  GLOBAL_LOCK_STATE,
  SECURED_NOTES_STORAGE,
  StorageService,
  storageService,
} from "./services/StorageService";
import { I18N } from "./types/i18n";
import { SettingUtils } from "./libs/setting-utils";
import { Logger } from "./libs/logger";
import { SecuredNotesStorage } from "./types/SecuredNotesStorage";
import { LockState } from "./types/LockState";
import { LockNotebookService } from "./services/LockNotebookService";
import { SiyuanEvents } from "./types/SiyuanEvents";
import { isMobile } from "./utils/isMobile";
import { OverlayPosition } from "./services/OverlayInterceptor";
import { svelteDialog } from "./libs/dialog";
import "@/index.scss";
import { removeRefIgnore, removeSearchIgnore } from "./api/searchIgnore";
import { sleep } from "./utils/sleep";

export default class SecureNotesPlugin extends Plugin {
  customTab: () => IModel;
  private isMobile: boolean;
  private settingUtils: SettingUtils;
  private storageService: StorageService;

  constructor(options: { app: App; name: string; i18n: I18N }) {
    super(options);

    this.storageService = storageService;
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

    this.eventBus.on(
      SiyuanEvents.OPEN_MENU_DOCTREE,
      this.onOpenMenuDocTree.bind(this)
    );

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

    if (this.isNotebookLocked(dataId)) {
      this.handleLockedNotebookMenu($element, dataId, detail);
      return;
    }

    this.addNotebookUnlockedContextMenu(dataId, event);
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
        LockNotebookService.createLockOverlay(
          $element.parent(),
          dataId,
          OverlayPosition.Directory
        );
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
            return new UnlockNotebookDialog({
              target: container,
              props: {
                i18n: this.I18N,
                currentPassword: storageService.getPassword(dataId),
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
      iconHTML: "",
      label: this.i18n.setPasswordMenuItem,
      click: () => {
        const dialog = svelteDialog({
          title: this.I18N.setPasswordMenuItem,
          width: this.isMobile ? "92vw" : "720px",
          constructor: (container: HTMLElement) => {
            return new SetPasswordFormDialog({
              target: container,
              props: {
                i18n: this.I18N,
                onClose: () => {
                  dialog.close();
                },
                onSave: (password: string) => {
                  Logger.debug(`Lock note ${dataId} with password`);

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
    this.removeData(SECURED_NOTES_STORAGE);
    this.removeData(GLOBAL_LOCK_STATE);
  }

  initStorage() {
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
          // 如果被隐藏，则使用更多按钮
          if (rect.width === 0) {
            rect = document.querySelector("#barMore").getBoundingClientRect();
          }
          if (rect.width === 0) {
            rect = document
              .querySelector("#barPlugins")
              .getBoundingClientRect();
          }
          this.addMenu(rect);
        }
      },
    });
  }

  initSettings() {
    this.settingUtils = new SettingUtils({
      plugin: this,
    });

    // this.settingUtils.addItem({
    //   key: "Input",
    //   value: "",
    //   type: "textinput",
    //   title: "Readonly text",
    //   description: "Input description",
    //   action: {
    //     // Called when focus is lost and content changes
    //     callback: () => {
    //       // Return data and save it in real time
    //       let value = this.settingUtils.takeAndSave("Input");
    //       console.log(value);
    //     },
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "InputArea",
    //   value: "",
    //   type: "textarea",
    //   title: "Readonly text",
    //   description: "Input description",
    //   // Called when focus is lost and content changes
    //   action: {
    //     callback: () => {
    //       // Read data in real time
    //       let value = this.settingUtils.take("InputArea");
    //       console.log(value);
    //     },
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "Check",
    //   value: true,
    //   type: "checkbox",
    //   title: "Checkbox text",
    //   description: "Check description",
    //   action: {
    //     callback: () => {
    //       // Return data and save it in real time
    //       let value = !this.settingUtils.get("Check");
    //       this.settingUtils.set("Check", value);
    //       console.log(value);
    //     },
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "Select",
    //   value: 1,
    //   type: "select",
    //   title: "Select",
    //   description: "Select description",
    //   options: {
    //     1: "Option 1",
    //     2: "Option 2",
    //   },
    //   action: {
    //     callback: () => {
    //       // Read data in real time
    //       let value = this.settingUtils.take("Select");
    //       console.log(value);
    //     },
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "Slider",
    //   value: 50,
    //   type: "slider",
    //   title: "Slider text",
    //   description: "Slider description",
    //   direction: "column",
    //   slider: {
    //     min: 0,
    //     max: 100,
    //     step: 1,
    //   },
    //   action: {
    //     callback: () => {
    //       // Read data in real time
    //       let value = this.settingUtils.take("Slider");
    //       console.log(value);
    //     },
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "Btn",
    //   value: "",
    //   type: "button",
    //   title: "Button",
    //   description: "Button description",
    //   button: {
    //     label: "Button",
    //     callback: () => {
    //       showMessage("Button clicked");
    //     },
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "Custom Element",
    //   value: "",
    //   type: "custom",
    //   direction: "row",
    //   title: "Custom Element",
    //   description: "Custom Element description",
    //   //Any custom element must offer the following methods
    //   createElement: (currentVal: any) => {
    //     let div = document.createElement("div");
    //     div.style.border = "1px solid var(--b3-theme-primary)";
    //     div.contentEditable = "true";
    //     div.textContent = currentVal;
    //     return div;
    //   },
    //   getEleVal: (ele: HTMLElement) => {
    //     return ele.textContent;
    //   },
    //   setEleVal: (ele: HTMLElement, val: any) => {
    //     ele.textContent = val;
    //   },
    // });
    // this.settingUtils.addItem({
    //   key: "Hint",
    //   value: "",
    //   type: "hint",
    //   title: this.i18n.hintTitle,
    //   description: this.i18n.hintDesc,
    // });

    try {
      this.settingUtils.load();
    } catch (error) {
      console.error(
        "Error loading settings storage, probably empty config json:",
        error
      );
    }
  }

  private addMenu(rect?: DOMRect) {
    const menu = new Menu("secureNotesTopBarMenu");

    if (!this.isMobile) {
      menu.addItem({
        icon: "iconUnlock",
        label: this.I18N.unlock,
        click: () => {
          openWindow({
            doc: { id: "20200812220555-lj3enxa" },
          });
        },
      });
    }

    menu.addSeparator();
    menu.addItem({
      icon: "iconSettings",
      label: this.I18N.settings,
      click: () => {
        this.openSetting();
      },
    });

    if (this.isMobile) {
      menu.fullscreen();
    } else {
      menu.open({
        x: rect.right,
        y: rect.bottom,
        isLeft: true,
      });
    }
  }

  private isNotebookLocked(notebookId: string) {
    if (!notebookId) return false;
    Logger.debug(
      "isNotebookLocked",
      notebookId,
      this.data[SECURED_NOTES_STORAGE]
    );
    return this.data[SECURED_NOTES_STORAGE][notebookId] !== undefined;
  }
}
