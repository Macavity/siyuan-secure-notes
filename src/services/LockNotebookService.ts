import $, { Cash } from "cash-dom";
import { IMenuBaseDetail, IWebSocketData } from "siyuan";
import { sleep } from "@/utils/sleep";
import { Logger } from "@/libs/logger";
import { I18N } from "@/types/i18n";
import {
  NotebookLockedClass,
  OverlayInterceptor,
  OverlayPosition,
} from "./OverlayInterceptor";
import { likeQuery } from "@/api/SQL";

const currentActiveEditorSelector =
  ".layout-tab-container .protyle:not(.fn__none)";
const editorContentSelector = ".protyle-wysiwyg.protyle-wysiwyg--attr";

export class LockNotebookService {
  static i18n: I18N;

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

    this.getData().then((data: any) => {
      this.lockedNotes = data;
    });
  }

  static onLayoutReady() {
    this.traverseAndLockNotes();
  }

  static async showContentMenu(event: CustomEvent<IMenuBaseDetail>) {
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
      Logger.debug(
        "traverseAndLockTabs - currentTabNotebookId",
        currentTabNotebookId
      );

      const tabEntries: {
        tabElement: Cash;
        id: string;
        overlayPosition: OverlayPosition;
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
    overlayPosition: OverlayPosition
  ) {
    if (containerElement.hasClass(NotebookLockedClass)) return;

    console.log(
      "createLockOverlay",
      containerElement,
      currentNotebookId,
      overlayPosition
    );

    containerElement.addClass(NotebookLockedClass);

    new OverlayInterceptor(
      $(containerElement),
      this.i18n,
      this.lockedNotes,
      currentNotebookId,
      overlayPosition
    );
  }

  private static isNotebookLocked(notebookId: string) {
    if (!notebookId) return false;
    return this.lockedNotes[notebookId] !== undefined;
  }
}
