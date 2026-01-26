import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDailySales, useGenerateDailySales, useClearDailySales } from "@/hooks/useDailySales";
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
  const [, setLocation] = useLocation();
  const { data: sales = [], isLoading } = useDailySales();
  const { data: config } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();
  const generateSales = useGenerateDailySales();
  const clearSales = useClearDailySales();
  const recalculateGoals = useRecalculateGoals();

  const [editingValues, setEditingValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const values: Record<string, number> = {};
    sales.forEach((s) => {
      values[s.id] = Number(s.salesValue);
    });
    setEditingValues(values);
  }, [sales]);

  const handleSave = (id: string, newValue: number) => {
    setEditingValues((prev) => ({ ...prev, [id]: newValue }));
    const sale = sales.find((s) => s.id === id);
    if (sale && config) {
      recalculateGoals.mutate({
        saleId: id,
        newSalesValue: newValue.toString(),
        allSales: sales,
        totalMinGoal: Number(config.minGoal),
        totalMaxGoal: Number(config.maxGoal),
      });
    }
  };

  const handleGenerateDays = () => {
    if (sales.length > 0) {
      if (confirm("Isso irá limpar todos os valores de vendas registrados. Deseja continuar?")) {
        clearSales.mutate();
      }
      return;
    }

    if (!config) {
      toast.error("Configure as metas primeiro!");
      return;
    }

    const workDays = generateWorkDays(config.startDate, config.endDate, holidays);
    const dailyGoals = calculateDailyGoals(workDays, Number(config.minGoal), Number(config.maxGoal));

    const salesData = dailyGoals.map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      minGoal: day.minGoal.toString(),
      maxGoal: day.maxGoal.toString(),
      salesValue: "0",
    }));

    generateSales.mutate(salesData);
  };

  const totalSales = useMemo(() => 
    sales.reduce((sum, s) => sum + Number(s.salesValue), 0), 
  [sales]);

  const totalMinGoal = Number(config?.minGoal || 0);
  const totalMaxGoal = Number(config?.maxGoal || 0);

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
            <Button onClick={() => setLocation("/configuracoes")} data-testid="button-go-settings">
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

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {sales.length} dias de trabalho registrados
          </p>
          <Button
            onClick={handleGenerateDays}
            disabled={generateSales.isPending}
            variant="outline"
            className="gap-2"
            data-testid="button-regenerate-days"
          >
            <RefreshCw className={`h-4 w-4 ${generateSales.isPending ? "animate-spin" : ""}`} />
            Regenerar Dias
          </Button>
        </div>

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
                <Button onClick={handleGenerateDays} data-testid="button-generate-days">Gerar Dias de Trabalho</Button>
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
                      const salesValue = editingValues[sale.id] ?? Number(sale.salesValue);
                      const minGoal = Number(sale.minGoal);
                      const maxGoal = Number(sale.maxGoal);
                      const reachedMin = salesValue >= minGoal;
                      const reachedMax = salesValue >= maxGoal;

                      return (
                        <TableRow key={sale.id} className="table-row-hover">
                          <TableCell className="font-medium">
                            {formatDate(sale.date)}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{sale.dayOfWeek}</span>
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
