import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";
import {
  goalsConfig,
  holidays,
  dailySales,
  users,
  sellers,
  sellerDailySales,
  adminSettings,
  type GoalsConfig,
  type Holiday,
  type DailySale,
  type User,
  type Seller,
  type SellerDailySale,
  type AdminSettings,
  type InsertGoalsConfig,
  type InsertHoliday,
  type InsertDailySale,
  type InsertUser,
  type InsertSeller,
  type InsertSellerDailySale,
} from "../shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  setUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined>;

  getGoalsConfig(userId: string): Promise<GoalsConfig | undefined>;
  saveGoalsConfig(config: InsertGoalsConfig): Promise<GoalsConfig>;
  deleteGoalsConfigByUserId(userId: string): Promise<void>;

  getHolidays(userId: string): Promise<Holiday[]>;
  addHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: string, updates: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: string): Promise<void>;

  getDailySales(userId: string): Promise<DailySale[]>;
  upsertDailySale(sale: InsertDailySale): Promise<DailySale>;
  updateSalesValue(id: string, salesValue: string): Promise<DailySale | undefined>;
  updateDailySaleGoals(id: string, minGoal: string, maxGoal: string): Promise<DailySale | undefined>;
  generateDailySales(userId: string, sales: InsertDailySale[]): Promise<DailySale[]>;
  deleteDailySalesByUserId(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async setUserAdmin(id: string, isAdmin: boolean): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getGoalsConfig(userId: string): Promise<GoalsConfig | undefined> {
    const [config] = await db
      .select()
      .from(goalsConfig)
      .where(eq(goalsConfig.userId, userId))
      .orderBy(desc(goalsConfig.createdAt))
      .limit(1);
    return config;
  }

  async saveGoalsConfig(config: InsertGoalsConfig): Promise<GoalsConfig> {
    const [newConfig] = await db.insert(goalsConfig).values(config).returning();
    return newConfig;
  }

  async deleteGoalsConfigByUserId(userId: string): Promise<void> {
    await db.delete(goalsConfig).where(eq(goalsConfig.userId, userId));
  }

  async getHolidays(userId: string): Promise<Holiday[]> {
    return db
      .select()
      .from(holidays)
      .where(eq(holidays.userId, userId))
      .orderBy(asc(holidays.date));
  }

  async addHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }

  async updateHoliday(id: string, updates: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [updated] = await db
      .update(holidays)
      .set(updates)
      .where(eq(holidays.id, id))
      .returning();
    return updated;
  }

  async deleteHoliday(id: string): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async getDailySales(userId: string): Promise<DailySale[]> {
    return db
      .select()
      .from(dailySales)
      .where(eq(dailySales.userId, userId))
      .orderBy(asc(dailySales.date));
  }

  async upsertDailySale(sale: InsertDailySale): Promise<DailySale> {
    const [result] = await db
      .insert(dailySales)
      .values(sale)
      .onConflictDoUpdate({
        target: [dailySales.userId, dailySales.date],
        set: {
          dayOfWeek: sale.dayOfWeek,
          minGoal: sale.minGoal,
          maxGoal: sale.maxGoal,
          salesValue: sale.salesValue,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async updateSalesValue(
    id: string,
    salesValue: string,
    customers?: number
  ): Promise<DailySale | undefined> {
    const [updated] = await db
      .update(dailySales)
      .set({
        salesValue,
        customers: customers ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(dailySales.id, id))
      .returning();

    return updated;
  }


  async updateDailySaleGoals(id: string, minGoal: string, maxGoal: string): Promise<DailySale | undefined> {
    const [updated] = await db
      .update(dailySales)
      .set({ minGoal, maxGoal, updatedAt: new Date() })
      .where(eq(dailySales.id, id))
      .returning();
    return updated;
  }

  async generateDailySales(userId: string, sales: InsertDailySale[]): Promise<DailySale[]> {
    const existingSales = await this.getDailySales(userId);
    const salesValueMap = new Map(existingSales.map(s => [s.date, s.salesValue]));

    await db.delete(dailySales).where(eq(dailySales.userId, userId));
    
    if (sales.length === 0) return [];
    
    const salesWithExistingValues = sales.map(s => ({
      ...s,
      salesValue: salesValueMap.get(s.date) || "0"
    }));

    const results = await db.insert(dailySales).values(salesWithExistingValues).returning();
    return results;
  }

  async clearSalesValues(userId: string): Promise<void> {
    await db
      .update(dailySales)
      .set({ salesValue: "0", updatedAt: new Date() })
      .where(eq(dailySales.userId, userId));
  }

  async deleteDailySalesByUserId(userId: string): Promise<void> {
    await db.delete(dailySales).where(eq(dailySales.userId, userId));
  }

  async getSellers(userId: string): Promise<Seller[]> {
    return db
      .select()
      .from(sellers)
      .where(eq(sellers.userId, userId))
      .orderBy(asc(sellers.name));
  }

  async getSeller(id: string): Promise<Seller | undefined> {
    const [seller] = await db.select().from(sellers).where(eq(sellers.id, id));
    return seller;
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const [newSeller] = await db.insert(sellers).values(seller).returning();
    return newSeller;
  }

  async updateSeller(id: string, updates: Partial<InsertSeller>): Promise<Seller | undefined> {
    const [updated] = await db
      .update(sellers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sellers.id, id))
      .returning();
    return updated;
  }

  async deleteSeller(id: string): Promise<void> {
    await db.delete(sellerDailySales).where(eq(sellerDailySales.sellerId, id));
    await db.delete(sellers).where(eq(sellers.id, id));
  }

  async getSellerDailySales(sellerId: string): Promise<SellerDailySale[]> {
    return db
      .select()
      .from(sellerDailySales)
      .where(eq(sellerDailySales.sellerId, sellerId))
      .orderBy(asc(sellerDailySales.date));
  }

  async generateSellerDailySales(sellerId: string, userId: string, sales: InsertSellerDailySale[]): Promise<SellerDailySale[]> {
    const existingSales = await this.getSellerDailySales(sellerId);
    const salesValueMap = new Map(existingSales.map(s => [s.date, s.salesValue]));

    await db.delete(sellerDailySales).where(eq(sellerDailySales.sellerId, sellerId));
    
    if (sales.length === 0) return [];
    
    const salesWithExistingValues = sales.map(s => ({
      ...s,
      salesValue: salesValueMap.get(s.date) || "0"
    }));

    const results = await db.insert(sellerDailySales).values(salesWithExistingValues).returning();
    return results;
  }

  async updateSellerSalesValue(id: string, salesValue: string): Promise<SellerDailySale | undefined> {
    const [updated] = await db
      .update(sellerDailySales)
      .set({ salesValue, updatedAt: new Date() })
      .where(eq(sellerDailySales.id, id))
      .returning();
    return updated;
  }

  async updateSellerDailySaleGoal(id: string, goal: string): Promise<SellerDailySale | undefined> {
    const [updated] = await db
      .update(sellerDailySales)
      .set({ goal, updatedAt: new Date() })
      .where(eq(sellerDailySales.id, id))
      .returning();
    return updated;
  }

  async clearSellerSalesValues(sellerId: string): Promise<void> {
    await db
      .update(sellerDailySales)
      .set({ salesValue: "0", updatedAt: new Date() })
      .where(eq(sellerDailySales.sellerId, sellerId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(sellerDailySales).where(eq(sellerDailySales.userId, id));
    await db.delete(sellers).where(eq(sellers.userId, id));
    await db.delete(dailySales).where(eq(dailySales.userId, id));
    await db.delete(holidays).where(eq(holidays.userId, id));
    await db.delete(goalsConfig).where(eq(goalsConfig.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getAdminSettings(): Promise<AdminSettings | undefined> {
    const [settings] = await db.select().from(adminSettings).limit(1);
    return settings;
  }

  async saveAdminSettings(maxUsers: number): Promise<AdminSettings> {
    const existing = await this.getAdminSettings();
    if (existing) {
      const [updated] = await db
        .update(adminSettings)
        .set({ maxUsers: maxUsers.toString(), updatedAt: new Date() })
        .where(eq(adminSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [newSettings] = await db
      .insert(adminSettings)
      .values({ maxUsers: maxUsers.toString() })
      .returning();
    return newSettings;
  }

  async getUserCount(): Promise<number> {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(u => !u.isAdmin).length;
  }
}

export const storage = new DatabaseStorage();
