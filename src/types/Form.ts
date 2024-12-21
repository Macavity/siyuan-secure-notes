import $, { Cash } from "cash-dom";
import { FormItem, IFormItemConfig } from "./FormItem";

export class Form {
  formContainer = $(document.createElement("div"));
  private _formItemConfigs: IFormItemConfig[] = [];
  private _formElements: FormItem[] = [];

  constructor(formItemConfigs: IFormItemConfig[], parentElement?: Cash) {
    if (parentElement) {
      parentElement.append(this.formContainer);
    }

    this.formContainer.addClass("form");
    this.formContainer.css({
      width: "100%",
      height: "100%",
    });

    this._formItemConfigs = formItemConfigs;
    this._formItemConfigs.forEach((item) => {
      this._formElements.push(new FormItem(this, item));
    });
  }

  set formItemConfigs(formItemConfigs: IFormItemConfig[]) {
    this.destroyAllFormItems();
    this._formElements = [];
    this._formItemConfigs = formItemConfigs;
    this._formItemConfigs.forEach((item) => {
      this._formElements.push(new FormItem(this, item));
    });
  }

  get formItemConfigs() {
    return this._formItemConfigs;
  }

  get formElements() {
    return this._formElements;
  }

  get collectFormValues() {
    return this._formElements.reduce((acc, cur) => {
      return {
        ...acc,
        ...cur.value,
      };
    }, {});
  }

  destroyForm() {
    this.formContainer.remove();
  }

  destroyAllFormItems() {
    this._formElements.forEach((item) => {
      item.destroyItem();
    });
  }
}
