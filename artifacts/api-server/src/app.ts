import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { stripeRouter, stripeWebhookHandler } from "./routes/stripe";
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

// Stripe webhook must be registered BEFORE express.json() — it needs the raw body buffer
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api", stripeRouter);

export default app;
