import { StorageService, storageService } from "./StorageService";
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

  constructor() {}

  static onLoad(i18n: any) {
    this.i18n = i18n;
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

          if (storageService.isNotebookSecured(dataId)) {
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

  static traverseAndLockNotes() {
    this.traverseAndLockNotebooks();
    this.traverseAndLockTabs();
  }

  private static traverseAndLockNotebooks() {
    console.log("traverseAndLockNotebooks");
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

      if (!storageService.isNotebookSecured(dataId)) return;

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
        if (storageService.isNotebookSecured(tabItem.id)) {
          const { tabElement, id, overlayPosition } = tabItem;
          this.createLockOverlay(tabElement, id, overlayPosition);
        }
      });
    });
  }

  static unlockAll() {
    Logger.debug("unlockAll");
    const lockedContainers = document.querySelectorAll(
      `.${NotebookLockedClass}`
    );
    lockedContainers.forEach((container) => {
      container.classList.remove(NotebookLockedClass);
    });
    const overlays = document.querySelectorAll(".secure-notes-mask");
    overlays.forEach((overlay) => overlay.remove());
  }

  // Does not lock the currently open document
  static lockNotebookTabs(notebookId: string) {
    const tabElements = $("ul.layout-tab-bar").children("li[data-type]");

    tabElements.each((_index, tabElement) => {
      const comparisonId = $(tabElement).data("initdata")?.notebookId;
      if (comparisonId !== notebookId) return;

      this.createLockOverlay($(tabElement), notebookId, OverlayPosition.Tab);
    });
  }

  static createLockOverlay(
    containerElement: Cash,
    notebookId: string,
    overlayPosition: OverlayPosition
  ) {
    if (containerElement.hasClass(NotebookLockedClass)) return;
    // Logger.debug(
    //   "createLockOverlay",
    //   containerElement,
    //   notebookId,
    //   overlayPosition
    // );
    new OverlayInterceptor(
      containerElement,
      this.i18n,
      notebookId,
      overlayPosition
    );
  }

  // private static isNotebookLocked(notebookId: string) {
  //   if (!notebookId) return false;

  //   const lockedNotes = storageService.getSecuredNotes();

  //   return lockedNotes[notebookId] !== undefined;
  // }
}
