import type { VercelRequest, VercelResponse } from "@vercel/node";

const testData = [
  { name: "华山", province: "陕西", elevation: 2154 },
  { name: "泰山", province: "山东", elevation: 1545 },
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({ count: testData.length, data: testData });
}
