import { EventMenu } from "siyuan";

export enum SiyuanEvents {
  WS_MAIN = "ws-main",
  CLICK_BLOCKICON = "click-blockicon",
  CLICK_PDF = "click-pdf",
  CLICK_EDITORCONTENT = "click-editorcontent",
  CLICK_EDITORTITLEICON = "click-editortitleicon",
  CLICK_FLASHCARD_ACTION = "click-flashcard-action",
  OPEN_NONEDITABLEBLOCK = "open-noneditableblock",
  LOADED_PROTYLE_STATIC = "loaded-protyle-static",
  LOADED_PROTYLE_DYNAMIC = "loaded-protyle-dynamic",
  SWITCH_PROTYLE = "switch-protyle",
  DESTROY_PROTYLE = "destroy-protyle",
  OPEN_MENU_DOCTREE = "open-menu-doctree",
  OPEN_MENU_BLOCKREF = "open-menu-blockref",
  OPEN_MENU_FILEANNOTATIONREF = "open-menu-fileannotationref",
  OPEN_MENU_TAG = "open-menu-tag",
  OPEN_MENU_LINK = "open-menu-link",
  OPEN_MENU_IMAGE = "open-menu-image",
  OPEN_MENU_AV = "open-menu-av",
  OPEN_MENU_CONTENT = "open-menu-content",
  OPEN_MENU_BREADCRUMBMORE = "open-menu-breadcrumbmore",
  OPEN_MENU_INBOX = "open-menu-inbox",
  INPUT_SEARCH = "input-search",
  PASTE = "paste",
  OPEN_SIYUAN_URL_PLUGIN = "open-siyuan-url-plugin",
  OPEN_SIYUAN_URL_BLOCK = "open-siyuan-url-block",
}

export type OpenMenuDocTreeEvent = CustomEvent<{
  menu: EventMenu;
  elements: NodeListOf<HTMLElement>;
  type: "doc" | "docs" | "notebook";
}>;