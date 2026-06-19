import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Firebase auth proxy ────────────────────────────────────────
// Serves Firebase's auth handler from the same origin as the app.
// This keeps window.opener alive through COOP (which only nullifies
// it for cross-origin popups) so signInWithPopup works correctly.
const FIREBASE_AUTH_HOST = "gopacknow-83d54.firebaseapp.com";
app.use("/__/auth", async (req: Request, res: Response) => {
  const targetUrl = `https://${FIREBASE_AUTH_HOST}/__/auth${req.url}`;
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "user-agent": (req.headers["user-agent"] as string) ?? "",
        accept: (req.headers["accept"] as string) ?? "*/*",
        "accept-language": (req.headers["accept-language"] as string) ?? "",
        host: FIREBASE_AUTH_HOST,
      },
      redirect: "manual",
    });

    // Copy status
    res.status(upstream.status);

    // Forward safe headers
    const SKIP = new Set(["content-encoding", "transfer-encoding", "connection", "keep-alive"]);
    upstream.headers.forEach((value, key) => {
      if (!SKIP.has(key.toLowerCase())) res.setHeader(key, value);
    });

    // Handle redirects from upstream
    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location");
      if (loc) { res.redirect(upstream.status, loc); return; }
    }

    const body = await upstream.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (err) {
    logger.error({ err }, "Firebase auth proxy error");
    res.status(502).send("Firebase auth proxy error");
  }
});
// ──────────────────────────────────────────────────────────────

app.use("/api", router);

export default app;
