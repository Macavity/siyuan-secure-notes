export class OverlayInterceptor extends 蒙层 {
    Id: string;
    private 蒙层位置: T蒙层位置;
  
    constructor(
      父元素: Cash,
      访问控制数据: {
        i18n: { [key: string]: string };
        lockedNoteData: { [key: string]: string };
        currentNotebookId: string;
        overlayPosition: T蒙层位置;
      }
    ) {
      const {
        i18n,
        lockedNoteData: 笔记数据,
        currentNotebookId: 当前id,
        overlayPosition: 蒙层位置,
      } = 访问控制数据;
      super(父元素);
  
      this.Id = 当前id;
      this.蒙层位置 = 蒙层位置;
  
      this.蒙层.css({ backdropFilter: "blur(15px)", zIndex: 拦截蒙层zIndex });
      this.蒙层.data("蒙层位置", 蒙层位置);
      this.蒙层.data("蒙层id", 当前id);
  
      // 添加引用和搜索忽略
      addRefIgnore(当前id);
      addSearchIgnore(当前id);
  
      this.蒙层.on("click", (event) => {
        event.stopPropagation();
        const { 表单, 对话框 } = 表单对话框(i18n.请输入密码);
        表单.配置 = [
          {
            fieldName: "password",
            fieldType: "password",
            label: i18n.密码,
            tip: i18n.请输入密码,
            placeholder: i18n.请输入密码,
            eventList: [
              {
                event: "keydown",
                handler: (e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    const password = 表单.所有项[0].value.password;
                    if (笔记数据[当前id] === password) {
                      this.父元素.removeClass("note-book-Locker-locked");
                      对话框.destroy();
                      this.destroy();
                      // 解除引用和搜索忽略
                      removeRefIgnore(当前id);
                      removeSearchIgnore(当前id);
                    } else {
                      表单.所有项[0].input.val("");
                      表单.所有项[0].tip.text(i18n.密码错误);
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
      const 蒙层位置 = this.蒙层位置;
  
      const 行为选择: {
        [key: string]: () => void;
      } = {
        目录: () => {
          $("[data-蒙层id]").each((i, e) => {
            $(e).data("蒙层id") === this.Id && $(e).remove();
          });
        },
  
        页签: () => {
          $("[data-蒙层id]").each((i, e) => {
            $(e).data("蒙层id") === this.Id &&
              $(e).data("蒙层位置") !== "目录" &&
              $(e).remove();
          });
        },
        内容区: () => {
          $("[data-蒙层id]").each((i, e) => {
            $(e).data("蒙层id") === this.Id &&
              $(e).data("蒙层位置") !== "目录" &&
              $(e).remove();
          });
        },
      };
  
      行为选择[蒙层位置]();
    }
  }