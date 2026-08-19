import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let _app: App | null = null;

export function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps().find(a => a.name === "gopack-admin");
  _app = existing ?? initializeApp(
    {
      credential: cert({
        projectId: "gopacknow-83d54",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
      databaseURL: "https://gopacknow-83d54-default-rtdb.firebaseio.com",
    },
    "gopack-admin",
  );
  return _app;
}

export function getAdminDb(): Database {
  return getDatabase(getAdminApp());
}
