import $, { Cash } from "cash-dom";
import {
  EventMenu,
  IMenuBaseDetail,
  IMenuItemOption,
  IWebSocketData,
} from "siyuan";
import { createFormDialog } from "../components/FormDialog";
import { IFormItemConfig } from "@/types/FormItem";
import { sleep } from "@/utils/sleep";
import { Logger } from "@/libs/logger";
import { I18N } from "@/types/i18n";
import {
  NotebookLockedClass,
  OverlayInterceptor,
  OverlayPosition,
  TOverlayPosition,
} from "./OverlayInterceptor";
import { removeRefIgnore, removeSearchIgnore } from "@/api/searchIgnore";
import { likeQuery } from "@/api/SQL";
import { OpenMenuDocTreeEvent } from "@/types/SiyuanEvents";

const currentActiveEditorSelector =
  ".layout-tab-container .protyle:not(.fn__none)";
const editorContentSelector = ".protyle-wysiwyg.protyle-wysiwyg--attr";

export class LockNotebookService {
  static i18n: I18N;

  static passwordField: IFormItemConfig;
  static confirmPasswordField: IFormItemConfig;
  static lockedNotes: {
    [key: string]: string;
  } = {};

  static getData: () => Promise<any>;
  static saveData: (value: any) => Promise<void>;

  //#region 生命周期
  static onLoad(
    getData: () => Promise<any>,
    saveData: (value: any) => Promise<void>,
    i18n: any
  ) {
    this.i18n = i18n;
    this.getData = getData;
    this.saveData = saveData;

    this.passwordField = {
      fieldName: "password",
      fieldType: "password",
      label: i18n.password,
      tip: i18n.enterPasswordLabel,
      placeholder: i18n.enterPasswordLabel,
    };

    this.confirmPasswordField = {
      fieldName: "confirmPassword",
      fieldType: "password",
      label: i18n.confirmPassword,
      tip: i18n.repeatPasswordLabel,
      placeholder: i18n.repeatPasswordLabel,
    };

    this.getData().then((data: any) => {
      this.lockedNotes = data;
    });
  }

  static onLayoutReady() {
    this.traverseAndLockNotes();
  }

  static onOpenMenuDocTree(event: OpenMenuDocTreeEvent) {
    Logger.info("onOpenMenuDocTree", event);
    const detail = event.detail;
    const $element = $(event.detail.elements[0]);
    const type = detail.type;
    if (type !== "notebook") return;

    const dataId = $element.parent().data("url") || $element.data("nodeId");

    if (this.isNotebookLocked(dataId)) {
      this.handleLockedNotebookMenu($element, dataId, detail);
      return;
    }

    Logger.info("Notebook not locked.");
    const setPasswordMenuItem: IMenuItemOption = {
      iconHTML: "",
      label: this.i18n.setPasswordMenuItem,
      click: () => {
        const { formInstance: form, formDialog } = createFormDialog(
          this.i18n.setPasswordMenuItem
        );
        const KeyDownEvent = {
          event: "keydown",
          handler: (e: KeyboardEvent) => {
            if (e.key === "Enter") {
              const password = form.formElements[0].value.password as string;
              const confirmPassword =
                form.formElements[1].value.confirmPassword;

              if (password !== confirmPassword) {
                form.formElements[1].input.val("");
                form.formElements[1].tip.text(
                  this.i18n.repeatPasswordNotMatching
                );
              } else {
                this.lockedNotes[dataId] = password;
                this.saveData(this.lockedNotes);

                this.createLockOverlay(
                  $element.parent(),
                  dataId,
                  OverlayPosition.Directory
                );
                this.lockNotebookTabs(dataId);
                formDialog.destroy();
              }
            }
          },
        };
        form.formItemConfigs = [
          this.passwordField,
          {
            ...this.confirmPasswordField,
            eventList: [KeyDownEvent],
          },
        ];
      },
    };

    event.detail.menu.addItem(setPasswordMenuItem);
  }

