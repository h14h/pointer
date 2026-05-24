import Dexie from "dexie";

interface StoreRecord {
  id?: number;
  key: string;
  value: string;
  updatedAt: number;
}

class PointerDatabase extends Dexie {
  store!: Dexie.Table<StoreRecord, number>;

  constructor() {
    super("pointer-db-v1");
    this.version(1).stores({
      store: "++id, key",
    });
  }
}

export const db = new PointerDatabase();
export type { StoreRecord };
