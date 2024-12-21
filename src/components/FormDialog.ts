import { Dialog } from "siyuan";
import $ from "cash-dom";
import { Form } from "@/types/Form";

function createDialog(dialogTitle: string) {
  const formDialog = new Dialog({
    title: dialogTitle,
    content: "",
    width: "600px",
    height: "400px",
    hideCloseIcon: true,
  });
  const $dialogBody = $(".b3-dialog__body", formDialog.element);
  return {
    formDialog: formDialog,
    $dialogBody: $dialogBody,
  };
}

export function createFormDialog(dialogTitle: string) {
  const { formDialog, $dialogBody } = createDialog(dialogTitle);
  const formInstance = new Form([], $dialogBody);

  return {
    formDialog,
    formInstance,
  };
}
