import UnlockNotebookDialog from "@/components/UnlockNotebookDialog.svelte";
import $, { Cash } from "cash-dom";
import {
  addRefIgnore,
  addSearchIgnore,
  removeRefIgnore,
  removeSearchIgnore,
} from "../api/searchIgnore";
import { Mask } from "@/types/Mask";
import { I18N } from "@/types/i18n";
import { svelteDialog } from "@/libs/dialog";
import { isMobile } from "@/utils/isMobile";

/** @deprecated */
export type TOverlayPosition =
  | OverlayPosition.Directory
  | OverlayPosition.Tab
  | OverlayPosition.Content;

export enum OverlayPosition {
  Directory = "Directory",
  Tab = "Tab",
  Content = "Content",
}

export const NotebookLockedClass = "secure-notes--locked";

export class OverlayInterceptor extends Mask {
  constructor(
    containerElement: Cash,
    private i18n: I18N,
    lockedNoteData: { [key: string]: string },
    private currentNotebookId: string,
    private overlayPosition: OverlayPosition
  ) {
    super(containerElement);

    this.overlayPosition = overlayPosition;

    this.Mask.css({ backdropFilter: "blur(15px)", zIndex: 5 });
    this.Mask.data("overlayPosition", overlayPosition);
    this.Mask.data("currentNotebookId", currentNotebookId);

    addRefIgnore(currentNotebookId);
    addSearchIgnore(currentNotebookId);

    this.Mask.on("click", (event) => {
      event.stopPropagation();

      const dialog = svelteDialog({
        title: this.i18n.enterPasswordLabel,
        width: isMobile() ? "92vw" : "720px",
        constructor: (container: HTMLElement) => {
          return new UnlockNotebookDialog({
            target: container,
            props: {
              i18n,
              currentPassword: lockedNoteData[currentNotebookId],
              onClose: () => {
                dialog.close();
              },
              onSuccess: () => {
                this.parentElement.removeClass(NotebookLockedClass);
                this.destroy();
                dialog.close();

                removeRefIgnore(currentNotebookId);
                removeSearchIgnore(currentNotebookId);
              },
            },
          });
        },
      });
    });
  }

  destroy(): void {
    const overlayPosition = this.overlayPosition;

    switch (overlayPosition) {
      case OverlayPosition.Directory:
        $("[data-current-notebook-id]").each((_, e) => {
          $(e).data("currentNotebookId") === this.currentNotebookId &&
            $(e).remove();
        });
        break;
      case OverlayPosition.Tab:
        $("[data-current-notebook-id]").each((_, e) => {
          $(e).data("currentNotebookId") === this.currentNotebookId &&
            $(e).data("overlayPosition") !== OverlayPosition.Directory &&
            $(e).remove();
        });
        break;
      case OverlayPosition.Content:
        $("[data-current-notebook-id]").each((_, e) => {
          $(e).data("currentNotebookId") === this.currentNotebookId &&
            $(e).data("overlayPosition") !== OverlayPosition.Directory &&
            $(e).remove();
        });
        break;
    }
  }
}
