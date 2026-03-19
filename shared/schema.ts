import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Mountains table
export const mountains = pgTable("mountains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  elevation: integer("elevation").notNull(),
  category: text("category").notNull(),
  ticketPrice: integer("ticket_price"),
  difficulty: text("difficulty").notNull(),
  duration: text("duration").notNull(),
  description: text("description"),
  highlights: text("highlights").array(),
  culturalBackground: text("cultural_background"),
  bestMonths: jsonb("best_months"),
  seasonNotes: text("season_notes"),
  routes: jsonb("routes"),
  tips: jsonb("tips"),
  foods: jsonb("foods"),
  transport: jsonb("transport"),
  photoSpots: text("photo_spots").array(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  imageUrl: text("image_url"),
});

// Check-in logs
export const checkinLogs = pgTable("checkin_logs", {
  id: serial("id").primaryKey(),
  mountainId: integer("mountain_id").notNull(),
  userId: text("user_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull(),
  companions: text("companions").array(),
  weather: text("weather").array(),
  notes: text("notes"),
  rating: integer("rating"),
  routeName: text("route_name"),
  steps: jsonb("steps"),
  expenses: jsonb("expenses"),
  photos: text("photos").array(),
  createdAt: text("created_at"),
});

// Comments on check-in logs
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at"),
});

// Users (simple, no auth for MVP)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
});

// Insert schemas
export const insertMountainSchema = createInsertSchema(mountains).omit({ id: true });
export const insertCheckinLogSchema = createInsertSchema(checkinLogs).omit({ id: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Types
export type Mountain = typeof mountains.$inferSelect;
export type InsertMountain = z.infer<typeof insertMountainSchema>;
export type CheckinLog = typeof checkinLogs.$inferSelect;
export type InsertCheckinLog = z.infer<typeof insertCheckinLogSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
