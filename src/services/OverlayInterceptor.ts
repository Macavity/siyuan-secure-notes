import $, { Cash } from "cash-dom";
import {
  addRefIgnore,
  addSearchIgnore,
  removeRefIgnore,
  removeSearchIgnore,
} from "../api/searchIgnore";
import UnlockNotebookDialog from "@/components/UnlockNotebookDialog.svelte";
import Mask from "@/components/Mask.svelte";
import { I18N } from "@/types/i18n";
import { svelteDialog } from "@/libs/dialog";
import { storageService } from "./StorageService";

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

export class OverlayInterceptor {
  private maskComponent: Mask;

  constructor(
    containerElement: Cash,
    private i18n: I18N,
    private notebookId: string,
    private overlayPosition: OverlayPosition
  ) {
    containerElement.addClass(NotebookLockedClass);

    this.maskComponent = new Mask({
      target: containerElement.get(0),
      props: {
        parentElement: containerElement,
        overlayPosition,
        notebookId,
        onClick: (event: Event) => {
          event.stopPropagation();

          const dialog = svelteDialog({
            title: this.i18n.enterPasswordLabel,
            constructor: (container: HTMLElement) => {
              return new UnlockNotebookDialog({
                target: container,
                props: {
                  i18n,
                  notebookId: notebookId,
                  onClose: () => {
                    dialog.close();
                  },
                  onSuccess: () => {
                    this.removeOverlays();
                    containerElement.removeClass(NotebookLockedClass);
                    dialog.close();

                    removeRefIgnore(notebookId);
                    removeSearchIgnore(notebookId);
                  },
                },
              });
            },
          });
        },
      },
    });

    this.overlayPosition = overlayPosition;

    addRefIgnore(notebookId);
    addSearchIgnore(notebookId);
  }

  removeOverlays(): void {
    const overlayPosition = this.overlayPosition;

    switch (overlayPosition) {
      case OverlayPosition.Directory:
        this.maskComponent.$destroy();
        $("[data-notebook-id]").each((_, e) => {
          const match = $(e).data("notebookId") === this.notebookId;
          if (match) $(e).remove();
        });
        break;
      case OverlayPosition.Tab:
        $("[data-notebook-id]").each((_, e) => {
          $(e).data("notebookId") === this.notebookId &&
            $(e).data("overlayPosition") !== OverlayPosition.Directory &&
            $(e).remove();
        });
        break;
      case OverlayPosition.Content:
        $("[data-notebook-id]").each((_, e) => {
          $(e).data("notebookId") === this.notebookId &&
            $(e).data("overlayPosition") !== OverlayPosition.Directory &&
            $(e).remove();
        });
        break;
    }
  }
}
