import $, { Cash } from "cash-dom";
import {
  Plugin,
  Menu,
  openTab,
  IModel,
  openWindow,
  openMobileFileById,
  lockScreen,
  App,
  EventMenu,
  IMenuItemOption,
} from "siyuan";
import SetPasswordFormDialog from "@/components/SetPasswordFormDialog.svelte";
import UnlockNotebookDialog from "@/components/UnlockNotebookDialog.svelte";
import { StorageService, storageService } from "./services/StorageService";
import { I18N } from "./types/i18n";
import { SettingUtils } from "./libs/setting-utils";
import { Logger } from "./libs/logger";
import { SecuredNotesStorage } from "./types/SecuredNotesStorage";
import { LockState } from "./types/LockState";
import { LockNotebookService } from "./services/LockNotebookService";
import { OpenMenuDocTreeEvent, SiyuanEvents } from "./types/SiyuanEvents";
import { isMobile } from "./utils/isMobile";
import { createFormDialog } from "./components/FormDialog";
import { OverlayPosition } from "./services/OverlayInterceptor";
import { svelteDialog } from "./libs/dialog";
import "@/index.scss";
import { removeRefIgnore, removeSearchIgnore } from "./api/searchIgnore";

const SECURED_NOTES_STORAGE = "secured-notes";
const GLOBAL_LOCK_STATE = "lock-state";
const TAB_TYPE = "custom_tab";

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

    const getData = async () => {
      let data;
      try {
        data = await this.loadData(SECURED_NOTES_STORAGE);
      } catch (error) {
        console.log("🚀 ~ AccessControllerPlugin ~ getData ~ error:", error);
        return null;
      }
      return data;
    };

    const saveData = async (value: any) => {
      try {
        await this.saveData(SECURED_NOTES_STORAGE, value);
      } catch (error) {
        console.log("🚀 ~ AccessControllerPlugin ~ saveData ~ error:", error);
      }
    };

    LockNotebookService.onLoad(getData, saveData, this.I18N);
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

    this.eventBus.on(SiyuanEvents.WS_MAIN, (event) =>
      LockNotebookService.onWSMain(event)
    );
  }

  onOpenMenuDocTree(event: OpenMenuDocTreeEvent) {
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
                currentPassword: this.data[SECURED_NOTES_STORAGE][dataId],
                onClose: () => {
                  dialog.close();
                },
                onSuccess: () => {
                  delete this.data[SECURED_NOTES_STORAGE][dataId];
                  this.saveData(
                    SECURED_NOTES_STORAGE,
                    this.data[SECURED_NOTES_STORAGE]
                  );
                  removeRefIgnore(dataId);
                  removeSearchIgnore(dataId);

                  dialog.close();
                },
              },
            });
          },
        });

        const { formInstance: form, formDialog } = createFormDialog(
          this.i18n.enterPasswordLabel
        );
        form.formItemConfigs = [
          {
            ...this.passwordField,
            eventList: [
              {
                event: "keydown",
                handler: (e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    const password = this.lockedNotes[dataId];
                    if (password === form.formElements[0].value.password) {
                      delete this.lockedNotes[dataId];
                      this.saveData(this.lockedNotes);
                      removeRefIgnore(dataId);
                      removeSearchIgnore(dataId);
                      formDialog.destroy();
                    }
                  }
                },
              },
            ],
          },
        ];
      },
    });
    return;
  }

  addNotebookUnlockedContextMenu(dataId: string, event: OpenMenuDocTreeEvent) {
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
                  this.data[SECURED_NOTES_STORAGE][dataId] = password;
                  this.saveData(
                    SECURED_NOTES_STORAGE,
                    this.data[SECURED_NOTES_STORAGE]
                  );

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
    this.data[SECURED_NOTES_STORAGE] = {} as SecuredNotesStorage;
    this.data[GLOBAL_LOCK_STATE] = LockState.LOCKED;

    this.loadData(SECURED_NOTES_STORAGE).then((data: SecuredNotesStorage) => {
      this.storageService.setSecuredNotes(data);
      Logger.debug("Secured notes storage loaded", data);
    });
    this.loadData(GLOBAL_LOCK_STATE).then((data: LockState) => {
      this.storageService.setLockState(data);
      Logger.debug("Global lock state loaded", data);
    });
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

  private eventBusLog({ detail }: any) {
    Logger.debug(detail);
  }

  private addMenu(rect?: DOMRect) {
    const menu = new Menu("topBarSample", () => {
      // on close
    });

    menu.addItem({
      icon: "iconInfo",
      label: "Dialog(open help first)",
      accelerator: this.commands[0].customHotkey,
      click: () => {
        // this.showDialog();
      },
    });
    if (!this.isMobile) {
      menu.addItem({
        icon: "iconFace",
        label: "Open Custom Tab",
        click: () => {
          const tab = openTab({
            app: this.app,
            custom: {
              icon: "iconFace",
              title: "Custom Tab",
              data: {
                text: "This is my custom tab",
              },
              id: this.name + TAB_TYPE,
            },
          });
          console.log(tab);
        },
      });
      menu.addItem({
        icon: "iconImage",
        label: "Open Asset Tab(open help first)",
        click: () => {
          const tab = openTab({
            app: this.app,
            asset: {
              path: "assets/paragraph-20210512165953-ag1nib4.svg",
            },
          });
          console.log(tab);
        },
      });
      menu.addItem({
        icon: "iconFile",
        label: "Open Doc Tab(open help first)",
        click: async () => {
          const tab = await openTab({
            app: this.app,
            doc: {
              id: "20200812220555-lj3enxa",
            },
          });
          console.log(tab);
        },
      });
      menu.addItem({
        icon: "iconSearch",
        label: "Open Search Tab",
        click: () => {
          const tab = openTab({
            app: this.app,
            search: {
              k: "SiYuan",
            },
          });
          console.log(tab);
        },
      });
      menu.addItem({
        icon: "iconRiffCard",
        label: "Open Card Tab",
        click: () => {
          const tab = openTab({
            app: this.app,
            card: {
              type: "all",
            },
          });
          console.log(tab);
        },
      });
      menu.addItem({
        icon: "iconLayout",
        label: "Open Float Layer(open help first)",
        click: () => {
          this.addFloatLayer({
            ids: ["20210428212840-8rqwn5o", "20201225220955-l154bn4"],
            defIds: ["20230415111858-vgohvf3", "20200813131152-0wk5akh"],
            x: window.innerWidth - 768 - 120,
            y: 32,
          });
        },
      });
      menu.addItem({
        icon: "iconOpenWindow",
        label: "Open Doc Window(open help first)",
        click: () => {
          openWindow({
            doc: { id: "20200812220555-lj3enxa" },
          });
        },
      });
    } else {
      menu.addItem({
        icon: "iconFile",
        label: "Open Doc(open help first)",
        click: () => {
          openMobileFileById(this.app, "20200812220555-lj3enxa");
        },
      });
    }
    menu.addItem({
      icon: "iconLock",
      label: "Lockscreen",
      click: () => {
        lockScreen(this.app);
      },
    });
    menu.addItem({
      icon: "iconScrollHoriz",
      label: "Event Bus",
      type: "submenu",
      submenu: [
        {
          icon: "iconSelect",
          label: "On ws-main",
          click: () => {
            this.eventBus.on("ws-main", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off ws-main",
          click: () => {
            this.eventBus.off("ws-main", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On click-pdf",
          click: () => {
            this.eventBus.on("click-pdf", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off click-pdf",
          click: () => {
            this.eventBus.off("click-pdf", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On click-editorcontent",
          click: () => {
            this.eventBus.on("click-editorcontent", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off click-editorcontent",
          click: () => {
            this.eventBus.off("click-editorcontent", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On click-editortitleicon",
          click: () => {
            this.eventBus.on("click-editortitleicon", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off click-editortitleicon",
          click: () => {
            this.eventBus.off("click-editortitleicon", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On click-flashcard-action",
          click: () => {
            this.eventBus.on("click-flashcard-action", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off click-flashcard-action",
          click: () => {
            this.eventBus.off("click-flashcard-action", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-noneditableblock",
          click: () => {
            this.eventBus.on("open-noneditableblock", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-noneditableblock",
          click: () => {
            this.eventBus.off("open-noneditableblock", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On loaded-protyle-static",
          click: () => {
            this.eventBus.on("loaded-protyle-static", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off loaded-protyle-static",
          click: () => {
            this.eventBus.off("loaded-protyle-static", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On loaded-protyle-dynamic",
          click: () => {
            this.eventBus.on("loaded-protyle-dynamic", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off loaded-protyle-dynamic",
          click: () => {
            this.eventBus.off("loaded-protyle-dynamic", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On switch-protyle",
          click: () => {
            this.eventBus.on("switch-protyle", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off switch-protyle",
          click: () => {
            this.eventBus.off("switch-protyle", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On destroy-protyle",
          click: () => {
            this.eventBus.on("destroy-protyle", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off destroy-protyle",
          click: () => {
            this.eventBus.off("destroy-protyle", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-doctree",
          click: () => {
            this.eventBus.on("open-menu-doctree", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-doctree",
          click: () => {
            this.eventBus.off("open-menu-doctree", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-blockref",
          click: () => {
            this.eventBus.on("open-menu-blockref", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-blockref",
          click: () => {
            this.eventBus.off("open-menu-blockref", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-fileannotationref",
          click: () => {
            this.eventBus.on("open-menu-fileannotationref", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-fileannotationref",
          click: () => {
            this.eventBus.off("open-menu-fileannotationref", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-tag",
          click: () => {
            this.eventBus.on("open-menu-tag", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-tag",
          click: () => {
            this.eventBus.off("open-menu-tag", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-link",
          click: () => {
            this.eventBus.on("open-menu-link", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-link",
          click: () => {
            this.eventBus.off("open-menu-link", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-image",
          click: () => {
            this.eventBus.on("open-menu-image", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-image",
          click: () => {
            this.eventBus.off("open-menu-image", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-av",
          click: () => {
            this.eventBus.on("open-menu-av", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-av",
          click: () => {
            this.eventBus.off("open-menu-av", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-content",
          click: () => {
            this.eventBus.on("open-menu-content", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-content",
          click: () => {
            this.eventBus.off("open-menu-content", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-breadcrumbmore",
          click: () => {
            this.eventBus.on("open-menu-breadcrumbmore", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-breadcrumbmore",
          click: () => {
            this.eventBus.off("open-menu-breadcrumbmore", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-menu-inbox",
          click: () => {
            this.eventBus.on("open-menu-inbox", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-menu-inbox",
          click: () => {
            this.eventBus.off("open-menu-inbox", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On input-search",
          click: () => {
            this.eventBus.on("input-search", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off input-search",
          click: () => {
            this.eventBus.off("input-search", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-siyuan-url-plugin",
          click: () => {
            this.eventBus.on("open-siyuan-url-plugin", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-siyuan-url-plugin",
          click: () => {
            this.eventBus.off("open-siyuan-url-plugin", this.eventBusLog);
          },
        },
        {
          icon: "iconSelect",
          label: "On open-siyuan-url-block",
          click: () => {
            this.eventBus.on("open-siyuan-url-block", this.eventBusLog);
          },
        },
        {
          icon: "iconClose",
          label: "Off open-siyuan-url-block",
          click: () => {
            this.eventBus.off("open-siyuan-url-block", this.eventBusLog);
          },
        },
      ],
    });
    menu.addSeparator();
    menu.addItem({
      icon: "iconSettings",
      label: "Official Setting Dialog",
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
