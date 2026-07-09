import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let db: Database | null = null;

export function getAdminDb(): Database {
  if (db) return db;

  const existing = getApps().find(a => a.name === "gopack-admin");
  const app = existing ?? initializeApp(
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

  db = getDatabase(app);
  return db;
}
