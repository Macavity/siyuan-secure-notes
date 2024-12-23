import { getFile, putFile } from "@/api";
import { Logger } from "@/libs/logger";
import { LockState } from "@/types/LockState";
import { SecuredNotesStorage } from "@/types/SecuredNotesStorage";
import { generateSalt, hashPassword } from "@/utils/crypto";

export const SECURED_NOTES_STORAGE = "secured-notes";
export const GLOBAL_LOCK_STATE = "lock-state";
export const SALT_STORAGE = "salt";

export function getStoragePath(path: string) {
  return `/data/storage/petal/siyuan-secure-notes/${path}`;
}

export class StorageService {
  private static instance: StorageService;
  private securedNotes: SecuredNotesStorage = {};
  private lockState: LockState = LockState.LOCKED;
  private salt: string | null;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public async initSalt() {
    await this.fetchSalt();

    if (!this.salt) {
      this.salt = generateSalt();
      this.saveSalt();
    }
  }

  public async fetchSalt() {
    return getFile(getStoragePath(SALT_STORAGE)).then((data) => {
      if (data.code === 404) {
        return null;
      }
      return (this.salt = data);
    });
  }

  public async saveSalt() {
    let file = new File(
      [
        new Blob([this.salt], {
          type: "application/json",
        }),
      ],
      SALT_STORAGE
    );
    Logger.debug("saveSalt", this.salt);
    return putFile(getStoragePath(SALT_STORAGE), false, file);
  }

  public async fetchSecuredNotes() {
    return getFile(getStoragePath(SECURED_NOTES_STORAGE)).then((data) => {
      console.log("fetchSecuredNotes", data);
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

  public async verifyPassword(
    notebookId: string,
    password: string
  ): Promise<boolean> {
    const hash = await hashPassword(password, this.salt);
    Logger.debug(
      "verifyPassword",
      notebookId,
      this.securedNotes[notebookId],
      hash
    );
    return this.securedNotes[notebookId] === hash;
  }

  public getPassword(notebookId: string): string {
    return this.securedNotes[notebookId];
  }

  public async secureNotebook(notebookId: string, password: string) {
    this.securedNotes[notebookId] = await hashPassword(password, this.salt);

    return this.saveSecuredNotes(this.securedNotes);
  }

  public removeLock(notebookId: string) {
    delete this.securedNotes[notebookId];

    return this.saveSecuredNotes(this.securedNotes);
  }

  public isNotebookSecured(notebookId: string): boolean {
    Logger.debug("isNotebookSecured", notebookId, this.securedNotes);
    return this.securedNotes.hasOwnProperty(notebookId);
  }
}

export const storageService = StorageService.getInstance();
