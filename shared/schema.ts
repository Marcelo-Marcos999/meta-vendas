import { pgTable, uuid, date, decimal, timestamp, text, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const goalsConfig = pgTable("goals_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  minGoal: decimal("min_goal", { precision: 12, scale: 2 }).notNull().default("0"),
  maxGoal: decimal("max_goal", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  userId: uuid("user_id"),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  isWorked: boolean("is_worked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  userId: uuid("user_id"),
});

export const dailySales = pgTable("daily_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  minGoal: decimal("min_goal", { precision: 12, scale: 2 }).notNull().default("0"),
  maxGoal: decimal("max_goal", { precision: 12, scale: 2 }).notNull().default("0"),
  salesValue: decimal("sales_value", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  userId: uuid("user_id"),
}, (table) => ({
  userDateUnique: unique("daily_sales_user_date_unique").on(table.userId, table.date),
}));

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sellers = pgTable("sellers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  goal: decimal("goal", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  userId: uuid("user_id"),
});

export const sellerDailySales = pgTable("seller_daily_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  goal: decimal("goal", { precision: 12, scale: 2 }).notNull().default("0"),
  salesValue: decimal("sales_value", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  sellerId: uuid("seller_id").notNull(),
  userId: uuid("user_id"),
}, (table) => ({
  sellerDateUnique: unique("seller_daily_sales_seller_date_unique").on(table.sellerId, table.date),
}));

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  maxUsers: decimal("max_users", { precision: 10, scale: 0 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGoalsConfigSchema = createInsertSchema(goalsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export const insertDailySaleSchema = createInsertSchema(dailySales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSellerDailySaleSchema = createInsertSchema(sellerDailySales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGoalsConfig = z.infer<typeof insertGoalsConfigSchema>;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type InsertDailySale = z.infer<typeof insertDailySaleSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type InsertSellerDailySale = z.infer<typeof insertSellerDailySaleSchema>;

export type GoalsConfig = typeof goalsConfig.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type DailySale = typeof dailySales.$inferSelect;
export type User = typeof users.$inferSelect;
export type Seller = typeof sellers.$inferSelect;
export type SellerDailySale = typeof sellerDailySales.$inferSelect;
export type AdminSettings = typeof adminSettings.$inferSelect;
