import { LockState } from "@/types/LockState";
import { SecuredNotesStorage } from "@/types/SecuredNotesStorage";

export class StorageService {
  private static instance: StorageService;
  private securedNotesStorage: SecuredNotesStorage = {};
  private lockState: LockState = LockState.LOCKED;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public getSecuredNotesStorage(): SecuredNotesStorage {
    return this.securedNotesStorage;
  }

  public setSecuredNotesStorage(data: SecuredNotesStorage): void {
    this.securedNotesStorage = data;
  }

  public getLockState(): LockState {
    return this.lockState;
  }

  public setLockState(state: LockState): void {
    this.lockState = state;
  }
}

export const storageService = StorageService.getInstance();
