import type { Mountain, InsertMountain, CheckinLog, InsertCheckinLog, Comment, InsertComment, User, InsertUser } from "@shared/schema";
import { mountainData } from "./mountainData";

export interface IStorage {
  // Mountains
  getMountains(): Promise<Mountain[]>;
  getMountain(id: number): Promise<Mountain | undefined>;
  getMountainsByCategory(category: string): Promise<Mountain[]>;
  searchMountains(query: string): Promise<Mountain[]>;

  // Check-in logs
  getCheckinLogs(userId?: string): Promise<CheckinLog[]>;
  getCheckinLogsByMountain(mountainId: number): Promise<CheckinLog[]>;
  getCheckinLog(id: number): Promise<CheckinLog | undefined>;
  createCheckinLog(log: InsertCheckinLog): Promise<CheckinLog>;
  updateCheckinLog(id: number, log: Partial<InsertCheckinLog>): Promise<CheckinLog | undefined>;
  deleteCheckinLog(id: number): Promise<boolean>;

  // Comments
  getCommentsByCheckin(checkinId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Users
  getUser(userId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private mountains: Mountain[] = [];
  private checkinLogs: Map<number, CheckinLog> = new Map();
  private comments: Map<number, Comment> = new Map();
  private users: Map<string, User> = new Map();
  private nextCheckinId = 1;
  private nextCommentId = 1;
  private nextUserId = 1;

  constructor() {
    // Initialize with mountain data
    this.mountains = mountainData.map((m, i) => ({
      ...m,
      id: i + 1,
      highlights: m.highlights || null,
      photoSpots: m.photoSpots || null,
      photos: null,
    })) as Mountain[];

    // Create default users
    const defaultUsers: InsertUser[] = [
      { userId: "user1", name: "山行者", avatar: "🏔️" },
      { userId: "user2", name: "云端客", avatar: "⛅" },
      { userId: "user3", name: "徒步达人", avatar: "🥾" },
    ];
    defaultUsers.forEach(u => this.createUser(u));

    // Create some sample check-in logs
    const sampleLogs: InsertCheckinLog[] = [
      {
        mountainId: 1, userId: "user1", date: "2025-10-15", status: "completed",
        companions: ["云端客", "徒步达人"], weather: "晴朗",
        notes: "夜爬华山，凌晨4点到达东峰看日出，太壮观了！长空栈道确实惊险。",
        rating: 5, routeName: "夜爬华山",
        expenses: { ticket: 160, food: 80, transport: 200, accommodation: 150 },
        photos: [], createdAt: "2025-10-15T10:00:00Z"
      },
      {
        mountainId: 5, userId: "user1", date: "2025-08-20", status: "completed",
        companions: ["云端客"], weather: "多云",
        notes: "泰山日出没看到（多云），但十八盘的体验很棒。夜爬人超多！",
        rating: 4, routeName: "夜爬看日出",
        expenses: { ticket: 115, food: 60, transport: 150, accommodation: 0 },
        photos: [], createdAt: "2025-08-20T10:00:00Z"
      },
      {
        mountainId: 32, userId: "user1", date: "2025-09-01", status: "completed",
        companions: ["徒步达人"], weather: "晴",
        notes: "黄山云海太震撼了！西海大峡谷一定要走。",
        rating: 5, routeName: "前山上后山下",
        expenses: { ticket: 190, food: 120, transport: 300, accommodation: 400 },
        photos: [], createdAt: "2025-09-01T10:00:00Z"
      },
      {
        mountainId: 6, userId: "user2", date: "2025-07-15", status: "completed",
        companions: ["山行者"], weather: "多云转晴",
        notes: "峨眉山金顶的云海和佛光都看到了，非常幸运！猴子很多要注意。",
        rating: 5, routeName: "半程步行+索道",
        expenses: { ticket: 160, food: 100, transport: 250, accommodation: 300 },
        photos: [], createdAt: "2025-07-15T10:00:00Z"
      },
      {
        mountainId: 22, userId: "user1", date: "2026-04-15", status: "planned",
        companions: ["云端客", "徒步达人"], weather: null,
        notes: "计划清明后去张家界，主要想看哈利路亚山和天门山玻璃栈道。",
        rating: null, routeName: "国家森林公园2日游",
        expenses: null, photos: [], createdAt: "2026-03-01T10:00:00Z"
      },
      {
        mountainId: 11, userId: "user1", date: "2026-10-01", status: "wishlist",
        companions: [], weather: null,
        notes: "梦想去雨崩徒步，看日照金山！",
        rating: null, routeName: "雨崩徒步（内外转）",
        expenses: null, photos: [], createdAt: "2026-03-10T10:00:00Z"
      },
    ];
    sampleLogs.forEach(l => this.createCheckinLog(l));
  }

  async getMountains(): Promise<Mountain[]> {
    return this.mountains;
  }

  async getMountain(id: number): Promise<Mountain | undefined> {
    return this.mountains.find(m => m.id === id);
  }

  async getMountainsByCategory(category: string): Promise<Mountain[]> {
    return this.mountains.filter(m => m.category === category);
  }

  async searchMountains(query: string): Promise<Mountain[]> {
    const q = query.toLowerCase();
    return this.mountains.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.province.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  }

  async getCheckinLogs(userId?: string): Promise<CheckinLog[]> {
    const logs = Array.from(this.checkinLogs.values());
    if (userId) return logs.filter(l => l.userId === userId);
    return logs;
  }

  async getCheckinLogsByMountain(mountainId: number): Promise<CheckinLog[]> {
    return Array.from(this.checkinLogs.values()).filter(l => l.mountainId === mountainId);
  }

  async getCheckinLog(id: number): Promise<CheckinLog | undefined> {
    return this.checkinLogs.get(id);
  }

  async createCheckinLog(log: InsertCheckinLog): Promise<CheckinLog> {
    const id = this.nextCheckinId++;
    const newLog: CheckinLog = { ...log, id, createdAt: log.createdAt || new Date().toISOString() } as CheckinLog;
    this.checkinLogs.set(id, newLog);
    return newLog;
  }

  async updateCheckinLog(id: number, log: Partial<InsertCheckinLog>): Promise<CheckinLog | undefined> {
    const existing = this.checkinLogs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...log };
    this.checkinLogs.set(id, updated);
    return updated;
  }

  async deleteCheckinLog(id: number): Promise<boolean> {
    return this.checkinLogs.delete(id);
  }

  async getCommentsByCheckin(checkinId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(c => c.checkinId === checkinId);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = this.nextCommentId++;
    const newComment: Comment = { ...comment, id, createdAt: comment.createdAt || new Date().toISOString() };
    this.comments.set(id, newComment);
    return newComment;
  }

  async getUser(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const newUser: User = { ...user, id };
    this.users.set(user.userId, newUser);
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}

export const storage = new MemStorage();
