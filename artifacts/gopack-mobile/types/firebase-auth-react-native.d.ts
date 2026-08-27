import "firebase/auth";
import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  /**
   * Firebase ships this helper from its React Native auth entry point. The
   * top-level Firebase wrapper currently exposes web-only declarations, so
   * TypeScript needs this matching declaration while Metro selects the native
   * implementation at bundle time.
   */
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}