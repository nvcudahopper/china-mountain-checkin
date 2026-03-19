import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const data = JSON.parse(readFileSync(join(__dirname, "mountains.json"), "utf-8"));
    return res.json({ count: data.length, first: data[0]?.name });
  } catch (e: any) {
    return res.status(500).json({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) });
  }
}
