import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const data = JSON.parse(readFileSync(join(__dirname, "mountains.json"), "utf-8"));
    return res.json({ count: data.length, first: data[0]?.name });
  } catch (e: any) {
    return res.status(500).json({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) });
  }
}
