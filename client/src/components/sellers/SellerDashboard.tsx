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

  // ===== DESTAQUES DO PERÍODO =====
  const salesValues = normalizedSales.map((s) => s.vendas);

  const highestSale = salesValues.length > 0 ? Math.max(...salesValues) : 0;
  const lowestSale =
    salesValues.filter((v) => v > 0).length > 0
      ? Math.min(...salesValues.filter((v) => v > 0))
      : 0;

  // ===== PROJEÇÃO (MESMAS REGRAS DO DASHBOARD) =====
  const pessimistic = projection * 0.8;
  const realistic = projection;
  const optimistic = projection * 1.1;

  const projectionProgress =
    totalGoal > 0 ? (realistic / totalGoal) * 100 : 0;

  let projectionStatus = "Alto risco";
  let projectionColor = "text-destructive";

  if (projectionProgress >= 100) {
    projectionStatus = "Meta superada";
    projectionColor = "text-success";
  } else if (projectionProgress >= 80) {
    projectionStatus = "Dentro do esperado";
    projectionColor = "text-warning";
  }

  const avgStatus = (() => {
    if (daysWithSales === 0) {
      return {
        label: "Nenhuma venda registrada",
        color: "text-muted-foreground",
        iconColor: "text-muted-foreground",
      };
    }

    if (avgDailySales >= totalGoal / Math.max(daysWithSales, 1)) {
      return {
        label: "Bom ritmo de vendas",
        color: "text-success",
        iconColor: "text-success",
      };
    }

    return {
      label: "Abaixo do esperado",
      color: "text-warning",
      iconColor: "text-warning",
    };
  })();


  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================== CARDS ================== */}
      <div className="grid gap-4 md:grid-cols-3">
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
              Média de Vendas
            </CardTitle>
            <Calendar className={`h-5 w-5 ${avgStatus.iconColor}`} />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgDailySales)}
            </div>

            <p className={`text-xs mt-1 font-medium ${avgStatus.color}`}>
              {avgStatus.label}
            </p>

            {daysWithSales > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {daysWithSales} dias com vendas
              </p>
            )}
          </CardContent>
        </Card>


      </div>

      <Card className="stat-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Projeção de Faturamento</CardTitle>
          <TrendingUp className="h-5 w-5 text-success" />
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Cenário Realista</p>
            <p className="text-2xl font-bold">
              {formatCurrency(realistic)}
            </p>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pessimista</span>
            <span>{formatCurrency(pessimistic)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Otimista</span>
            <span className="text-success">{formatCurrency(optimistic)}</span>
          </div>

          <Progress value={Math.min(projectionProgress, 100)} className="h-2" />

          <p className={`text-xs font-semibold ${projectionColor}`}>
            {projectionProgress.toFixed(1)}% da meta ({projectionStatus})
          </p>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* ================== PROGRESSO ================== */}
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Progresso da Meta
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Linha título + % */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta</span>
              <span className="font-semibold text-success">
                {progress.toFixed(1)}%
              </span>
            </div>

            {/* Barra de progresso (estilo print) */}
            <Progress
              value={Math.min(progress, 100)}
              className="h-2 bg-muted"
            />

            {/* Separador */}
            <div className="pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Falta para atingir a meta
                </p>
                <p className="text-sm font-bold text-success">
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      
      <Card className="stat-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Destaques do Período</CardTitle>
          <DollarSign className="h-5 w-5 text-success" />
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Maior venda</p>
            <p className="text-lg font-bold text-success">
              {formatCurrency(highestSale)}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Menor venda</p>
            <p className="text-lg font-bold text-warning">
              {formatCurrency(lowestSale)}
            </p>
          </div>
        </CardContent>
      </Card>
        </div>
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
