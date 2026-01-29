import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDailySales } from "@/hooks/useDailySales";
import { useGoalsConfig } from "@/hooks/useGoalsConfig";
import { formatCurrency } from "@/lib/goalCalculations";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Calendar,
  Award,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: sales = [] } = useDailySales();
  const { data: config } = useGoalsConfig();

  const totalSales = sales.reduce(
    (sum, s) => sum + Number(s.salesValue),
    0
  );

  const totalMinGoal = Number(config?.minGoal || 0);
  const totalMaxGoal = Number(config?.maxGoal || 0);

  const progressMin =
    totalMinGoal > 0 ? (totalSales / totalMinGoal) * 100 : 0;

  const progressMax =
    totalMaxGoal > 0 ? (totalSales / totalMaxGoal) * 100 : 0;

  const daysWithSales = sales.filter(
    (s) => Number(s.salesValue) > 0
  ).length;

  const avgDailySales =
    daysWithSales > 0 ? totalSales / daysWithSales : 0;

  // ===== PROJEÇÃO DE FATURAMENTO =====
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  const dayOfMonth = today.getDate();
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);

  const projectedRevenue =
    totalSales + avgDailySales * remainingDays;

  const projectionVsMax =
    totalMaxGoal > 0
      ? (projectedRevenue / totalMaxGoal) * 100
      : 0;
  // ==================================

  const chartData = sales.map((s) => ({
    date: format(parseISO(s.date), "dd/MM"),
    vendas: Number(s.salesValue),
    metaMin: Number(s.minGoal),
    metaMax: Number(s.maxGoal),
  }));

  const isAboveMin = totalSales >= totalMinGoal;
  const isAboveMax = totalSales >= totalMaxGoal;

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* CARDS SUPERIORES */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Vendido
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(totalSales)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {isAboveMax ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={`text-xs ${
                    isAboveMax
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {progressMax.toFixed(1)}% da meta máxima
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meta Máxima
              </CardTitle>
              <Award className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(totalMaxGoal)}
              </div>
              <Progress
                value={Math.min(progressMax, 100)}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meta Mínima
              </CardTitle>
              <Target className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(totalMinGoal)}
              </div>
              <Progress
                value={Math.min(progressMin, 100)}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média Diária
              </CardTitle>
              <Calendar className="h-5 w-5 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(avgDailySales)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {daysWithSales} dias com vendas
              </p>
            </CardContent>
          </Card>

          {/* CARD DE PROJEÇÃO */}
          <Card className="stat-card border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projeção do Mês
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(projectedRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mantendo a média atual
              </p>
              {totalMaxGoal > 0 && (
                <p className="text-xs text-success mt-1">
                  {projectionVsMax.toFixed(1)}% da meta máxima
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="stat-card">
            <CardHeader>
              <CardTitle className="text-lg">Progresso das Metas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Meta Máxima</span>
                  <span className={`text-sm font-bold ${isAboveMax ? "text-success" : "text-muted-foreground"}`}>
                    {progressMax.toFixed(1)}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={Math.min(progressMax, 100)} className="h-4" />
                  {progressMax >= 100 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">Superada!</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Meta Mínima</span>
                  <span className={`text-sm font-bold ${isAboveMin ? "text-success" : "text-warning"}`}>
                    {progressMin.toFixed(1)}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={Math.min(progressMin, 100)} className="h-4" />
                  {progressMin >= 100 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">Atingida!</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Falta para máxima</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(Math.max(0, totalMaxGoal - totalSales))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Falta para mínima</p>
                    <p className="text-lg font-bold text-warning">
                      {formatCurrency(Math.max(0, totalMinGoal - totalSales))}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader>
              <CardTitle className="text-lg">Vendas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg">Evolução: Vendas vs Metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVendas)"
                    name="Vendas"
                  />
                  <Area
                    type="monotone"
                    dataKey="metaMin"
                    stroke="hsl(var(--warning))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    fill="transparent"
                    name="Meta Mínima"
                  />
                  <Area
                    type="monotone"
                    dataKey="metaMax"
                    stroke="hsl(var(--success))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    fill="transparent"
                    name="Meta Máxima"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
