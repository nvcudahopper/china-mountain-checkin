import type { VercelRequest, VercelResponse } from "@vercel/node";
// @ts-ignore
import { mountainData } from "./data.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({ count: mountainData.length, first: mountainData[0]?.name });
}
