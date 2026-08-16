import { afterEach, describe, expect, test } from "bun:test";
import {
  clearLastKnownPro,
  lastKnownProForUser,
  readLastKnownPro,
  writeLastKnownPro,
} from "./lastKnownPro";

const memory = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: localStorageStub,
    dispatchEvent: () => true,
  },
  configurable: true,
});

afterEach(() => {
  memory.clear();
});

describe("lastKnownPro", () => {
  test("empty storage is not Pro", () => {
    expect(readLastKnownPro()).toBeNull();
    expect(lastKnownProForUser("user_1")).toBe(false);
  });

  test("persists an active grant for that Clerk user only", () => {
    writeLastKnownPro({
      clerkUserId: "user_1",
      status: "active",
      period: "2026",
      confirmedAt: 1,
    });
    expect(lastKnownProForUser("user_1")).toBe(true);
    expect(lastKnownProForUser("user_2")).toBe(false);
  });

  test("clear drops the grant", () => {
    writeLastKnownPro({
      clerkUserId: "user_1",
      status: "active",
      period: "2026",
      confirmedAt: 1,
    });
    clearLastKnownPro("user_1");
    expect(lastKnownProForUser("user_1")).toBe(false);
  });

  test("clear for a different user leaves the grant", () => {
    writeLastKnownPro({
      clerkUserId: "user_1",
      status: "active",
      period: "2026",
      confirmedAt: 1,
    });
    clearLastKnownPro("user_2");
    expect(lastKnownProForUser("user_1")).toBe(true);
  });
});
