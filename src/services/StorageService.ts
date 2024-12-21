import { Logger } from "@/libs/logger";
import { LockState } from "@/types/LockState";
import { SecuredNotesStorage } from "@/types/SecuredNotesStorage";

type GetDataFunction = <T>() => Promise<T>;
type SaveDataFunction = (value: any) => Promise<void>;

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

  public getSecuredNotes(): SecuredNotesStorage {
    return this.securedNotes;
  }

  public setSecuredNotes(data: SecuredNotesStorage): void {
    Logger.log("setSecuredNotesStorage", data);
    this.securedNotes = data;
  }

  public getLockState(): LockState {
    return this.lockState;
  }

  public setLockState(state: LockState): void {
    this.lockState = state;
  }
}

export const storageService = StorageService.getInstance();
