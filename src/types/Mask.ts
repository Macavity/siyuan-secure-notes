export interface IEventConfig {
  event: string;
  handler: (e: any) => void;
}

export class Mask {
  overlayElement: HTMLElement = document.createElement("div");
  eventConfigurations: IEventConfig[];

  constructor(
    public container: HTMLElement,
    option?: {
      eventConfigurations?: IEventConfig[];
      style?: Partial<CSSStyleDeclaration>;
      data?: { [key: string]: any };
    }
  ) {
    const { eventConfigurations, style } = option ?? {};
    this.container = container;
    this.container.css("position", "relative");

    this.container.append(this.overlayElement);

    this.overlayElement.style({
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
        this.overlayElement.on(item.event, item.handler);
      });

    // 添加data
    this.overlayElement.data(option?.data);
  }

  on(event: HTMLElementEventMap | string, handler: (e: Event) => void) {
    this.overlayElement.on(event as any, handler);
  }

  destroy() {
    this.overlayElement.remove();
  }
}
