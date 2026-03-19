import type { Mountain, InsertMountain, CheckinLog, InsertCheckinLog, Comment, InsertComment, User, InsertUser } from "../shared/schema";
import { mountainData } from "./mountainData";

export interface IStorage {
  // Mountains
  getMountains(): Promise<Mountain[]>;
  getMountain(id: number): Promise<Mountain | undefined>;
  getMountainsByCategory(category: string): Promise<Mountain[]>;
  searchMountains(query: string): Promise<Mountain[]>;
  createMountain(data: Partial<InsertMountain>): Promise<Mountain>;

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
    })) as Mountain[];

    // Create default users
    const defaultUsers: InsertUser[] = [
      { userId: "user1", name: "山行者", avatar: "🏔️" },
      { userId: "user2", name: "云端客", avatar: "⛅" },
      { userId: "user3", name: "徒步达人", avatar: "🥾" },
    ];
    defaultUsers.forEach(u => this.createUser(u));

    // No sample check-in logs — users create their own records
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

  async createMountain(data: Partial<InsertMountain>): Promise<Mountain> {
    const maxId = this.mountains.reduce((max, m) => Math.max(max, m.id), 0);
    const newMountain: Mountain = {
      id: maxId + 1,
      name: data.name || "",
      province: data.province || "",
      elevation: data.elevation || 0,
      category: data.category || "其他山头",
      ticketPrice: data.ticketPrice ?? null,
      difficulty: data.difficulty || "中等",
      duration: data.duration || "1日",
      description: data.description || null,
      highlights: data.highlights || null,
      culturalBackground: data.culturalBackground || null,
      bestMonths: data.bestMonths || null,
      seasonNotes: data.seasonNotes || null,
      routes: data.routes || null,
      tips: data.tips || null,
      foods: data.foods || null,
      transport: data.transport || null,
      photoSpots: data.photoSpots || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      imageUrl: data.imageUrl || null,
    } as Mountain;
    this.mountains.push(newMountain);
    return newMountain;
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
