import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(server: Server, app: Express) {
  // Mountains
  app.get("/api/mountains", async (_req, res) => {
    const { category, search } = _req.query;
    let mountains;
    if (search && typeof search === "string") {
      mountains = await storage.searchMountains(search);
    } else if (category && typeof category === "string") {
      mountains = await storage.getMountainsByCategory(category);
    } else {
      mountains = await storage.getMountains();
    }
    res.json(mountains);
  });

  app.get("/api/mountains/:id", async (req, res) => {
    const mountain = await storage.getMountain(parseInt(req.params.id));
    if (!mountain) return res.status(404).json({ error: "Mountain not found" });
    res.json(mountain);
  });

  // Create a new mountain
  app.post("/api/mountains", async (req, res) => {
    try {
      const mountain = await storage.createMountain(req.body);
      res.status(201).json(mountain);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Get all categories (dynamic)
  app.get("/api/categories", async (_req, res) => {
    const mountains = await storage.getMountains();
    const cats = new Set(mountains.map(m => m.category));
    // Always include these base categories
    ["五岳", "佛教名山", "道教名山", "徒步", "地貌/网红", "其他山头"].forEach(c => cats.add(c));
    res.json(Array.from(cats));
  });

  // Check-in logs
  app.get("/api/checkins", async (req, res) => {
    const { userId, mountainId } = req.query;
    let logs;
    if (mountainId) {
      logs = await storage.getCheckinLogsByMountain(parseInt(mountainId as string));
    } else {
      logs = await storage.getCheckinLogs(userId as string | undefined);
    }
    res.json(logs);
  });

  app.get("/api/checkins/:id", async (req, res) => {
    const log = await storage.getCheckinLog(parseInt(req.params.id));
    if (!log) return res.status(404).json({ error: "Check-in log not found" });
    res.json(log);
  });

  app.post("/api/checkins", async (req, res) => {
    try {
      const log = await storage.createCheckinLog(req.body);
      res.status(201).json(log);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/checkins/:id", async (req, res) => {
    const log = await storage.updateCheckinLog(parseInt(req.params.id), req.body);
    if (!log) return res.status(404).json({ error: "Check-in log not found" });
    res.json(log);
  });

  app.delete("/api/checkins/:id", async (req, res) => {
    const success = await storage.deleteCheckinLog(parseInt(req.params.id));
    if (!success) return res.status(404).json({ error: "Check-in log not found" });
    res.json({ success: true });
  });

  // Comments
  app.get("/api/comments", async (req, res) => {
    const { checkinId } = req.query;
    if (!checkinId) return res.status(400).json({ error: "checkinId required" });
    const comments = await storage.getCommentsByCheckin(parseInt(checkinId as string));
    res.json(comments);
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const comment = await storage.createComment(req.body);
      res.status(201).json(comment);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:userId", async (req, res) => {
    const user = await storage.getUser(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  // Stats for a user
  app.get("/api/stats/:userId", async (req, res) => {
    const logs = await storage.getCheckinLogs(req.params.userId);
    const mountains = await storage.getMountains();

    const completed = logs.filter(l => l.status === "completed");
    const planned = logs.filter(l => l.status === "planned");
    const wishlist = logs.filter(l => l.status === "wishlist");

    const completedMountainIds = new Set(completed.map(l => l.mountainId));
    const completedMountains = mountains.filter(m => completedMountainIds.has(m.id));

    // Dynamic categories from actual mountain data
    const allCats = new Set(mountains.map(m => m.category));
    const categoryStats = Array.from(allCats).map(cat => {
      const total = mountains.filter(m => m.category === cat).length;
      const done = completedMountains.filter(m => m.category === cat).length;
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
    completed.forEach(l => {
      const month = l.date.substring(0, 7);
      monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
    });

    res.json({
      totalMountains: mountains.length,
      completedCount: completed.length,
      plannedCount: planned.length,
      wishlistCount: wishlist.length,
      categoryStats,
      totalElevation,
      totalExpenses,
      monthlyActivity,
      completedMountainIds: Array.from(completedMountainIds),
      plannedMountainIds: planned.map(l => l.mountainId),
      wishlistMountainIds: wishlist.map(l => l.mountainId),
    });
  });
}
