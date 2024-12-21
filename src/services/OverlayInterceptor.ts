import $, { Cash } from "cash-dom";
import {
  addRefIgnore,
  addSearchIgnore,
  removeRefIgnore,
  removeSearchIgnore,
} from "../api/searchIgnore";
import { createFormDialog } from "../components/FormDialog";
import { Mask } from "@/types/Mask";
import { I18N } from "@/types/i18n";

/** @deprecated */
export type TOverlayPosition =
  | OverlayPosition.Directory
  | OverlayPosition.Tab
  | OverlayPosition.Content;

export enum OverlayPosition {
  Directory = "目录",
  Tab = "页签",
  Content = "内容区",
}

export const NotebookLockedClass = "note-book-Locker-locked";

export class OverlayInterceptor extends Mask {
  Id: string;
  private overlayPosition: OverlayPosition;

  constructor(
    containerElement: Cash,
    overlayAccessInfo: {
      i18n: I18N;
      lockedNoteData: { [key: string]: string };
      currentNotebookId: string;
      overlayPosition: OverlayPosition;
    }
  ) {
    const { i18n, lockedNoteData, currentNotebookId, overlayPosition } =
      overlayAccessInfo;
    super(containerElement);

    this.Id = currentNotebookId;
    this.overlayPosition = overlayPosition;

    this.Mask.css({ backdropFilter: "blur(15px)", zIndex: 5 });
    this.Mask.data("overlayPosition", overlayPosition);
    this.Mask.data("currentNotebookId", currentNotebookId);

    addRefIgnore(currentNotebookId);
    addSearchIgnore(currentNotebookId);

    this.Mask.on("click", (event) => {
      event.stopPropagation();
      const { form, formDialog } = createFormDialog(i18n.enterPasswordLabel);
      form.formItemConfigs = [
        {
          fieldName: "password",
          fieldType: "password",
          label: i18n.password,
          tip: i18n.enterPasswordLabel,
          placeholder: i18n.enterPasswordLabel,
          eventList: [
            {
              event: "keydown",
              handler: (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  const password = form.formElements[0].value.password;
                  if (lockedNoteData[currentNotebookId] === password) {
                    this.parentElement.removeClass(NotebookLockedClass);
                    formDialog.destroy();
                    this.destroy();

                    removeRefIgnore(currentNotebookId);
                    removeSearchIgnore(currentNotebookId);
                  } else {
                    form.formElements[0].input.val("");
                    form.formElements[0].tip.text(i18n.passwordWrong);
                  }
                }
              },
            },
          ],
        },
      ];
    });
  }

  destroy(): void {
    const overlayPosition = this.overlayPosition;

    const overlayActions: {
      [key: string]: () => void;
    } = {
      [OverlayPosition.Directory]: () => {
        $("[data-currentNotebookId]").each((_, e) => {
          $(e).data("currentNotebookId") === this.Id && $(e).remove();
        });
      },
      [OverlayPosition.Tab]: () => {
        $("[data-currentNotebookId]").each((_, e) => {
          $(e).data("currentNotebookId") === this.Id &&
            $(e).data("overlayPosition") !== OverlayPosition.Directory &&
            $(e).remove();
        });
      },
      [OverlayPosition.Content]: () => {
        $("[data-currentNotebookId]").each((_, e) => {
          $(e).data("currentNotebookId") === this.Id &&
            $(e).data("overlayPosition") !== OverlayPosition.Directory &&
            $(e).remove();
        });
      },
    };

    overlayActions[overlayPosition]();
  }
}
