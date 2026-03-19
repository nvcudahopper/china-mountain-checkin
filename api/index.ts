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
import mountainData from "./mountains.json";

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
      photos: null,
    }));

    [
      { userId: "user1", name: "山行者", avatar: "🏔️" },
      { userId: "user2", name: "云端客", avatar: "⛅" },
      { userId: "user3", name: "徒步达人", avatar: "🥾" },
    ].forEach((u) => {
      const id = this.nextUserId++;
      this.users.set(u.userId, { ...u, id });
    });

    const sampleLogs: Omit<CheckinLog, "id">[] = [
      {
        mountainId: 1, userId: "user1", date: "2025-10-15", status: "completed",
        companions: ["云端客", "徒步达人"], weather: "晴朗",
        notes: "夜爬华山，凌晨4点到达东峰看日出，太壮观了！长空栈道确实惊险。",
        rating: 5, routeName: "夜爬华山",
        expenses: { ticket: 160, food: 80, transport: 200, accommodation: 150 },
        photos: [], createdAt: "2025-10-15T10:00:00Z",
      },
      {
        mountainId: 5, userId: "user1", date: "2025-08-20", status: "completed",
        companions: ["云端客"], weather: "多云",
        notes: "泰山日出没看到（多云），但十八盘的体验很棒。夜爬人超多！",
        rating: 4, routeName: "夜爬看日出",
        expenses: { ticket: 115, food: 60, transport: 150, accommodation: 0 },
        photos: [], createdAt: "2025-08-20T10:00:00Z",
      },
      {
        mountainId: 32, userId: "user1", date: "2025-09-01", status: "completed",
        companions: ["徒步达人"], weather: "晴",
        notes: "黄山云海太震撼了！西海大峡谷一定要走。",
        rating: 5, routeName: "前山上后山下",
        expenses: { ticket: 190, food: 120, transport: 300, accommodation: 400 },
        photos: [], createdAt: "2025-09-01T10:00:00Z",
      },
      {
        mountainId: 6, userId: "user2", date: "2025-07-15", status: "completed",
        companions: ["山行者"], weather: "多云转晴",
        notes: "峨眉山金顶的云海和佛光都看到了，非常幸运！猴子很多要注意。",
        rating: 5, routeName: "半程步行+索道",
        expenses: { ticket: 160, food: 100, transport: 250, accommodation: 300 },
        photos: [], createdAt: "2025-07-15T10:00:00Z",
      },
      {
        mountainId: 22, userId: "user1", date: "2026-04-15", status: "planned",
        companions: ["云端客", "徒步达人"], weather: null,
        notes: "计划清明后去张家界，主要想看哈利路亚山和天门山玻璃栈道。",
        rating: null, routeName: "国家森林公园2日游",
        expenses: null, photos: [], createdAt: "2026-03-01T10:00:00Z",
      },
      {
        mountainId: 11, userId: "user1", date: "2026-10-01", status: "wishlist",
        companions: [], weather: null,
        notes: "梦想去雨崩徒步，看日照金山！",
        rating: null, routeName: "雨崩徒步（内外转）",
        expenses: null, photos: [], createdAt: "2026-03-10T10:00:00Z",
      },
    ];
    sampleLogs.forEach((l) => {
      const id = this.nextCheckinId++;
      this.checkinLogs.set(id, { ...l, id });
    });
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

    // GET /api/mountains/:id
    if (segments[0] === "mountains" && segments[1] && method === "GET") {
      const mountain = storage.mountains.find((m) => m.id === parseInt(segments[1]));
      if (!mountain) return res.status(404).json({ error: "Mountain not found" });
      return res.json(mountain);
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

      const categories = ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红"];
      const categoryStats = categories.map((cat) => {
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
        const month = l.date.substring(0, 7);
        monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
      });

      return res.json({
        totalMountains: mountains.length,
        completedCount: completed.length,
        plannedCount: planned.length,
        wishlistCount: wishlist.length,
        categoryStats,
        totalElevation,
        totalExpenses,
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