  static handleLockedNotebookMenu(
    $element: Cash,
    dataId: string,
    detail: {
      menu: EventMenu;
      elements: NodeListOf<HTMLElement>;
      type: "doc" | "docs" | "notebook";
    }
  ) {
    Logger.info("notebook is locked");
    detail.menu.addItem({
      iconHTML: "",
      label: this.i18n.secureNotes,
      click: () => {
        this.createLockOverlay(
          $element.parent(),
          dataId,
          OverlayPosition.Directory
        );
        this.lockNotebookTabs(dataId);
      },
    });

    detail.menu.addItem({
      iconHTML: "",
      label: this.i18n.removeLock,
      click: () => {
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

  static async showContentMenu(event: CustomEvent<IMenuBaseDetail>) {
    Logger.log("showContentMenu", event);
    const detail = event.detail;

    const currentEditorPrimaryNote = $(currentActiveEditorSelector)
      .find(".protyle-content " + editorContentSelector)
      .children("[data-node-index]");

    detail.menu.addItem({
      iconHTML: "",
      label: this.i18n.secureNotes,
      click: () => {
        likeQuery(currentEditorPrimaryNote.data("nodeId")).then(({ data }) => {
          const dataId = data[0].box;

          if (this.isNotebookLocked(dataId)) {
            this.createLockOverlay(
              $(currentActiveEditorSelector),
              dataId,
              OverlayPosition.Content
            );
            this.createLockOverlay(
              $(".layout-tab-bar").find("li.item--focus"),
              dataId,
              OverlayPosition.Tab
            );
          }
        });
      },
    });
  }

  // TODO Clarify when this is called
  static async onWSMain(event: CustomEvent<IWebSocketData>) {
    if (event.detail?.data?.box) {
      Logger.debug("onWSMain", event.detail);
      const isNotebookOpen = event.detail?.data?.existed === false;
      const isDocumentCreateOrRename = Boolean(event.detail?.data?.id);

      if (isNotebookOpen || isDocumentCreateOrRename) return "不上锁";
      await sleep(100);
      this.traverseAndLockNotes();
    }
  }

  private static traverseAndLockNotes() {
    this.traverseAndLockNotebooks();
    this.traverseAndLockTabs();
  }

  private static traverseAndLockNotebooks() {
    const notebookElements = $("ul.b3-list[data-url]");
    const closedNotebooks = $(
      "li.b3-list-item.b3-list-item--hide-action[data-type='open']"
    );
    const allNotebooks = notebookElements.add(closedNotebooks);

    allNotebooks.each(async (_index, notebook) => {
      const dataId = notebook.dataset.url;

      // const notes = $("ul", notebook).children("li");

      // notes.each((_index, note) => {
      //   const dataId = $(note).data("nodeId");
      //   if (!this.已设置锁吗(dataId)) return;

      //   this.lockNotebook($(note), dataId);
      // });

      if (!this.isNotebookLocked(dataId)) return;

      this.createLockOverlay($(notebook), dataId, OverlayPosition.Directory);
    });
  }

  private static async traverseAndLockTabs() {
    const openTabs = $("ul.layout-tab-bar").children("li[data-type]");

    await sleep(300);
    await likeQuery(
      $(editorContentSelector)
        .children("[data-node-index]")
        .first()
        .data("nodeId")
    ).then(({ data }) => {
      // BUG: Sometimes you can't get the notebook id of the current tab.
      const currentTabNotebookId = data?.[0]?.box;

      const tabEntries: {
        tabElement: Cash;
        id: string;
        overlayPosition: TOverlayPosition;
      }[] = [];

      openTabs.each((_index, tabElement) => {
        if ($(tabElement).hasClass("item--focus")) {
          tabEntries.push({
            tabElement: $(tabElement),
            id: currentTabNotebookId,
            overlayPosition: OverlayPosition.Tab,
          });
          return;
        }
        tabEntries.push({
          tabElement: $(tabElement),
          id: $(tabElement).data("initdata")?.notebookId,
          overlayPosition: OverlayPosition.Tab,
        });
      });

      tabEntries.push({
        tabElement: $(".layout-tab-container").children(".protyle"),
        id: currentTabNotebookId,
        overlayPosition: OverlayPosition.Content,
      });

      tabEntries.forEach((tabItem) => {
        if (this.isNotebookLocked(tabItem.id)) {
          const { tabElement, id, overlayPosition } = tabItem;
          this.createLockOverlay(tabElement, id, overlayPosition);
        }
      });
    });
  }

  // Does not lock the currently open document
  static lockNotebookTabs(notebookId: string) {
    const tabElements = $("ul.layout-tab-bar").children("li[data-type]");

    tabElements.each((_index, tabElement) => {
      const notebookId = $(tabElement).data("initdata")?.notebookId;
      if (notebookId !== notebookId) return;

      this.createLockOverlay($(tabElement), notebookId, OverlayPosition.Tab);
    });
  }

  static createLockOverlay(
    containerElement: Cash,
    currentNotebookId: string,
    overlayPosition: TOverlayPosition
  ) {
    if (containerElement.hasClass(NotebookLockedClass)) return;

    containerElement.addClass(NotebookLockedClass);
    new OverlayInterceptor($(containerElement), {
      i18n: this.i18n,
      lockedNoteData: this.lockedNotes,
      currentNotebookId: currentNotebookId,
      overlayPosition: overlayPosition,
    });
  }

  private static isNotebookLocked(notebookId: string) {
    if (!notebookId) return false;
    return this.lockedNotes[notebookId] !== undefined;
  }
}
