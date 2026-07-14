export interface ParsedQuestion {
  text: string;
  raw: string;
  a: number;
  b: number;
  op: string;
  displayOp: string;
  result: number;
  type: "addition" | "subtraction" | "multiplication" | "division" | "unknown";
}

export function parseQuestion(input: string): ParsedQuestion | null {
  if (!input.trim()) return null;

  const normalized = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/[^\d\s+\-*/.]/g, " ");

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([+\-*\/])\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const a = parseFloat(match[1]);
  const opRaw = match[2];
  const b = parseFloat(match[3]);

  let result = 0;
  let type: ParsedQuestion["type"] = "unknown";

  if (opRaw === "+") { result = a + b; type = "addition"; }
  else if (opRaw === "-") { result = a - b; type = "subtraction"; }
  else if (opRaw === "*") { result = a * b; type = "multiplication"; }
  else if (opRaw === "/") { result = b !== 0 ? Math.round((a / b) * 100) / 100 : 0; type = "division"; }

  const displayOp = { "+": "+", "-": "−", "*": "×", "/": "÷" }[opRaw] ?? opRaw;
  const raw = `${a} ${displayOp} ${b}`;

  return { text: input.trim(), raw, a, b, op: opRaw, displayOp, result, type };
}

export function formatQuestion(q: ParsedQuestion) {
  return `${q.a} ${q.displayOp} ${q.b} = ?`;
}
