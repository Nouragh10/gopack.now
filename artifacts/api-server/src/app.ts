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

// ── Firebase hosting proxy ─────────────────────────────────────
// Proxies all /__/ paths (auth handler + firebase init config) from
// the same origin as the app so signInWithPopup works under COOP.
// The auth handler page loads /__/firebase/init.json as a relative
// URL, so both /__/auth/* and /__/firebase/* must be proxied here.
const FIREBASE_HOST = "gopacknow-83d54.firebaseapp.com";

async function firebaseProxy(req: Request, res: Response): Promise<void> {
  // req.originalUrl preserves the full path including the mount prefix
  const targetUrl = `https://${FIREBASE_HOST}${req.originalUrl}`;
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      // Omit accept-encoding so we always get plain (non-compressed) bytes
      headers: {
        "user-agent": (req.headers["user-agent"] as string) ?? "",
        accept: (req.headers["accept"] as string) ?? "*/*",
        "accept-language": (req.headers["accept-language"] as string) ?? "",
        host: FIREBASE_HOST,
      },
      redirect: "manual",
    });

    res.status(upstream.status);

    // undici (Node.js fetch) auto-decompresses gzip/br responses but keeps
    // the original compressed content-length in the headers. Forwarding the
    // stale content-length truncates the body in the browser. Strip both
    // content-encoding (already decoded) and content-length (will be reset
    // by Express from the actual buffer size), plus hop-by-hop headers.
    const SKIP = new Set([
      "content-encoding", "content-length",
      "transfer-encoding", "connection", "keep-alive", "te", "trailer", "upgrade",
    ]);
    upstream.headers.forEach((value, key) => {
      if (!SKIP.has(key.toLowerCase())) res.setHeader(key, value);
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location");
      if (loc) { res.redirect(upstream.status, loc); return; }
    }

    const body = await upstream.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (err) {
    logger.error({ err }, "Firebase hosting proxy error");
    res.status(502).send("Firebase proxy error");
  }
}

app.use("/__/auth", firebaseProxy);
app.use("/__/firebase", firebaseProxy);
// ──────────────────────────────────────────────────────────────

app.use("/api", router);

export default app;
