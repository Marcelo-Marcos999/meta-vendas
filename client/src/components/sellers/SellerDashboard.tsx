import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/goalCalculations";
import {
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Seller } from "@/hooks/useSellers";

interface SellerDashboardProps {
  seller: Seller;
  sales: {
    id: string;
    date: string;
    dayOfWeek: string;
    salesValue: string;
    goal: string;
  }[];
}

export function SellerDashboard({ seller, sales }: SellerDashboardProps) {
  /* =====================================================
     GUARDA: SEM DADOS
  ====================================================== */
  if (!sales || sales.length === 0) {
    return (
      <Card className="stat-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum dado de vendas disponível para este vendedor.
        </CardContent>
      </Card>
    );
  }

  /* =====================================================
     NORMALIZAÇÃO DE DADOS (ANTI-NaN / ANTI-BUG)
  ====================================================== */
  const normalizedSales = sales.map((s) => ({
    date: format(parseISO(s.date), "dd/MM"),
    vendas: Number(s.salesValue) || 0,
    meta: Number(s.goal) || 0,
  }));

  /* =====================================================
     MÉTRICAS
  ====================================================== */
  const totalSales = normalizedSales.reduce(
    (sum, s) => sum + s.vendas,
    0
  );

  const totalGoal = Number(seller.goal) || 0;

  const progress =
    totalGoal > 0 ? (totalSales / totalGoal) * 100 : 0;

  const daysWithSales = normalizedSales.filter(
    (s) => s.vendas > 0
  ).length;

  const avgDailySales =
    daysWithSales > 0 ? totalSales / daysWithSales : 0;

  const remaining = Math.max(0, totalGoal - totalSales);

  const isGoalReached = totalSales >= totalGoal;

  /* =====================================================
     PROJEÇÃO
  ====================================================== */
  const totalDays = normalizedSales.length;

  const projection =
    daysWithSales > 0 ? avgDailySales * totalDays : 0;

  /* =====================================================
     FIX RECHARTS (RENDERIZAÇÃO)
  ====================================================== */
  const chartKey = normalizedSales.length;

  /* =====================================================
     UI
  ====================================================== */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================== CARDS ================== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Vendido
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSales)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isGoalReached ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={`text-xs ${
                  isGoalReached ? "text-success" : "text-destructive"
                }`}
              >
                {progress.toFixed(1)}% da meta
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Meta do Período
            </CardTitle>
            <Target className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalGoal)}
            </div>
            <Progress value={Math.min(progress, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Projeção de Faturamento
            </CardTitle>
            <Award className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(projection)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              baseada na média diária
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Falta para a Meta
            </CardTitle>
            <Calendar className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysWithSales} dias com vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ================== PROGRESSO ================== */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle>Progresso da Meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Meta</span>
            <span className={isGoalReached ? "text-success font-bold" : ""}>
              {progress.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-4" />
          {isGoalReached && (
            <p className="text-sm text-success font-semibold text-center">
              🎉 Meta atingida!
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================== GRÁFICOS ================== */}
      <div className="grid gap-4">
        {/* ---- Vendas por Dia ---- */}
        <Card className="stat-card">
          <CardHeader>
            <CardTitle>Vendas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={chartKey} width="100%" height={260}>
              <BarChart data={normalizedSales}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  domain={[0, "dataMax + 100"]}
                />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar
                  dataKey="vendas"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ---- Evolução Vendas x Meta ---- */}
        <Card className="stat-card">
          <CardHeader>
            <CardTitle>Evolução: Vendas x Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={chartKey + 1} width="100%" height={260}>
              <AreaChart data={normalizedSales}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  domain={[0, "dataMax + 100"]}
                />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                  name="Vendas"
                />
                <Area
                  type="monotone"
                  dataKey="meta"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="transparent"
                  name="Meta"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
