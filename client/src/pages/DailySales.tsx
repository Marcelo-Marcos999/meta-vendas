import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useDailySales,
  useGenerateDailySales,
  useClearDailySales,
  useUpdateSalesValue,
} from "@/hooks/useDailySales";
import { useGoalsConfig } from "@/hooks/useGoalsConfig";
import { useHolidays } from "@/hooks/useHolidays";
import { formatCurrency, formatDate, generateWorkDays, calculateDailyGoals } from "@/lib/goalCalculations";
import { RefreshCw, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/sales/CurrencyInput";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";

export default function DailySales() {
  const [, setLocation] = useLocation();
  const { data: sales = [], isLoading } = useDailySales();
  const { data: config } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();

  const generateSales = useGenerateDailySales();
  const clearSales = useClearDailySales();
  const updateSalesValue = useUpdateSalesValue();

  const [editingValues, setEditingValues] = useState<Record<string, number>>({});
  const [editingCustomers, setEditingCustomers] = useState<Record<string, number>>({});

  useEffect(() => {
    const values: Record<string, number> = {};
    const customersMap: Record<string, number> = {};

    sales.forEach((s) => {
      values[s.id] = Number(s.salesValue);
      customersMap[s.id] = s.customers ?? 0;
    });

    setEditingValues(values);
    setEditingCustomers(customersMap);
  }, [sales]);

  const handleSave = (id: string, salesValue: number, customers: number) => {
    setEditingValues((prev) => ({ ...prev, [id]: salesValue }));
    setEditingCustomers((prev) => ({ ...prev, [id]: customers }));

    updateSalesValue.mutate({
      id,
      salesValue: salesValue.toString(),
      customers,
    });
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
    const dailyGoals = calculateDailyGoals(
      workDays,
      Number(config.minGoal),
      Number(config.maxGoal)
    );

    const salesData = dailyGoals.map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      minGoal: day.minGoal.toString(),
      maxGoal: day.maxGoal.toString(),
      salesValue: "0",
    }));

    generateSales.mutate(salesData);
  };

  const totalSales = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.salesValue), 0),
    [sales]
  );

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
            <Button onClick={() => setLocation("/configuracoes")}>
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const handleExportExcel = () => {
    if (!sales.length) return;

    const data = sales.map((sale) => {
      const customers = editingCustomers[sale.id] ?? 0;
      const salesValue = editingValues[sale.id] ?? Number(sale.salesValue);
      const minGoal = Number(sale.minGoal);
      const maxGoal = Number(sale.maxGoal);

      let status = "Pendente";
      if (salesValue >= maxGoal) status = "Superou";
      else if (salesValue >= minGoal) status = "Atingiu";
      else if (salesValue > 0) status = "Abaixo";

      return {
        Data: formatDate(sale.date),
        Dia: sale.dayOfWeek,
        Clientes: customers,
        "Meta Máxima": maxGoal,
        "Meta Mínima": minGoal,
        Vendas: salesValue,
        "Ticket Ideal": customers > 0 ? minGoal / customers : 0,
        "Ticket Real": customers > 0 ? salesValue / customers : 0,
        Status: status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas Diárias");
    XLSX.writeFile(workbook, "vendas-diarias.xlsx");
  };

  return (
    <MainLayout title="Vendas Diárias">
      <div className="space-y-6 animate-fade-in">
        {/* CARDS TOPO */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Vendido</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalSales)}
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Soma Metas Máximas</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(totalMaxGoal)}
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Soma Metas Mínimas</p>
              <p className="text-2xl font-bold text-warning">
                {formatCurrency(totalMinGoal)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AÇÕES */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {sales.length} dias de trabalho registrados
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              📊 Exportar Excel
            </Button>
            <Button
              onClick={handleGenerateDays}
              disabled={generateSales.isPending}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  generateSales.isPending ? "animate-spin" : ""
                }`}
              />
              Regenerar Dias
            </Button>
          </div>
        </div>

        {/* TABELA */}
        <Card className="stat-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Registro de Vendas</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Dia</TableHead>
                      <TableHead className="text-right">Meta Máx.</TableHead>
                      <TableHead className="text-right">Meta Mín.</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Ticket Ideal</TableHead>
                      <TableHead className="text-right">Ticket Real</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {sales.map((sale) => {
                      const salesValue =
                        editingValues[sale.id] ?? Number(sale.salesValue);
                      const customers = editingCustomers[sale.id] ?? 0;
                      const minGoal = Number(sale.minGoal);
                      const maxGoal = Number(sale.maxGoal);

                      const ticketIdeal =
                        customers > 0 ? minGoal / customers : 0;
                      const ticketReal =
                        customers > 0 ? salesValue / customers : 0;

                      return (
                        <TableRow key={sale.id} className="table-row-hover">
                          <TableCell>{formatDate(sale.date)}</TableCell>
                          <TableCell>{sale.dayOfWeek}</TableCell>

                          <TableCell className="text-right text-success font-medium">
                            {formatCurrency(maxGoal)}
                          </TableCell>
                          <TableCell className="text-right text-warning font-medium">
                            {formatCurrency(minGoal)}
                          </TableCell>

                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              value={customers}
                              onChange={(e) =>
                                setEditingCustomers((prev) => ({
                                  ...prev,
                                  [sale.id]: Number(e.target.value),
                                }))
                              }
                              onBlur={(e) =>
                                handleSave(
                                  sale.id,
                                  salesValue,
                                  Number(e.currentTarget.value)
                                )
                              }
                              className="w-24 ml-auto"
                            />
                          </TableCell>

                          <TableCell className="text-right">
                            <CurrencyInput
                              value={salesValue}
                              onChange={(value) =>
                                handleSave(sale.id, value, customers)
                              }
                              className="w-32 ml-auto"
                            />
                          </TableCell>

                          <TableCell className="text-right text-muted-foreground">
                            {customers > 0
                              ? formatCurrency(ticketIdeal)
                              : "-"}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {customers > 0
                              ? formatCurrency(ticketReal)
                              : "-"}
                          </TableCell>

                          <TableCell className="text-center">
                            {salesValue === 0 && customers === 0 ? (
                              <Badge variant="secondary">Pendente</Badge>
                            ) : salesValue >= maxGoal ? (
                              <Badge className="bg-success text-success-foreground">
                                Superou
                              </Badge>
                            ) : salesValue >= minGoal ? (
                              <Badge className="bg-primary text-primary-foreground">
                                Atingiu
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Abaixo</Badge>
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
