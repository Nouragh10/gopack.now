import { Paddle, Environment } from "@paddle/paddle-node-sdk";

let _paddle: Paddle | null = null;

export function getPaddle(): Paddle {
  if (!_paddle) {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
    _paddle = new Paddle(apiKey, { environment: Environment.Production });
  }
  return _paddle;
}
