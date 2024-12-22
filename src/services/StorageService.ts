import { NodeIcons } from "./../libs/const";
import { getFile, putFile } from "@/api";
import { Logger } from "@/libs/logger";
import { LockState } from "@/types/LockState";
import { SecuredNotesStorage } from "@/types/SecuredNotesStorage";

export const SECURED_NOTES_STORAGE = "secured-notes";
export const GLOBAL_LOCK_STATE = "lock-state";

export class StorageService {
  private static instance: StorageService;
  private securedNotes: SecuredNotesStorage = {};
  private lockState: LockState = LockState.LOCKED;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public async fetchSecuredNotes() {
    return getFile(
      `/data/storage/petal/siyuan-secure-notes/${SECURED_NOTES_STORAGE}`
    ).then((data) => {
      this.securedNotes = data;
    });
  }

  public saveSecuredNotes(data: SecuredNotesStorage) {
    Logger.log("saveSecuredNotes", data);
    this.securedNotes = data;
    let file = new File(
      [
        new Blob([JSON.stringify(data)], {
          type: "application/json",
        }),
      ],
      SECURED_NOTES_STORAGE
    );
    return putFile(
      `/data/storage/petal/siyuan-secure-notes/${SECURED_NOTES_STORAGE}`,
      false,
      file
    );
  }

  public getSecuredNotes(): SecuredNotesStorage {
    return this.securedNotes;
  }

  public getLockState(): LockState {
    return this.lockState;
  }

  public setLockState(state: LockState): void {
    this.lockState = state;
  }

  public getPassword(notebookId: string): string {
    return this.securedNotes[notebookId];
  }

  public secureNotebook(notebookId: string, password: string) {
    this.securedNotes[notebookId] = password;

    return this.saveSecuredNotes(this.securedNotes);
  }

  public removeLock(notebookId: string) {
    delete this.securedNotes[notebookId];

    return this.saveSecuredNotes(this.securedNotes);
  }

  public isNotebookSecured(notebookId: string): boolean {
    return this.securedNotes.hasOwnProperty(notebookId);
  }
}

export const storageService = StorageService.getInstance();
