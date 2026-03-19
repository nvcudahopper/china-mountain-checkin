import type { VercelRequest, VercelResponse } from "@vercel/node";
import mountainData from "./mountains.json";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({ count: mountainData.length, first: (mountainData[0] as any)?.name });
}
