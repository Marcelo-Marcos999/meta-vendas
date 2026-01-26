import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertGoalsConfigSchema, insertHolidaySchema, insertDailySaleSchema, insertUserSchema, insertSellerSchema } from "../shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Acesso não autorizado" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Usuário já existe" });
      }

      // Check user limit
      const settings = await storage.getAdminSettings();
      const maxUsers = settings ? parseInt(settings.maxUsers) : 0;
      if (maxUsers > 0) {
        const currentUserCount = await storage.getUserCount();
        if (currentUserCount >= maxUsers) {
          return res.status(403).json({ error: "Limite de usuários atingido. Entre em contato com o administrador." });
        }
      }

      const user = await storage.createUser({ username, password });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      let user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Auto-promote admin email if not already admin
      const ADMIN_EMAIL = "marcelomarcos.g9@gmail.com";
      if (user.username === ADMIN_EMAIL && !user.isAdmin) {
        user = await storage.setUserAdmin(user.id, true) || user;
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json(null);
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.json(null);
    }
    res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
  });

  app.get("/api/goals-config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getGoalsConfig(req.session.userId!);
      res.json(config || null);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configuração" });
    }
  });

  app.post("/api/goals-config", requireAuth, async (req, res) => {
    try {
      const data = insertGoalsConfigSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      
      await storage.deleteGoalsConfigByUserId(req.session.userId!);
      const config = await storage.saveGoalsConfig(data);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao salvar configuração" });
    }
  });

  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const holidaysList = await storage.getHolidays(req.session.userId!);
      res.json(holidaysList);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar feriados" });
    }
  });

  app.post("/api/holidays", requireAuth, async (req, res) => {
    try {
      const data = insertHolidaySchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      const holiday = await storage.addHoliday(data);
      res.json(holiday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao adicionar feriado" });
    }
  });

  app.patch("/api/holidays/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const holiday = await storage.updateHoliday(id, req.body);
      if (!holiday) {
        return res.status(404).json({ error: "Feriado não encontrado" });
      }
      res.json(holiday);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar feriado" });
    }
  });

  app.delete("/api/holidays/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHoliday(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover feriado" });
    }
  });

  app.get("/api/daily-sales", requireAuth, async (req, res) => {
    try {
      const sales = await storage.getDailySales(req.session.userId!);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar vendas" });
    }
  });

  app.post("/api/daily-sales", requireAuth, async (req, res) => {
    try {
      const data = insertDailySaleSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      const sale = await storage.upsertDailySale(data);
      res.json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao salvar venda" });
    }
  });

  app.patch("/api/daily-sales/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { salesValue } = req.body;
      const sale = await storage.updateSalesValue(id, salesValue);
      if (!sale) {
        return res.status(404).json({ error: "Venda não encontrada" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar venda" });
    }
  });

  app.patch("/api/daily-sales/:id/goals", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { minGoal, maxGoal } = req.body;
      const sale = await storage.updateDailySaleGoals(id, minGoal, maxGoal);
      if (!sale) {
        return res.status(404).json({ error: "Venda não encontrada" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar metas" });
    }
  });

  app.post("/api/daily-sales/generate", requireAuth, async (req, res) => {
    try {
      const { sales } = req.body;
      const salesWithUserId = sales.map((s: any) => ({
        ...s,
        userId: req.session.userId,
      }));
      const result = await storage.generateDailySales(req.session.userId!, salesWithUserId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar vendas" });
    }
  });

  app.post("/api/daily-sales/clear", requireAuth, async (req, res) => {
    try {
      await storage.clearSalesValues(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao limpar valores de vendas" });
    }
  });

  app.get("/api/sellers", requireAuth, async (req, res) => {
    try {
      const sellersList = await storage.getSellers(req.session.userId!);
      res.json(sellersList);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar vendedores" });
    }
  });

  app.post("/api/sellers", requireAuth, async (req, res) => {
    try {
      const data = insertSellerSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      const seller = await storage.createSeller(data);
      res.json(seller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar vendedor" });
    }
  });

  app.patch("/api/sellers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const seller = await storage.updateSeller(id, req.body);
      if (!seller) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }
      res.json(seller);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar vendedor" });
    }
  });

  app.delete("/api/sellers/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSeller(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover vendedor" });
    }
  });

  app.get("/api/sellers/:sellerId/sales", requireAuth, async (req, res) => {
    try {
      const { sellerId } = req.params;
      const sales = await storage.getSellerDailySales(sellerId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar vendas do vendedor" });
    }
  });

  app.post("/api/sellers/:sellerId/sales/generate", requireAuth, async (req, res) => {
    try {
      const { sellerId } = req.params;
      const { sales } = req.body;
      const salesWithIds = sales.map((s: any) => ({
        ...s,
        sellerId,
        userId: req.session.userId,
      }));
      const result = await storage.generateSellerDailySales(sellerId, req.session.userId!, salesWithIds);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar vendas do vendedor" });
    }
  });

  app.patch("/api/seller-sales/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { salesValue } = req.body;
      const sale = await storage.updateSellerSalesValue(id, salesValue);
      if (!sale) {
        return res.status(404).json({ error: "Venda não encontrada" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar venda" });
    }
  });

  app.patch("/api/seller-sales/:id/goal", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { goal } = req.body;
      const sale = await storage.updateSellerDailySaleGoal(id, goal);
      if (!sale) {
        return res.status(404).json({ error: "Venda não encontrada" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar meta" });
    }
  });

  app.post("/api/sellers/:sellerId/sales/clear", requireAuth, async (req, res) => {
    try {
      const { sellerId } = req.params;
      await storage.clearSellerSalesValues(sellerId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao limpar valores de vendas" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const usersList = await storage.getAllUsers();
      res.json(usersList.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (user.isAdmin) {
        return res.status(400).json({ error: "Não é possível deletar um administrador" });
      }
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar usuário" });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      const userCount = await storage.getUserCount();
      res.json({
        maxUsers: settings ? parseInt(settings.maxUsers) : 0,
        currentUserCount: userCount,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { maxUsers } = req.body;
      if (typeof maxUsers !== "number" || maxUsers < 0) {
        return res.status(400).json({ error: "Valor inválido para limite de usuários" });
      }
      const settings = await storage.saveAdminSettings(maxUsers);
      res.json({ maxUsers: parseInt(settings.maxUsers) });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar configurações" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
