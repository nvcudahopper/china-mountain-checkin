import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

// ============= Database =============
function getSQL() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

// ============= Mountain data (static from data.js) =============
// @ts-ignore
import { mountainData } from "./data.js";

interface Mountain {
  id: number; name: string; province: string; elevation: number;
  category: string; ticketPrice: number | null; difficulty: string;
  duration: string; description: string | null; highlights: string[] | null;
  culturalBackground: string | null; bestMonths: unknown; seasonNotes: string | null;
  routes: unknown; tips: unknown; foods: unknown; transport: unknown;
  photoSpots: string[] | null; latitude: string | null; longitude: string | null;
  imageUrl: string | null; photos?: unknown;
}

const mountains: Mountain[] = (mountainData as any[]).map((m, i) => ({
  ...m, id: i + 1,
  highlights: m.highlights || null,
  photoSpots: m.photoSpots || null,
}));

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
    // ===== Mountains (static data, no DB needed) =====

    // GET /api/mountains
    if (segments[0] === "mountains" && !segments[1] && method === "GET") {
      let result = mountains;
      if (query.search) {
        const q = query.search.toLowerCase();
        result = result.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.province.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
        );
      } else if (query.category) {
        result = result.filter(m => m.category === query.category);
      }
      return res.json(result);
    }

    // POST /api/mountains
    if (segments[0] === "mountains" && !segments[1] && method === "POST") {
      const body = req.body;
      const maxId = mountains.reduce((max, m) => Math.max(max, m.id), 0);
      const newMountain: Mountain = {
        id: maxId + 1, name: body.name || "", province: body.province || "",
        elevation: body.elevation || 0, category: body.category || "其他山头",
        ticketPrice: body.ticketPrice ?? null, difficulty: body.difficulty || "中等",
        duration: body.duration || "1日", description: body.description || null,
        highlights: body.highlights || null, culturalBackground: body.culturalBackground || null,
        bestMonths: body.bestMonths || null, seasonNotes: body.seasonNotes || null,
        routes: body.routes || null, tips: body.tips || null,
        foods: body.foods || null, transport: body.transport || null,
        photoSpots: body.photoSpots || null, latitude: body.latitude || null,
        longitude: body.longitude || null, imageUrl: body.imageUrl || null, photos: null,
      };
      mountains.push(newMountain);
      return res.status(201).json(newMountain);
    }

    // GET /api/mountains/:id
    if (segments[0] === "mountains" && segments[1] && method === "GET") {
      const mountain = mountains.find(m => m.id === parseInt(segments[1]));
      if (!mountain) return res.status(404).json({ error: "Mountain not found" });
      return res.json(mountain);
    }

    // GET /api/categories
    if (segments[0] === "categories" && method === "GET") {
      const cats = new Set(mountains.map(m => m.category));
      ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红", "其他山头"].forEach(c => cats.add(c));
      return res.json(Array.from(cats));
    }

    // ===== Checkins (Neon Postgres) =====
    const sql = getSQL();

    // GET /api/checkins
    if (segments[0] === "checkins" && !segments[1] && method === "GET") {
      let rows;
      if (query.mountainId) {
        rows = await sql`SELECT * FROM mt_checkins WHERE mountain_id = ${parseInt(query.mountainId)} ORDER BY id DESC`;
      } else if (query.userId) {
        rows = await sql`SELECT * FROM mt_checkins WHERE user_id = ${query.userId} ORDER BY id DESC`;
      } else {
        rows = await sql`SELECT * FROM mt_checkins ORDER BY id DESC`;
      }
      // Map DB columns to frontend camelCase
      return res.json(rows.map(mapCheckinRow));
    }

    // GET /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "GET") {
      const rows = await sql`SELECT * FROM mt_checkins WHERE id = ${parseInt(segments[1])}`;
      if (rows.length === 0) return res.status(404).json({ error: "Check-in log not found" });
      return res.json(mapCheckinRow(rows[0]));
    }

    // POST /api/checkins
    if (segments[0] === "checkins" && method === "POST") {
      const b = req.body;
      const rows = await sql`
        INSERT INTO mt_checkins (mountain_id, user_id, status, start_date, end_date, weather, notes, rating, route_name, expenses, companions, photos, steps, created_at)
        VALUES (
          ${b.mountainId}, ${b.userId || "user1"}, ${b.status || "completed"},
          ${b.startDate || b.date || null}, ${b.endDate || b.startDate || b.date || null},
          ${JSON.stringify(b.weather) || null}, ${b.notes || null}, ${b.rating || null},
          ${b.routeName || null}, ${b.expenses ? JSON.stringify(b.expenses) : null},
          ${b.companions ? JSON.stringify(b.companions) : null},
          ${b.photos ? JSON.stringify(b.photos) : null},
          ${b.steps ? JSON.stringify(b.steps) : null},
          ${new Date().toISOString()}
        )
        RETURNING *
      `;
      return res.status(201).json(mapCheckinRow(rows[0]));
    }

    // PATCH /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "PATCH") {
      const id = parseInt(segments[1]);
      const b = req.body;
      // Build SET clause dynamically
      const updates: string[] = [];
      const vals: any = { id };
      if (b.mountainId !== undefined) { vals.mountainId = b.mountainId; }
      if (b.status !== undefined) { vals.status = b.status; }
      if (b.startDate !== undefined || b.date !== undefined) { vals.startDate = b.startDate || b.date; }
      if (b.endDate !== undefined) { vals.endDate = b.endDate; }
      if (b.weather !== undefined) { vals.weather = JSON.stringify(b.weather); }
      if (b.notes !== undefined) { vals.notes = b.notes; }
      if (b.rating !== undefined) { vals.rating = b.rating; }
      if (b.routeName !== undefined) { vals.routeName = b.routeName; }
      if (b.expenses !== undefined) { vals.expenses = JSON.stringify(b.expenses); }
      if (b.companions !== undefined) { vals.companions = JSON.stringify(b.companions); }
      if (b.photos !== undefined) { vals.photos = JSON.stringify(b.photos); }
      if (b.steps !== undefined) { vals.steps = JSON.stringify(b.steps); }

      // Use a full UPDATE with all fields (simpler than dynamic SQL with neon tagged template)
      const rows = await sql`
        UPDATE mt_checkins SET
          mountain_id = COALESCE(${vals.mountainId ?? null}, mountain_id),
          status = COALESCE(${vals.status ?? null}, status),
          start_date = COALESCE(${vals.startDate ?? null}, start_date),
          end_date = COALESCE(${vals.endDate ?? null}, end_date),
          weather = COALESCE(${vals.weather ?? null}, weather),
          notes = COALESCE(${vals.notes ?? null}, notes),
          rating = COALESCE(${vals.rating ?? null}, rating),
          route_name = COALESCE(${vals.routeName ?? null}, route_name),
          expenses = COALESCE(${vals.expenses ?? null}, expenses),
          companions = COALESCE(${vals.companions ?? null}, companions),
          photos = COALESCE(${vals.photos ?? null}, photos),
          steps = COALESCE(${vals.steps ?? null}, steps)
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: "Check-in log not found" });
      return res.json(mapCheckinRow(rows[0]));
    }

    // DELETE /api/checkins/:id
    if (segments[0] === "checkins" && segments[1] && method === "DELETE") {
      const id = parseInt(segments[1]);
      const rows = await sql`DELETE FROM mt_checkins WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return res.status(404).json({ error: "Check-in log not found" });
      return res.json({ success: true });
    }

    // ===== Users =====
    // GET /api/users
    if (segments[0] === "users" && !segments[1] && method === "GET") {
      const rows = await sql`SELECT * FROM mt_users ORDER BY id`;
      return res.json(rows.map(r => ({ id: r.id, userId: r.user_id, name: r.name, avatar: r.avatar })));
    }

    // GET /api/users/:userId
    if (segments[0] === "users" && segments[1] && method === "GET") {
      const rows = await sql`SELECT * FROM mt_users WHERE user_id = ${segments[1]}`;
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      const r = rows[0];
      return res.json({ id: r.id, userId: r.user_id, name: r.name, avatar: r.avatar });
    }

    // ===== Stats =====
    // GET /api/stats/:userId
    if (segments[0] === "stats" && segments[1] && method === "GET") {
      const userId = segments[1];
      const rows = await sql`SELECT * FROM mt_checkins WHERE user_id = ${userId}`;
      const logs = rows.map(mapCheckinRow);

      const completed = logs.filter((l: any) => l.status === "completed");
      const planned = logs.filter((l: any) => l.status === "planned");
      const wishlist = logs.filter((l: any) => l.status === "wishlist");

      const completedMountainIds = new Set(completed.map((l: any) => l.mountainId));
      const completedMountains = mountains.filter(m => completedMountainIds.has(m.id));

      const allCats = new Set(mountains.map(m => m.category));
      const categoryStats = Array.from(allCats).map(cat => {
        const total = mountains.filter(m => m.category === cat).length;
        const done = completedMountains.filter(m => m.category === cat).length;
        return { category: cat, total, done };
      });

      const totalElevation = completedMountains.reduce((sum, m) => sum + m.elevation, 0);
      const totalExpenses = completed.reduce((sum: number, l: any) => {
        if (l.expenses && typeof l.expenses === "object") {
          return sum + Object.values(l.expenses as Record<string, number>).reduce((s, v) => s + (v || 0), 0);
        }
        return sum;
      }, 0);

      const monthlyActivity: Record<string, number> = {};
      completed.forEach((l: any) => {
        const dateStr = l.startDate || "";
        const month = dateStr.substring(0, 7);
        if (month) monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
      });

      const totalDays = completed.reduce((sum: number, l: any) => {
        const sd = l.startDate;
        const ed = l.endDate || sd;
        if (!sd) return sum;
        const start = new Date(sd);
        const end = new Date(ed);
        const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
        return sum + diff;
      }, 0);

      const totalSteps = completed.reduce((sum: number, l: any) => {
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
        plannedMountainIds: planned.map((l: any) => l.mountainId),
        wishlistMountainIds: wishlist.map((l: any) => l.mountainId),
      });
    }

    // ===== Comments =====
    if (segments[0] === "comments" && method === "GET") {
      if (!query.checkinId) return res.status(400).json({ error: "checkinId required" });
      const rows = await sql`SELECT * FROM mt_comments WHERE checkin_id = ${parseInt(query.checkinId)} ORDER BY id`;
      return res.json(rows.map(r => ({
        id: r.id, checkinId: r.checkin_id, userId: r.user_id,
        userName: r.user_name, content: r.content, createdAt: r.created_at,
      })));
    }

    if (segments[0] === "comments" && method === "POST") {
      const b = req.body;
      const rows = await sql`
        INSERT INTO mt_comments (checkin_id, user_id, user_name, content, created_at)
        VALUES (${b.checkinId}, ${b.userId}, ${b.userName}, ${b.content}, ${new Date().toISOString()})
        RETURNING *
      `;
      const r = rows[0];
      return res.status(201).json({
        id: r.id, checkinId: r.checkin_id, userId: r.user_id,
        userName: r.user_name, content: r.content, createdAt: r.created_at,
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

// ============= Map DB row (snake_case) to frontend (camelCase) =============
function mapCheckinRow(r: any) {
  return {
    id: r.id,
    mountainId: r.mountain_id,
    userId: r.user_id,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    weather: parseJSON(r.weather),
    notes: r.notes,
    rating: r.rating,
    routeName: r.route_name,
    expenses: parseJSON(r.expenses),
    companions: parseJSON(r.companions),
    photos: parseJSON(r.photos),
    steps: parseJSON(r.steps),
    createdAt: r.created_at,
  };
}

function parseJSON(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === "object") return val; // already parsed (jsonb)
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}
