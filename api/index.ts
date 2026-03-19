import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put, list } from "@vercel/blob";

// ============= Inline types =============
interface Mountain {
  id: number;
  name: string;
  province: string;
  elevation: number;
  category: string;
  ticketPrice: number | null;
  difficulty: string;
  duration: string;
  description: string | null;
  highlights: string[] | null;
  culturalBackground: string | null;
  bestMonths: unknown;
  seasonNotes: string | null;
  routes: unknown;
  tips: unknown;
  foods: unknown;
  transport: unknown;
  photoSpots: string[] | null;
  latitude: string | null;
  longitude: string | null;
  imageUrl: string | null;
  photos?: unknown;
}

interface CheckinLog {
  id: number;
  mountainId: number;
  userId: string;
  status: string;
  companions: string[] | null;
  weather: string | string[] | null;
  notes: string | null;
  rating: number | null;
  routeName: string | null;
  expenses: unknown;
  photos: string[] | null;
  createdAt: string | null;
  startDate?: string;
  endDate?: string;
  steps?: unknown;
  [key: string]: unknown;
}

interface Comment {
  id: number;
  checkinId: number;
  userId: string;
  userName: string;
  content: string;
  createdAt: string | null;
}

interface User {
  id: number;
  userId: string;
  name: string;
  avatar: string | null;
}

interface StoredData {
  checkins: CheckinLog[];
  comments: Comment[];
  users: User[];
  nextCheckinId: number;
  nextCommentId: number;
  nextUserId: number;
}

// ============= Mountain data (static) =============
// @ts-ignore
import { mountainData } from "./data.js";

const mountains: Mountain[] = (mountainData as any[]).map((m, i) => ({
  ...m,
  id: i + 1,
  highlights: m.highlights || null,
  photoSpots: m.photoSpots || null,
}));

// ============= Blob-based persistent storage =============
const BLOB_KEY = "mountain-tracker-data.json";
const HAS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

// In-memory cache to reduce blob reads within same function invocation
let cachedData: StoredData | null = null;

function defaultData(): StoredData {
  return {
    checkins: [],
    comments: [],
    users: [
      { id: 1, userId: "user1", name: "山行者", avatar: "🏔️" },
      { id: 2, userId: "user2", name: "云端客", avatar: "⛅" },
      { id: 3, userId: "user3", name: "徒步达人", avatar: "🥾" },
    ],
    nextCheckinId: 1,
    nextCommentId: 1,
    nextUserId: 4,
  };
}

async function loadData(): Promise<StoredData> {
  if (cachedData) return cachedData;

  if (!HAS_BLOB) {
    // Fallback: in-memory only (dev / no blob token)
    cachedData = defaultData();
    return cachedData;
  }

  try {
    // Find the blob URL by listing with prefix
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
    if (blobs.length > 0) {
      // Fetch the JSON content via the blob's public URL
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const text = await response.text();
        if (text) {
          cachedData = JSON.parse(text);
          return cachedData!;
        }
      }
    }
  } catch (e: any) {
    // Blob not found or parse error — start fresh
    console.log("Blob load fallback:", e.message);
  }

  cachedData = defaultData();
  return cachedData;
}

