import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let _app: App | null = null;

export function normalizeFirebasePrivateKey(value: string | undefined): string {
  let privateKey = (value ?? "").trim();
  if (!privateKey) return "";

  if (privateKey.startsWith("{")) {
    try {
      const parsed = JSON.parse(privateKey) as { private_key?: unknown };
      if (typeof parsed.private_key === "string") {
        privateKey = parsed.private_key.trim();
      }
    } catch {
      // Leave the original value intact so Firebase Admin returns its standard
      // invalid-credential error instead of hiding malformed configuration.
    }
  }

  const isDoubleQuoted = privateKey.startsWith('"') && privateKey.endsWith('"');
  const isSingleQuoted = privateKey.startsWith("'") && privateKey.endsWith("'");

  if (isDoubleQuoted) {
    try {
      const parsed = JSON.parse(privateKey);
      if (typeof parsed === "string") privateKey = parsed.trim();
    } catch {
      privateKey = privateKey.slice(1, -1).trim();
    }
  } else if (isSingleQuoted) {
    privateKey = privateKey.slice(1, -1).trim();
  }

  // Replit secrets may contain literal escape sequences, sometimes after being
  // copied from a JSON service-account file more than once.
  for (let attempt = 0; attempt < 3 && /\\[rn]/.test(privateKey); attempt += 1) {
    privateKey = privateKey
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n");
  }

  return privateKey.replace(/\r\n?/g, "\n").trim();
}

export function getAdminApp(): App {
  if (_app) return _app;
  const existing = getApps().find(a => a.name === "gopack-admin");
  _app = existing ?? initializeApp(
    {
      credential: cert({
        projectId: "gopacknow-83d54",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
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
