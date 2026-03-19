import type { VercelRequest, VercelResponse } from "@vercel/node";

// ============= Inline types (avoid importing from shared/schema which depends on drizzle-orm) =============
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
  date: string;
  status: string;
  companions: string[] | null;
  weather: string | null;
  notes: string | null;
  rating: number | null;
  routeName: string | null;
  expenses: unknown;
  photos: string[] | null;
  createdAt: string | null;
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

// ============= Mountain data =============
// @ts-ignore
import { mountainData } from "./data.js";

// ============= In-memory storage =============
class MemStorage {
  mountains: Mountain[] = [];
  checkinLogs: Map<number, CheckinLog> = new Map();
  comments: Map<number, Comment> = new Map();
  users: Map<string, User> = new Map();
  nextCheckinId = 1;
  nextCommentId = 1;
  nextUserId = 1;

  constructor() {
    this.mountains = (mountainData as any[]).map((m, i) => ({
      ...m,
      id: i + 1,
      highlights: m.highlights || null,
      photoSpots: m.photoSpots || null,
    }));

    [
      { userId: "user1", name: "山行者", avatar: "🏔️" },
      { userId: "user2", name: "云端客", avatar: "⛅" },
      { userId: "user3", name: "徒步达人", avatar: "🥾" },
    ].forEach((u) => {
      const id = this.nextUserId++;
      this.users.set(u.userId, { ...u, id });
    });

    // No sample check-in logs — users create their own records
  }
}

const storage = new MemStorage();

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
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { segments, query } = parsePath(req.url || "/");
  const method = req.method || "GET";

  try {
    // GET /api/mountains
    if (segments[0] === "mountains" && !segments[1] && method === "GET") {
      let result = storage.mountains;
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
      const maxId = storage.mountains.reduce((max, m) => Math.max(max, m.id), 0);
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
      storage.mountains.push(newMountain);
      return res.status(201).json(newMountain);
    }

    // GET /api/mountains/:id
    if (segments[0] === "mountains" && segments[1] && method === "GET") {
      const mountain = storage.mountains.find((m) => m.id === parseInt(segments[1]));
      if (!mountain) return res.status(404).json({ error: "Mountain not found" });
      return res.json(mountain);
    }

    // GET /api/categories (dynamic)
    if (segments[0] === "categories" && method === "GET") {
      const cats = new Set(storage.mountains.map((m) => m.category));
      ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红", "其他山头"].forEach((c) => cats.add(c));
      return res.json(Array.from(cats));
    }

    // GET /api/checkins
    if (segments[0] === "checkins" && !segments[1] && method === "GET") {
      let logs = Array.from(storage.checkinLogs.values());
      if (query.mountainId) {
        logs = logs.filter((l) => l.mountainId === parseInt(query.mountainId));
      } else if (query.userId) {
        logs = logs.filter((l) => l.userId === query.userId);
      }
      return res.json(logs);
    }

    // GET /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "GET") {
      const log = storage.checkinLogs.get(parseInt(segments[1]));
      if (!log) return res.status(404).json({ error: "Check-in log not found" });
      return res.json(log);
    }

    // POST /api/checkins
    if (segments[0] === "checkins" && method === "POST") {
      const id = storage.nextCheckinId++;
      const newLog: CheckinLog = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
      storage.checkinLogs.set(id, newLog);
      return res.status(201).json(newLog);
    }

    // PATCH /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "PATCH") {
      const id = parseInt(segments[1]);
      const existing = storage.checkinLogs.get(id);
      if (!existing) return res.status(404).json({ error: "Check-in log not found" });
      const updated = { ...existing, ...req.body };
      storage.checkinLogs.set(id, updated);
      return res.json(updated);
    }

    // DELETE /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "DELETE") {
      const id = parseInt(segments[1]);
      const success = storage.checkinLogs.delete(id);
      if (!success) return res.status(404).json({ error: "Check-in log not found" });
      return res.json({ success: true });
    }

    // GET /api/comments
    if (segments[0] === "comments" && method === "GET") {
      if (!query.checkinId) return res.status(400).json({ error: "checkinId required" });
      const comments = Array.from(storage.comments.values()).filter(
        (c) => c.checkinId === parseInt(query.checkinId)
      );
      return res.json(comments);
    }

    // POST /api/comments
    if (segments[0] === "comments" && method === "POST") {
      const id = storage.nextCommentId++;
      const newComment: Comment = { ...req.body, id, createdAt: req.body.createdAt || new Date().toISOString() };
      storage.comments.set(id, newComment);
      return res.status(201).json(newComment);
    }

    // GET /api/users
    if (segments[0] === "users" && !segments[1] && method === "GET") {
      return res.json(Array.from(storage.users.values()));
    }

    // GET /api/users/:userId
    if (segments[0] === "users" && segments[1] && method === "GET") {
      const user = storage.users.get(segments[1]);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(user);
    }

    // GET /api/stats/:userId
    if (segments[0] === "stats" && segments[1] && method === "GET") {
      const userId = segments[1];
      const logs = Array.from(storage.checkinLogs.values()).filter((l) => l.userId === userId);
      const mountains = storage.mountains;

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
        const dateStr = (l as any).startDate || (l as any).date || "";
        const month = dateStr.substring(0, 7);
        if (month) monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
      });

      // Calculate total days across all completed trips
      const totalDays = completed.reduce((sum, l) => {
        const sd = (l as any).startDate || (l as any).date;
        const ed = (l as any).endDate || sd;
        if (!sd) return sum;
        const start = new Date(sd);
        const end = new Date(ed);
        const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
        return sum + diff;
      }, 0);

      // Calculate total steps
      const totalSteps = completed.reduce((sum, l) => {
        return sum + ((l as any).steps || 0);
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
