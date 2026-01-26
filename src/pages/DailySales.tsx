import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDailySales, useGenerateDailySales } from "@/hooks/useDailySales";
import { useGoalsConfig } from "@/hooks/useGoalsConfig";
import { useHolidays } from "@/hooks/useHolidays";
import { useRecalculateGoals } from "@/hooks/useRecalculateGoals";
import { formatCurrency, formatDate, generateWorkDays, calculateDailyGoals } from "@/lib/goalCalculations";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/sales/CurrencyInput";

export default function DailySales() {
  const { data: sales = [], isLoading } = useDailySales();
  const { data: config } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();
  const generateSales = useGenerateDailySales();
  const recalculateGoals = useRecalculateGoals();

  const [editingValues, setEditingValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const values: Record<string, number> = {};
    sales.forEach((s) => {
      values[s.id] = Number(s.sales_value);
    });
    setEditingValues(values);
  }, [sales]);

  const handleSave = (id: string, newValue: number) => {
    setEditingValues((prev) => ({ ...prev, [id]: newValue }));
    const sale = sales.find((s) => s.id === id);
    if (sale && config) {
      recalculateGoals.mutate({
        saleId: id,
        newSalesValue: newValue,
        allSales: sales,
        totalMinGoal: config.min_goal,
        totalMaxGoal: config.max_goal,
      });
    }
  };

  const handleGenerateDays = () => {
    if (!config) {
      toast.error("Configure as metas primeiro!");
      return;
    }

    const workDays = generateWorkDays(config.start_date, config.end_date, holidays);
    const dailyGoals = calculateDailyGoals(workDays, config.min_goal, config.max_goal);

    const salesData = dailyGoals.map((day) => ({
      date: day.date,
      day_of_week: day.dayOfWeek,
      min_goal: day.minGoal,
      max_goal: day.maxGoal,
      sales_value: 0,
    }));

    generateSales.mutate(salesData);
  };

  const totalSales = useMemo(() => 
    sales.reduce((sum, s) => sum + Number(s.sales_value), 0), 
  [sales]);

  // Usar valores da configuração (meta do mês) - a soma das metas diárias deveria ser igual
  // mas o recálculo dinâmico pode causar pequenas diferenças de arredondamento
  const totalMinGoal = config?.min_goal || 0;
  const totalMaxGoal = config?.max_goal || 0;

  if (!config) {
    return (
      <MainLayout title="Vendas Diárias">
        <Card className="stat-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuração Necessária</h3>
            <p className="text-muted-foreground text-center mb-4">
              Você precisa configurar as metas e o período de trabalho antes de registrar as vendas.
            </p>
            <Button onClick={() => window.location.href = "/configuracoes"}>
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Vendas Diárias">
      <div className="space-y-6 animate-fade-in">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Vendido</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalSales)}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Soma Metas Máximas</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalMaxGoal)}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Soma Metas Mínimas</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalMinGoal)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {sales.length} dias de trabalho registrados
          </p>
          <Button
            onClick={handleGenerateDays}
            disabled={generateSales.isPending}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generateSales.isPending ? "animate-spin" : ""}`} />
            Regenerar Dias
          </Button>
        </div>

        {/* Sales Table */}
        <Card className="stat-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Registro de Vendas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : sales.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Nenhum dia de trabalho gerado.</p>
                <Button onClick={handleGenerateDays}>Gerar Dias de Trabalho</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-24">Data</TableHead>
                      <TableHead className="w-20">Dia</TableHead>
                      <TableHead className="text-right">Meta Máx.</TableHead>
                      <TableHead className="text-right">Meta Mín.</TableHead>
                      <TableHead className="text-right w-40">Vendas</TableHead>
                      <TableHead className="text-center w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => {
                      const salesValue = editingValues[sale.id] ?? Number(sale.sales_value);
                      const minGoal = Number(sale.min_goal);
                      const maxGoal = Number(sale.max_goal);
                      const reachedMin = salesValue >= minGoal;
                      const reachedMax = salesValue >= maxGoal;

                      return (
                        <TableRow key={sale.id} className="table-row-hover">
                          <TableCell className="font-medium">
                            {formatDate(sale.date)}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{sale.day_of_week}</span>
                          </TableCell>
                          <TableCell className="text-right text-success font-medium">
                            {formatCurrency(maxGoal)}
                          </TableCell>
                          <TableCell className="text-right text-warning font-medium">
                            {formatCurrency(minGoal)}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyInput
                              value={editingValues[sale.id] ?? 0}
                              onChange={(value) => handleSave(sale.id, value)}
                              className="input-sales w-32 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {salesValue === 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                Pendente
                              </Badge>
                            ) : reachedMax ? (
                              <Badge className="bg-success text-success-foreground text-xs">
                                Superou
                              </Badge>
                            ) : reachedMin ? (
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                Atingiu
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Abaixo
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
