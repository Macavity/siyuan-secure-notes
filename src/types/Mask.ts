import $, { Cash } from "cash-dom";
import { IEventConfig } from "./FormItem";

// Mask
export class Mask {
  parentElement: Cash;
  Mask: Cash = $(document.createElement("div"));
  eventConfigurations: IEventConfig[];

  constructor(
    parentElement: Cash,
    option?: {
      eventConfigurations?: IEventConfig[];
      style?: Partial<CSSStyleDeclaration>;
      data?: { [key: string]: any };
    }
  ) {
    const { eventConfigurations, style } = option ?? {};
    this.parentElement = parentElement;
    this.parentElement.css("position", "relative");

    this.parentElement.append(this.Mask);

    this.Mask.css({
      backdropFilter: "blur(5px)",
      zIndex: "1",
      ...style,
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      cursor: "not-allowed",
    } as any);

    eventConfigurations &&
      eventConfigurations.forEach((item) => {
        this.Mask.on(item.event, item.handler);
      });

    // 添加data
    this.Mask.data(option?.data);
  }

  on(event: HTMLElementEventMap | string, handler: (e: Event) => void) {
    this.Mask.on(event as any, handler);
  }

  destroy() {
    this.Mask.remove();
  }
}
