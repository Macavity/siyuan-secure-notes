import { Logger } from "@/libs/logger";
import { StorageService, storageService } from "./StorageService";
import { SecuredNotesStorage } from "@/types/SecuredNotesStorage";
import { sql } from "@/api";
import { IWebSocketData } from "siyuan";

const currentEditorSelector = ".protyle:not(.fn__none)";
const wysiwygSelector = ".protyle-wysiwyg.protyle-wysiwyg--attr";

export type TOverlayPosition = "directory" | "tab" | "content";

export class LockService {
  private static _lockedNotes: SecuredNotesStorage = {};
  private storageService: StorageService;

  constructor() {
    this.storageService = storageService;
  }

  public static get lockedNotes(): SecuredNotesStorage {
    return LockService._lockedNotes;
  }
  public static set lockedNotes(value: SecuredNotesStorage) {
    LockService._lockedNotes = value;
  }

  public traverseAndLock() {
    this.traverseAndLockNotebooks();
    // this.traverseAndLockTabs();
  }

  private traverseAndLockNotebooks() {
    const notebookElements = document.querySelectorAll(
      ".layout-tab-container [data-url]"
    );
    // const closedNotebookSelector = document.querySelectorAll(
    //   "li.b3-list-item.b3-list-item--hide-action[data-type='open']"
    // );
    notebookElements.forEach(async (notebook: HTMLElement) => {
      const dataId = notebook.dataset.url;

      if (!this.isNotebookLocked(dataId)) return;

        this.createLockOverlay(
          document.querySelectorAll(notebook),
          dataId,
          "directory"
        );
    });
  }

  private likeQuery(query: string, param?: any): Promise<IWebSocketData> {
    return sql<IWebSocketData>(
      `SELECT * FROM blocks WHERE id LIKE'%${query}%' LIMIT 7`
    );
  }

  private async traverseAndLockTabs() {
    const openTabs = document.querySelectorAll("[data-type=tab-header]");

    document
      .querySelectorAll(wysiwygSelector)
      .children("[data-node-index]")
      .first()
      .data("nodeId");

    await this.likeQuery().then(({ data }) => {
      // BUG: 有时候会获取不到当前页签的笔记本id
      const 当前页签的笔记本id = data?.[0]?.box;

      const notebookTabs: {
        notebookElement: HTMLElement;
        id: string;
        蒙层位置: TOverlayPosition;
      }[] = [];

      openTabs.each((_index, 页签) => {
        if ($(页签).hasClass("item--focus")) {
          notebookTabs.push({
            notebookElement: $(页签),
            id: 当前页签的笔记本id,
            蒙层位置: "页签",
          });
          return;
        }
        notebookTabs.push({
          notebookElement: $(页签),
          id: $(页签).data("initdata")?.notebookId,
          蒙层位置: "页签",
        });
      });

      notebookTabs.push({
        notebookElement: $(".layout-tab-container").children(".protyle"),
        id: 当前页签的笔记本id,
        蒙层位置: "内容区",
      });

      notebookTabs.forEach((item) => {
        if (this.isNotebookLocked(页签.id)) {
          const { notebookElement, id, 蒙层位置 } = item;
          // this.createLockOverlay(根元素, id, 蒙层位置);
        }
      });
    });
  }

  private static createLockOverlay(
    containerElement: HTMLElement,
    currentNotebookId: string,
    overlayPosition: TOverlayPosition
  ) {
    if (containerElement.hasClass("note-book-Locker-locked")) return;

    containerElement.addClass("note-book-Locker-locked");
    new OverlayInterceptor($(containerElement), {
      i18n: this.i18n,
      lockedNoteData: this.lockedNotes,
      currentNotebookId: currentNotebookId,
      overlayPosition: overlayPosition,
    });
  }

  private isNotebookLocked(notebookId: string) {
    if (!notebookId) return false;
    const lockedNotes = this.storageService.getSecuredNotesStorage();

    Logger.log("isNotebookLocked", notebookId, lockedNotes[notebookId]);

    return lockedNotes[notebookId] !== undefined;
  }
}