async function saveData(data: StoredData): Promise<void> {
  cachedData = data;
  if (!HAS_BLOB) return;

  try {
    await put(BLOB_KEY, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch (e: any) {
    console.error("Blob save error:", e.message);
  }
}

// ============= URL parsing =============
function parsePath(url: string): { segments: string[]; query: Record<string, string> } {
  const [pathname, qs] = url.split("?");
  const segments = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const query: Record<string, string> = {};
  if (qs) {
    for (const part of qs.split("&")) {
      const [k, v] = part.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }
  return { segments, query };
}

// ============= Handler =============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { segments, query } = parsePath(req.url || "/");
  const method = req.method || "GET";

  try {
    // GET /api/mountains
    if (segments[0] === "mountains" && !segments[1] && method === "GET") {
      let result = mountains;
      if (query.search) {
        const q = query.search.toLowerCase();
        result = result.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.province.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q)
        );
      } else if (query.category) {
        result = result.filter((m) => m.category === query.category);
      }
      return res.json(result);
    }

    // POST /api/mountains (create new mountain)
    if (segments[0] === "mountains" && !segments[1] && method === "POST") {
      const body = req.body;
      const maxId = mountains.reduce((max, m) => Math.max(max, m.id), 0);
      const newMountain: Mountain = {
        id: maxId + 1,
        name: body.name || "",
        province: body.province || "",
        elevation: body.elevation || 0,
        category: body.category || "其他山头",
        ticketPrice: body.ticketPrice ?? null,
        difficulty: body.difficulty || "中等",
        duration: body.duration || "1日",
        description: body.description || null,
        highlights: body.highlights || null,
        culturalBackground: body.culturalBackground || null,
        bestMonths: body.bestMonths || null,
        seasonNotes: body.seasonNotes || null,
        routes: body.routes || null,
        tips: body.tips || null,
        foods: body.foods || null,
        transport: body.transport || null,
        photoSpots: body.photoSpots || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        imageUrl: body.imageUrl || null,
        photos: null,
      };
      mountains.push(newMountain);
      return res.status(201).json(newMountain);
    }

    // GET /api/mountains/:id
    if (segments[0] === "mountains" && segments[1] && method === "GET") {
      const mountain = mountains.find((m) => m.id === parseInt(segments[1]));
      if (!mountain) return res.status(404).json({ error: "Mountain not found" });
      return res.json(mountain);
    }

    // GET /api/categories (dynamic)
    if (segments[0] === "categories" && method === "GET") {
      const cats = new Set(mountains.map((m) => m.category));
      ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红", "其他山头"].forEach((c) => cats.add(c));
      return res.json(Array.from(cats));
    }

    // ===== Checkins (persistent via Blob) =====
    const data = await loadData();

    // GET /api/checkins
    if (segments[0] === "checkins" && !segments[1] && method === "GET") {
      let logs = data.checkins;
      if (query.mountainId) {
        logs = logs.filter((l) => l.mountainId === parseInt(query.mountainId));
      } else if (query.userId) {
        logs = logs.filter((l) => l.userId === query.userId);
      }
      return res.json(logs);
    }

    // GET /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "GET") {
      const log = data.checkins.find((l) => l.id === parseInt(segments[1]));
      if (!log) return res.status(404).json({ error: "Check-in log not found" });
      return res.json(log);
    }

    // POST /api/checkins
    if (segments[0] === "checkins" && method === "POST") {
      const id = data.nextCheckinId++;
      const newLog: CheckinLog = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
      data.checkins.push(newLog);
      await saveData(data);
      return res.status(201).json(newLog);
    }

    // PATCH /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "PATCH") {
      const id = parseInt(segments[1]);
      const idx = data.checkins.findIndex((l) => l.id === id);
      if (idx === -1) return res.status(404).json({ error: "Check-in log not found" });
      data.checkins[idx] = { ...data.checkins[idx], ...req.body };
      await saveData(data);
      return res.json(data.checkins[idx]);
    }

    // DELETE /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "DELETE") {
      const id = parseInt(segments[1]);
      const idx = data.checkins.findIndex((l) => l.id === id);
      if (idx === -1) return res.status(404).json({ error: "Check-in log not found" });
      data.checkins.splice(idx, 1);
      await saveData(data);
      return res.json({ success: true });
    }

    // GET /api/comments
    if (segments[0] === "comments" && method === "GET") {
      if (!query.checkinId) return res.status(400).json({ error: "checkinId required" });
      const comments = data.comments.filter((c) => c.checkinId === parseInt(query.checkinId));
      return res.json(comments);
    }

    // POST /api/comments
    if (segments[0] === "comments" && method === "POST") {
      const id = data.nextCommentId++;
      const newComment: Comment = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
      data.comments.push(newComment);
      await saveData(data);
      return res.status(201).json(newComment);
    }

    // GET /api/users
    if (segments[0] === "users" && !segments[1] && method === "GET") {
      return res.json(data.users);
    }

    // GET /api/users/:userId
    if (segments[0] === "users" && segments[1] && method === "GET") {
      const user = data.users.find((u) => u.userId === segments[1]);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(user);
    }

    // GET /api/stats/:userId
    if (segments[0] === "stats" && segments[1] && method === "GET") {
      const userId = segments[1];
      const logs = data.checkins.filter((l) => l.userId === userId);

      const completed = logs.filter((l) => l.status === "completed");
      const planned = logs.filter((l) => l.status === "planned");
      const wishlist = logs.filter((l) => l.status === "wishlist");

      const completedMountainIds = new Set(completed.map((l) => l.mountainId));
      const completedMountains = mountains.filter((m) => completedMountainIds.has(m.id));

      const allCats = new Set(mountains.map((m) => m.category));
      const categoryStats = Array.from(allCats).map((cat) => {
        const total = mountains.filter((m) => m.category === cat).length;
        const done = completedMountains.filter((m) => m.category === cat).length;
        return { category: cat, total, done };
      });

      const totalElevation = completedMountains.reduce((sum, m) => sum + m.elevation, 0);
      const totalExpenses = completed.reduce((sum, l) => {
        if (l.expenses && typeof l.expenses === "object") {
          const exp = l.expenses as Record<string, number>;
          return sum + Object.values(exp).reduce((s, v) => s + (v || 0), 0);
        }
        return sum;
      }, 0);

      const monthlyActivity: Record<string, number> = {};
      completed.forEach((l) => {
        const dateStr = l.startDate || "";
        const month = dateStr.substring(0, 7);
        if (month) monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
      });

      // Calculate total days across all completed trips
      const totalDays = completed.reduce((sum, l) => {
        const sd = l.startDate;
        const ed = l.endDate || sd;
        if (!sd) return sum;
        const start = new Date(sd);
        const end = new Date(ed!);
        const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
        return sum + diff;
      }, 0);

      // Calculate total steps (supports both old integer and new {date: steps} format)
      const totalSteps = completed.reduce((sum, l) => {
        const s = l.steps;
        if (!s) return sum;
        if (typeof s === "number") return sum + s;
        if (typeof s === "object") {
          return sum + Object.values(s as Record<string, number>).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
        }
        return sum;
      }, 0);

      return res.json({
        totalMountains: mountains.length,
        completedCount: completed.length,
        plannedCount: planned.length,
        wishlistCount: wishlist.length,
        categoryStats,
        totalElevation,
        totalExpenses,
        totalDays,
        totalSteps,
        monthlyActivity,
        completedMountainIds: Array.from(completedMountainIds),
        plannedMountainIds: planned.map((l) => l.mountainId),
        wishlistMountainIds: wishlist.map((l) => l.mountainId),
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
